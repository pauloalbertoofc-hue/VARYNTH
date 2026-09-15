import { requireSession } from "@/lib/auth/require-session";
import type { VaultItem } from "@/lib/types";
import { migrateVaultItem } from "@/lib/vault/taxonomy";

export const runtime = "nodejs";

const LEGACY_ITEMS_KEY = "varynth:vault:items:v1";
const LEGACY_TOMBSTONES_KEY = "varynth:vault:tombstones:v1";
const OWNER_LEGACY_TITLES = new Set(["diário de anne frank", "as 48 leis do poder", "a arte da sedução"]);

function redisConfig() {
  return {
    url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_KV_REST_API_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN,
  };
}

async function redis(command: string[]) {
  const { url, token } = redisConfig();
  if (!url || !token) throw new Error("Banco de sincronização não configurado.");
  const response = await fetch(url, { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify(command), cache: "no-store" });
  if (!response.ok) throw new Error("Banco de sincronização indisponível.");
  const data = await response.json() as { result?: unknown; error?: string };
  if (data.error) throw new Error("Banco de sincronização recusou a operação.");
  return data.result;
}

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const raw = await redis(["GET", key]);
  return typeof raw === "string" ? JSON.parse(raw) as T : fallback;
}

function accountScope(session: Awaited<ReturnType<typeof requireSession>>) {
  const user = session?.user as { id?: string; email?: string; role?: string } | undefined;
  const id = String(user?.id || user?.email || "local-owner").trim().toLowerCase().replace(/[^a-z0-9]/g, "_");
  return { id, isOwner: user?.role === "owner" };
}

function keys(scope: string) {
  return { items: `varynth:vault:items:v2:${scope}`, tombstones: `varynth:vault:tombstones:v2:${scope}` };
}

async function library(session: Awaited<ReturnType<typeof requireSession>>) {
  const scope = accountScope(session);
  const accountKeys = keys(scope.id);
  const currentRaw = await redis(["GET", accountKeys.items]);
  const currentTombstones = await readJson<Record<string, string>>(accountKeys.tombstones, {});
  if (typeof currentRaw === "string") return { items: (JSON.parse(currentRaw) as VaultItem[]).map(migrateVaultItem), tombstones: currentTombstones, keys: accountKeys };

  const legacy = await readJson<VaultItem[]>(LEGACY_ITEMS_KEY, []);
  // The former global library belongs to the owner. A member receives only records
  // that are not known owner records, preserving independently uploaded material.
  const migrated = scope.isOwner ? legacy : legacy.filter((item) => !OWNER_LEGACY_TITLES.has(item.title.trim().toLocaleLowerCase()));
  await Promise.all([
    redis(["SET", accountKeys.items, JSON.stringify(migrated)]),
    redis(["SET", accountKeys.tombstones, JSON.stringify(scope.isOwner ? await readJson<Record<string, string>>(LEGACY_TOMBSTONES_KEY, {}) : {})]),
  ]);
  return { items: migrated.map(migrateVaultItem), tombstones: currentTombstones, keys: accountKeys };
}

export async function GET() {
  const session = await requireSession(); if (!session) return Response.json({ error: "Autenticação necessária." }, { status: 401 });
  try { return Response.json({ items: (await library(session)).items }); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Falha na sincronização." }, { status: 503 }); }
}

export async function POST(request: Request) {
  const session = await requireSession(); if (!session) return Response.json({ error: "Autenticação necessária." }, { status: 401 });
  try {
    const incoming = ((await request.json() as { items?: VaultItem[] }).items || []).map(migrateVaultItem);
    const { items: stored, tombstones, keys: accountKeys } = await library(session);
    const merged = new Map(stored.map((item) => [item.id, item]));
    for (const item of incoming) {
      const deletedAt = tombstones[item.id];
      if (deletedAt && deletedAt >= item.updatedAt) continue;
      const current = merged.get(item.id);
      if (!current || item.updatedAt > current.updatedAt) merged.set(item.id, item);
    }
    const items = [...merged.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    await redis(["SET", accountKeys.items, JSON.stringify(items)]);
    return Response.json({ items });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Falha na sincronização." }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  const session = await requireSession(); if (!session) return Response.json({ error: "Autenticação necessária." }, { status: 401 });
  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return Response.json({ error: "Livro não informado." }, { status: 400 });
    const { items, tombstones, keys: accountKeys } = await library(session);
    tombstones[id] = new Date().toISOString();
    await Promise.all([redis(["SET", accountKeys.items, JSON.stringify(items.filter((item) => item.id !== id))]), redis(["SET", accountKeys.tombstones, JSON.stringify(tombstones)])]);
    return Response.json({ deleted: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Falha na sincronização." }, { status: 503 });
  }
}
