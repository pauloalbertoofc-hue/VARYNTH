// Server-side persistence adapter: import only from Route Handlers/server code.
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { domainRegistry, mergeDomainDefinitions, DEFAULT_DOMAIN_DEFINITIONS, type DomainDefinition } from "./domain-registry";

const REGISTRY_KEY = "varynth:knowledge:domain-registry:v1";
const LOCAL_FILE = path.join(process.cwd(), ".varynth-data", "domain-registry.json");

export interface StoredDomainRegistry { version: 1; revision: number; domains: DomainDefinition[]; }
export type DomainRegistryPersistenceMode = "REDIS" | "LOCAL_FILE" | "UNAVAILABLE";
export interface DomainRegistryStoreOptions { mode?: DomainRegistryPersistenceMode; }
let localWriteQueue: Promise<void> = Promise.resolve();

function redisConfig() {
  return {
    url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_KV_REST_API_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN,
  };
}

export function domainRegistryPersistenceMode(): DomainRegistryPersistenceMode {
  const { url, token } = redisConfig();
  return url && token ? "REDIS" : process.env.VERCEL ? "UNAVAILABLE" : "LOCAL_FILE";
}

async function redis(command: string[]): Promise<unknown> {
  const { url, token } = redisConfig();
  if (!url || !token) throw new Error("[DOMAIN_REGISTRY_PERSISTENCE_UNAVAILABLE] Redis indisponível.");
  const response = await fetch(url, { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify(command), cache: "no-store" });
  if (!response.ok) throw new Error("[DOMAIN_REGISTRY_STORE_UNAVAILABLE] Não foi possível acessar o registro de domínios.");
  const result = await response.json() as { result?: unknown; error?: string };
  if (result.error) throw new Error("[DOMAIN_REGISTRY_STORE_UNAVAILABLE] Redis recusou a operação.");
  return result.result;
}

function parseRecord(raw: unknown): StoredDomainRegistry | null {
  if (raw === null || raw === undefined) return null;
  const value = typeof raw === "string" ? JSON.parse(raw) as unknown : raw;
  if (!value || typeof value !== "object") throw new Error("[DOMAIN_REGISTRY_STORE_INVALID] Registro de domínios inválido.");
  const record = value as Partial<StoredDomainRegistry>;
  if (record.version !== 1 || !Number.isInteger(record.revision) || (record.revision as number) < 1 || !Array.isArray(record.domains) || record.domains.length === 0) throw new Error("[DOMAIN_REGISTRY_STORE_INVALID] Registro de domínios inválido.");
  return record as StoredDomainRegistry;
}

export async function readPersistedDomainRegistry(options: DomainRegistryStoreOptions = {}): Promise<StoredDomainRegistry | null> {
  const mode = options.mode || domainRegistryPersistenceMode();
  if (mode === "REDIS") return parseRecord(await redis(["GET", REGISTRY_KEY]));
  if (mode === "UNAVAILABLE") return null;
  try { return parseRecord(await readFile(LOCAL_FILE, "utf8")); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export async function hydrateDomainRegistryFromPersistence(): Promise<StoredDomainRegistry | null> {
  const stored = await readPersistedDomainRegistry();
  if (stored) domainRegistry.replaceDomains(mergeDomainDefinitions(DEFAULT_DOMAIN_DEFINITIONS, stored.domains));
  return stored;
}

export async function savePersistedDomainRegistry(domains: DomainDefinition[], expectedRevision: number, options: DomainRegistryStoreOptions = {}): Promise<number> {
  const mode = options.mode || domainRegistryPersistenceMode();
  if (mode === "UNAVAILABLE") throw new Error("[DOMAIN_REGISTRY_PERSISTENCE_UNAVAILABLE] Configure Redis persistente antes de alterar ownership na Vercel.");
  const commit = async (): Promise<number> => {
    const current = await readPersistedDomainRegistry(options);
    const revision = current?.revision || 0;
    if (revision !== expectedRevision) throw new Error("[DOMAIN_REGISTRY_REVISION_CONFLICT] O Domain Registry mudou em outra sessão; atualize e tente novamente.");
    const next: StoredDomainRegistry = { version: 1, revision: revision + 1, domains };
    const serialized = JSON.stringify(next);
    if (mode === "REDIS") await redis(["SET", REGISTRY_KEY, serialized]);
    else {
      await mkdir(path.dirname(LOCAL_FILE), { recursive: true });
      const temporary = `${LOCAL_FILE}.${process.pid}.${Date.now()}.tmp`;
      await writeFile(temporary, serialized, { encoding: "utf8", mode: 0o600 });
      await rename(temporary, LOCAL_FILE);
    }
    return next.revision;
  };

  if (mode === "LOCAL_FILE") {
    const previous = localWriteQueue;
    let release!: () => void;
    localWriteQueue = new Promise<void>((resolve) => { release = resolve; });
    await previous;
    try { return await commit(); } finally { release(); }
  }

  const lockKey = `${REGISTRY_KEY}:write-lock`;
  const token = randomUUID();
  let acquired = false;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (await redis(["SET", lockKey, token, "NX", "PX", "30000"]) === "OK") { acquired = true; break; }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  if (!acquired) throw new Error("[DOMAIN_REGISTRY_WRITE_BUSY] Outra atualização está em andamento; tente novamente.");
  try { return await commit(); }
  finally {
    await redis(["EVAL", "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end", "1", lockKey, token]).catch(() => undefined);
  }
}
