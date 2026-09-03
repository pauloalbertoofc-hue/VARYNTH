import "server-only";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const LOCAL_DIR = path.join(process.cwd(), ".varynth-data");
const LOCAL_FILE = path.join(LOCAL_DIR, "google-workspace.tokens.enc");
const LEGACY_FILE = path.join(LOCAL_DIR, "google-calendar.tokens.enc");
const REMOTE_KEY = "varynth:oauth:google-workspace:v1";

function redisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN;
  return { url, token, configured: Boolean(url && token) };
}

export function tokenStoreStatus() {
  const remote = redisConfig();
  const hosted = Boolean(process.env.VERCEL);
  return {
    driver: remote.configured ? "upstash-redis" as const : "local-encrypted-file" as const,
    configured: remote.configured || !hosted,
    persistent: remote.configured,
    missing: hosted && !remote.configured ? ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"] : [],
  };
}

async function redis(command: string[]) {
  const config = redisConfig();
  if (!config.url || !config.token) throw new Error("Cofre persistente não configurado.");
  const response = await fetch(config.url, {
    method: "POST",
    headers: { authorization: `Bearer ${config.token}`, "content-type": "application/json" },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Cofre persistente indisponível (${response.status}).`);
  const data = await response.json() as { result?: unknown; error?: string };
  if (data.error) throw new Error("Cofre persistente recusou a operação.");
  return data.result;
}

export async function saveEncryptedGoogleTokens(value: string) {
  if (redisConfig().configured) { await redis(["SET", REMOTE_KEY, value]); return; }
  if (process.env.VERCEL) throw new Error("Cofre persistente obrigatório na Vercel.");
  await mkdir(LOCAL_DIR, { recursive: true });
  await writeFile(LOCAL_FILE, value, { encoding: "utf8", mode: 0o600 });
}

export async function loadEncryptedGoogleTokens(): Promise<string | undefined> {
  if (redisConfig().configured) {
    const result = await redis(["GET", REMOTE_KEY]);
    return typeof result === "string" && result ? result : undefined;
  }
  if (process.env.VERCEL) return undefined;
  try { return await readFile(LOCAL_FILE, "utf8"); }
  catch {
    try { return await readFile(LEGACY_FILE, "utf8"); }
    catch { return undefined; }
  }
}

export async function deleteEncryptedGoogleTokens() {
  if (redisConfig().configured) { await redis(["DEL", REMOTE_KEY]); return; }
  if (process.env.VERCEL) return;
  await Promise.all([LOCAL_FILE, LEGACY_FILE].map(async (file) => { try { await unlink(file); } catch { /* ausente */ } }));
}
