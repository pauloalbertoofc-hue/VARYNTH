import { requireSession } from "@/lib/auth/require-session";
import { isAthenaConversationPayload, mergeAthenaConversationPayload, type AthenaConversationPayload } from "@/lib/athena/conversation/conversation-sync";

export const runtime = "nodejs";

function redisConfig() { return { url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_KV_REST_API_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN }; }
async function redis(command: string[]) {
  const { url, token } = redisConfig();
  if (!url || !token) throw new Error("Armazenamento de conversas não configurado.");
  const response = await fetch(url, { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify(command), cache: "no-store" });
  if (!response.ok) throw new Error("Armazenamento de conversas indisponível.");
  const data = await response.json() as { result?: unknown; error?: string };
  if (data.error) throw new Error("Armazenamento de conversas recusou a operação.");
  return data.result;
}
function isSameOrigin(request: Request) { const origin = request.headers.get("origin"); return !origin || origin === new URL(request.url).origin; }
async function ownerKey() {
  if (process.env.VERCEL && process.env.VARYNTH_AUTH_ENABLED !== "true") return undefined;
  const session = await requireSession();
  const user = session?.user as { id?: string; email?: string } | undefined;
  const identity = user?.id || user?.email;
  return identity ? identity.replace(/[^a-zA-Z0-9_.@-]/g, "_").slice(0, 180) : undefined;
}
function emptyPayload(): AthenaConversationPayload { return { schemaVersion: 1, conversations: [], tombstones: {} }; }
async function readPayload(key: string) {
  const raw = await redis(["GET", key]);
  if (typeof raw !== "string") return emptyPayload();
  try { const parsed: unknown = JSON.parse(raw); return isAthenaConversationPayload(parsed) ? parsed : emptyPayload(); }
  catch { return emptyPayload(); }
}
export async function GET() {
  const owner = await ownerKey();
  if (!owner) return Response.json({ error: "Entre na sua conta para sincronizar as conversas entre dispositivos." }, { status: 401 });
  try { return Response.json({ payload: await readPayload(`varynth:athena:conversations:v1:${owner}`) }); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Falha na sincronização." }, { status: 503 }); }
}
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return Response.json({ error: "Origem não autorizada." }, { status: 403 });
  const owner = await ownerKey();
  if (!owner) return Response.json({ error: "Entre na sua conta para sincronizar as conversas entre dispositivos." }, { status: 401 });
  try {
    const body = await request.json() as { payload?: unknown };
    if (!isAthenaConversationPayload(body.payload)) return Response.json({ error: "Formato de conversa inválido." }, { status: 400 });
    const key = `varynth:athena:conversations:v1:${owner}`;
    const payload = mergeAthenaConversationPayload(await readPayload(key), body.payload);
    if (JSON.stringify(payload).length > 3_000_000) return Response.json({ error: "O histórico excede o limite de sincronização." }, { status: 413 });
    await redis(["SET", key, JSON.stringify(payload)]);
    return Response.json({ payload });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Falha na sincronização." }, { status: 503 }); }
}
