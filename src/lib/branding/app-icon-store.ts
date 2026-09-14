import "server-only";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const REMOTE_KEY = "varynth:platform:branding:app-icon:v1";
const LOCAL_DIR = path.join(process.cwd(), ".varynth-data");
const LOCAL_FILE = path.join(LOCAL_DIR, "app-icon.json");
const DEFAULT_FILE = path.join(process.cwd(), "public", "icons", "varynth-512.png");

interface StoredAppIcon {
  data: string;
  updatedAt: string;
  updatedBy: string;
}

export interface ResolvedAppIcon {
  bytes: Buffer;
  updatedAt: string | null;
  updatedBy: string | null;
  isDefault: boolean;
}

function redisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN;
  return { url, token, configured: Boolean(url && token) };
}

async function redis(command: string[]) {
  const { url, token } = redisConfig();
  if (!url || !token) throw new Error("Banco persistente não configurado.");
  const response = await fetch(url, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Banco persistente indisponível (${response.status}).`);
  const result = await response.json() as { result?: unknown; error?: string };
  if (result.error) throw new Error("Banco persistente recusou a operação.");
  return result.result;
}

function parseRecord(value: unknown): StoredAppIcon | null {
  if (typeof value !== "string") return null;
  try {
    const parsed = JSON.parse(value) as Partial<StoredAppIcon>;
    return typeof parsed.data === "string" && typeof parsed.updatedAt === "string" && typeof parsed.updatedBy === "string"
      ? parsed as StoredAppIcon
      : null;
  } catch {
    return null;
  }
}

async function readRecord(): Promise<StoredAppIcon | null> {
  if (redisConfig().configured) return parseRecord(await redis(["GET", REMOTE_KEY]));
  if (process.env.VERCEL) return null;
  try {
    return parseRecord(await readFile(LOCAL_FILE, "utf8"));
  } catch {
    return null;
  }
}

export async function getAppIcon(): Promise<ResolvedAppIcon> {
  const stored = await readRecord();
  if (stored) {
    return { bytes: Buffer.from(stored.data, "base64"), updatedAt: stored.updatedAt, updatedBy: stored.updatedBy, isDefault: false };
  }
  return { bytes: await readFile(DEFAULT_FILE), updatedAt: null, updatedBy: null, isDefault: true };
}

export async function saveAppIcon(bytes: Buffer, updatedBy: string) {
  const record: StoredAppIcon = { data: bytes.toString("base64"), updatedAt: new Date().toISOString(), updatedBy };
  if (redisConfig().configured) {
    await redis(["SET", REMOTE_KEY, JSON.stringify(record)]);
  } else {
    if (process.env.VERCEL) throw new Error("Configure o banco persistente antes de alterar o ícone global.");
    await mkdir(LOCAL_DIR, { recursive: true });
    await writeFile(LOCAL_FILE, JSON.stringify(record), { encoding: "utf8", mode: 0o600 });
  }
  return { updatedAt: record.updatedAt, updatedBy: record.updatedBy };
}

export async function resetAppIcon() {
  if (redisConfig().configured) {
    await redis(["DEL", REMOTE_KEY]);
  } else {
    if (process.env.VERCEL) throw new Error("Configure o banco persistente antes de alterar o ícone global.");
    try { await unlink(LOCAL_FILE); } catch { /* already using the default icon */ }
  }
}
