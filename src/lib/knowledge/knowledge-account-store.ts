// Server-side account-scoped persistence; import only from Route Handlers.
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { knowledgeAccessLogRepository, knowledgeRelationshipRepository, knowledgeRepository } from "../persistence/repositories";
import type { KnowledgeAccessLog, KnowledgeItem, KnowledgeRelationship } from "./contracts";
import { invalidateKnowledgeQueryCache } from "./service";

const REDIS_PREFIX = "varynth:knowledge:account:v1:";
const LOCAL_DIRECTORY = path.join(process.cwd(), ".varynth-data", "knowledge-accounts");

export interface StoredKnowledgeAccount {
  version: 1;
  revision: number;
  items: KnowledgeItem[];
  accessLogs: KnowledgeAccessLog[];
  relationships: KnowledgeRelationship[];
}

export type KnowledgeAccountPersistenceMode = "REDIS" | "LOCAL_FILE" | "UNAVAILABLE";
export interface KnowledgeAccountStoreOptions {
  mode?: KnowledgeAccountPersistenceMode;
  /** Lease tuning is useful for bounded deployments and deterministic concurrency tests. */
  redisLockLeaseMs?: number;
  redisLockRenewalIntervalMs?: number;
}
const DEFAULT_LOCK_LEASE_MS = 30_000;
const DEFAULT_LOCK_RENEWAL_INTERVAL_MS = 10_000;
let processQueue: Promise<void> = Promise.resolve();

function redisConfig() {
  return {
    url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_KV_REST_API_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN,
  };
}

export function knowledgeAccountPersistenceMode(): KnowledgeAccountPersistenceMode {
  const { url, token } = redisConfig();
  return url && token ? "REDIS" : process.env.VERCEL ? "UNAVAILABLE" : "LOCAL_FILE";
}

export function knowledgeAccountId(user: { id?: string | null; email?: string | null }) {
  const id = user.id?.trim() || user.email?.trim().toLocaleLowerCase();
  if (!id) throw new Error("[KNOWLEDGE_ACCOUNT_INVALID] Conta autenticada sem identificador.");
  return id;
}

function accountHash(accountId: string) {
  const normalized = accountId.trim();
  if (!normalized) throw new Error("[KNOWLEDGE_ACCOUNT_INVALID] Conta autenticada sem identificador.");
  return createHash("sha256").update(normalized).digest("hex");
}

function parseSnapshot(raw: unknown): StoredKnowledgeAccount {
  if (raw === null || raw === undefined) return { version: 1, revision: 0, items: [], accessLogs: [], relationships: [] };
  const value = typeof raw === "string" ? JSON.parse(raw) as unknown : raw;
  if (!value || typeof value !== "object") throw new Error("[KNOWLEDGE_STORE_INVALID] Registro de Knowledge inválido.");
  const snapshot = value as Partial<StoredKnowledgeAccount>;
  if (snapshot.version !== 1 || !Number.isInteger(snapshot.revision) || (snapshot.revision as number) < 1 || !Array.isArray(snapshot.items) || !Array.isArray(snapshot.accessLogs) || !Array.isArray(snapshot.relationships)) throw new Error("[KNOWLEDGE_STORE_INVALID] Registro de Knowledge inválido.");
  if (snapshot.items.some((item) => !item || typeof item.id !== "string" || !item.id)) throw new Error("[KNOWLEDGE_STORE_INVALID] Item de Knowledge inválido.");
  return snapshot as StoredKnowledgeAccount;
}

async function redis(command: string[]): Promise<unknown> {
  const { url, token } = redisConfig();
  if (!url || !token) throw new Error("[KNOWLEDGE_PERSISTENCE_UNAVAILABLE] Redis não configurado.");
  const response = await fetch(url, { method: "POST", headers: { authorization: "Bearer " + token, "content-type": "application/json" }, body: JSON.stringify(command), cache: "no-store" });
  if (!response.ok) throw new Error("[KNOWLEDGE_STORE_UNAVAILABLE] Persistência de Knowledge indisponível.");
  const result = await response.json() as { result?: unknown; error?: string };
  if (result.error) throw new Error("[KNOWLEDGE_STORE_UNAVAILABLE] Redis recusou a operação de Knowledge.");
  return result.result;
}

async function readSnapshot(accountKey: string, options: KnowledgeAccountStoreOptions): Promise<StoredKnowledgeAccount> {
  const mode = options.mode || knowledgeAccountPersistenceMode();
  if (mode === "REDIS") return parseSnapshot(await redis(["GET", REDIS_PREFIX + accountKey]));
  if (mode === "UNAVAILABLE") throw new Error("[KNOWLEDGE_PERSISTENCE_UNAVAILABLE] Configure Redis persistente para servir Knowledge na Vercel.");
  try { return parseSnapshot(await readFile(path.join(LOCAL_DIRECTORY, accountKey + ".json"), "utf8")); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return parseSnapshot(null);
    throw error;
  }
}

async function writeSnapshot(accountKey: string, snapshot: StoredKnowledgeAccount, options: KnowledgeAccountStoreOptions, lock?: { key: string; token: string }): Promise<void> {
  const mode = options.mode || knowledgeAccountPersistenceMode();
  const serialized = JSON.stringify(snapshot);
  if (mode === "REDIS") {
    if (!lock) throw new Error("[KNOWLEDGE_WRITE_LOCK_MISSING] Snapshot Redis exige lease ativo.");
    const result = await redis([
      "EVAL",
      "if redis.call('get', KEYS[2]) == ARGV[1] then redis.call('set', KEYS[1], ARGV[2]); return 1 else return 0 end",
      "2", REDIS_PREFIX + accountKey, lock.key, lock.token, serialized,
    ]);
    if (Number(result) !== 1) throw new Error("[KNOWLEDGE_WRITE_LOCK_LOST] Snapshot recusado porque o lease expirou ou mudou de owner.");
    return;
  }
  if (mode === "UNAVAILABLE") throw new Error("[KNOWLEDGE_PERSISTENCE_UNAVAILABLE] Configure Redis persistente para servir Knowledge na Vercel.");
  await mkdir(LOCAL_DIRECTORY, { recursive: true });
  const target = path.join(LOCAL_DIRECTORY, accountKey + ".json");
  const temporary = target + "." + process.pid + "." + randomUUID() + ".tmp";
  await writeFile(temporary, serialized, { encoding: "utf8", mode: 0o600 });
  await rename(temporary, target);
}

async function acquireRedisLock(accountKey: string, leaseMs: number): Promise<{ key: string; token: string }> {
  const key = REDIS_PREFIX + accountKey + ":write-lock";
  const token = randomUUID();
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (await redis(["SET", key, token, "NX", "PX", String(leaseMs)]) === "OK") return { key, token };
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error("[KNOWLEDGE_WRITE_BUSY] Outra requisição está atualizando Knowledge; tente novamente.");
}

function startRedisLockHeartbeat(lock: { key: string; token: string }, leaseMs: number, intervalMs: number) {
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending: Promise<void> | undefined;
  let failure: Error | undefined;
  const renew = async () => {
    try {
      const result = await redis([
        "EVAL",
        "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('pexpire', KEYS[1], ARGV[2]) else return 0 end",
        "1", lock.key, lock.token, String(leaseMs),
      ]);
      if (Number(result) !== 1) failure = new Error("[KNOWLEDGE_WRITE_LOCK_LOST] Lease Redis não pertence mais a esta operação.");
    } catch (error) {
      failure = error instanceof Error ? error : new Error("[KNOWLEDGE_WRITE_LOCK_LOST] Não foi possível renovar o lease Redis.");
    }
  };
  const schedule = () => {
    if (stopped || failure) return;
    timer = setTimeout(() => {
      pending = renew().finally(() => {
        pending = undefined;
        schedule();
      });
    }, intervalMs);
    timer.unref?.();
  };
  schedule();
  return {
    async assertOwned() {
      if (pending) await pending;
      if (failure) throw new Error("[KNOWLEDGE_WRITE_LOCK_LOST] Operação abortada para evitar sobrescrita após perda do lease.", { cause: failure });
    },
    async stop() {
      stopped = true;
      if (timer) clearTimeout(timer);
      if (pending) await pending;
    },
  };
}

async function restore(snapshot: StoredKnowledgeAccount) {
  await Promise.all([knowledgeRepository.clear(), knowledgeAccessLogRepository.clear(), knowledgeRelationshipRepository.clear()]);
  await Promise.all([
    snapshot.items.length ? knowledgeRepository.saveBatch(snapshot.items) : Promise.resolve(),
    snapshot.accessLogs.length ? knowledgeAccessLogRepository.saveBatch(snapshot.accessLogs) : Promise.resolve(),
    snapshot.relationships.length ? knowledgeRelationshipRepository.saveBatch(snapshot.relationships) : Promise.resolve(),
  ]);
  invalidateKnowledgeQueryCache();
}

async function capture(revision: number): Promise<StoredKnowledgeAccount> {
  const [items, accessLogs, relationships] = await Promise.all([
    knowledgeRepository.getAll(), knowledgeAccessLogRepository.getAll(), knowledgeRelationshipRepository.getAll(),
  ]);
  return { version: 1, revision: revision + 1, items, accessLogs, relationships };
}

/** Isolate the legacy repositories to one signed-in account for the duration of an API operation. */
export async function withKnowledgeAccount<T>(accountId: string, operation: () => Promise<T>, options: KnowledgeAccountStoreOptions = {}): Promise<T> {
  const mode = options.mode || knowledgeAccountPersistenceMode();
  if (mode === "UNAVAILABLE") throw new Error("[KNOWLEDGE_PERSISTENCE_UNAVAILABLE] Configure Redis persistente para servir Knowledge na Vercel.");
  const accountKey = accountHash(accountId);
  const previous = processQueue;
  let release!: () => void;
  processQueue = new Promise<void>((resolve) => { release = resolve; });
  await previous;

  let lock: { key: string; token: string } | undefined;
  let heartbeat: ReturnType<typeof startRedisLockHeartbeat> | undefined;
  try {
    if (mode === "REDIS") {
      const leaseMs = options.redisLockLeaseMs ?? DEFAULT_LOCK_LEASE_MS;
      const renewalIntervalMs = options.redisLockRenewalIntervalMs ?? DEFAULT_LOCK_RENEWAL_INTERVAL_MS;
      if (!Number.isSafeInteger(leaseMs) || !Number.isSafeInteger(renewalIntervalMs) || leaseMs < 3 || renewalIntervalMs < 1 || renewalIntervalMs >= leaseMs / 2) throw new Error("[KNOWLEDGE_LOCK_CONFIG_INVALID] Renewal deve ocorrer antes da metade de um lease válido.");
      lock = await acquireRedisLock(accountKey, leaseMs);
      heartbeat = startRedisLockHeartbeat(lock, leaseMs, renewalIntervalMs);
    }
    const current = await readSnapshot(accountKey, { mode });
    await restore(current);
    const result = await operation();
    await heartbeat?.assertOwned();
    await writeSnapshot(accountKey, await capture(current.revision), { mode }, lock);
    return result;
  } finally {
    await heartbeat?.stop();
    await Promise.all([knowledgeRepository.clear(), knowledgeAccessLogRepository.clear(), knowledgeRelationshipRepository.clear()]);
    invalidateKnowledgeQueryCache();
    if (lock) await redis(["EVAL", "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end", "1", lock.key, lock.token]).catch(() => undefined);
    release();
  }
}
