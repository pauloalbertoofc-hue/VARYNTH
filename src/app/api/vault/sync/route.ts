import { requireSession } from "@/lib/auth/require-session";
import type { VaultItem } from "@/lib/types";
import { migrateVaultItem } from "@/lib/vault/taxonomy";

export const runtime = "nodejs";

const ITEMS_KEY = "varynth:vault:items:v1";
const TOMBSTONES_KEY = "varynth:vault:tombstones:v1";

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

async function library() {
  const [items, tombstones] = await Promise.all([readJson<VaultItem[]>(ITEMS_KEY, []), readJson<Record<string, string>>(TOMBSTONES_KEY, {})]);
  return { items: items.map(migrateVaultItem), tombstones };
}

export async function GET() {
  if (!await requireSession()) return Response.json({ error: "Autenticação necessária." }, { status: 401 });
  try { return Response.json({ items: (await library()).items }); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Falha na sincronização." }, { status: 503 }); }
}

export async function POST(request: Request) {
  if (!await requireSession()) return Response.json({ error: "Autenticação necessária." }, { status: 401 });
  try {
    const incoming = ((await request.json() as { items?: VaultItem[] }).items || []).map(migrateVaultItem);
    const { items: stored, tombstones } = await library();
    const merged = new Map(stored.map((item) => [item.id, item]));
    for (const item of incoming) {
      const deletedAt = tombstones[item.id];
      if (deletedAt && deletedAt >= item.updatedAt) continue;
      const current = merged.get(item.id);
      if (!current || item.updatedAt > current.updatedAt) merged.set(item.id, item);
    }
    const items = [...merged.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    await redis(["SET", ITEMS_KEY, JSON.stringify(items)]);
    return Response.json({ items });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Falha na sincronização." }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  if (!await requireSession()) return Response.json({ error: "Autenticação necessária." }, { status: 401 });
  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return Response.json({ error: "Livro não informado." }, { status: 400 });
    const { items, tombstones } = await library();
    tombstones[id] = new Date().toISOString();
    await Promise.all([redis(["SET", ITEMS_KEY, JSON.stringify(items.filter((item) => item.id !== id))]), redis(["SET", TOMBSTONES_KEY, JSON.stringify(tombstones)])]);
    return Response.json({ deleted: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Falha na sincronização." }, { status: 503 });
  }
}
