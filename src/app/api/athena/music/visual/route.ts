import "server-only";

import { requireMusicAccount, musicRedis } from "@/lib/music/music-cloud";
import { deleteMusicVisualCredential, loadMusicVisualCredential, musicVisualCredentialStatus, saveMusicVisualCredential } from "@/lib/music/music-visual-credentials";
import { generateMusicArtworkPair } from "@/lib/music/music-visual-ai-core";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

function privateJson(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "cache-control": "private, no-store" } });
}

function sameOrigin(request: Request) {
  return request.headers.get("origin") === new URL(request.url).origin;
}

async function accountOrResponse() {
  const account = await requireMusicAccount();
  return account ? { account } : { response: privateJson({ error: "Entre na sua conta para conectar Athena ao visual do Music." }, 401) };
}

export async function GET(request: Request) {
  const { account, response } = await accountOrResponse();
  if (!account) return response;
  try {
    const status = await musicVisualCredentialStatus(account.namespace);
    return privateJson({ ...status, model: process.env.MUSIC_IMAGE_MODEL || "gpt-image-2" });
  } catch {
    return privateJson({ error: "Não foi possível consultar a conexão do gerador visual." }, 503);
  }
}

export async function PUT(request: Request) {
  if (!sameOrigin(request)) return privateJson({ error: "Origem inválida." }, 403);
  const { account, response } = await accountOrResponse();
  if (!account) return response;
  try {
    const body = await request.json() as { apiKey?: unknown };
    const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
    if (!/^sk-[A-Za-z0-9_-]{20,500}$/.test(apiKey)) return privateJson({ error: "A chave informada não tem o formato esperado." }, 400);
    await saveMusicVisualCredential(account.namespace, apiKey);
    return privateJson({ configured: true, source: "account" });
  } catch (error) {
    return privateJson({ error: error instanceof Error ? error.message : "Não foi possível salvar a conexão protegida." }, 503);
  }
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return privateJson({ error: "Origem inválida." }, 403);
  const { account, response } = await accountOrResponse();
  if (!account) return response;
  try {
    await deleteMusicVisualCredential(account.namespace);
    return privateJson({ configured: Boolean(process.env.OPENAI_API_KEY), source: process.env.OPENAI_API_KEY ? "platform" : "none" });
  } catch (error) {
    return privateJson({ error: error instanceof Error ? error.message : "Não foi possível remover a conexão protegida." }, 503);
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return privateJson({ error: "Origem inválida." }, 403);
  const { account, response } = await accountOrResponse();
  if (!account) return response;
  try {
    const body = await request.json() as { prompt?: unknown; title?: unknown; artist?: unknown };
    const text = (value: unknown, max: number) => typeof value === "string" && value.trim().length > 0 && value.length <= max ? value.trim() : undefined;
    const title = text(body.title, 240);
    const artist = text(body.artist, 240);
    const prompt = typeof body.prompt === "string" && body.prompt.length <= 600 ? body.prompt.trim() : undefined;
    if (!title || !artist || prompt === undefined) return privateJson({ error: "Faixa ou descrição visual inválida." }, 400);
    const apiKey = await loadMusicVisualCredential(account.namespace);
    if (!apiKey) return privateJson({ error: "Conecte uma chave de API de imagens nas configurações desta seção. Sem ela, use a composição local gratuita." }, 503);

    const hour = new Date().toISOString().slice(0, 13).replace(/[-T:]/g, "");
    const rateKey = `varynth:music:visual-ai-rate:v1:${account.namespace}:${hour}`;
    const count = Number(await musicRedis(["EVAL", "local count = redis.call('INCR', KEYS[1]); if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end; return count", "1", rateKey, "3600"]));
    if (count > 6) return privateJson({ error: "Você atingiu o limite de seis criações por hora. Tente novamente mais tarde." }, 429);

    const images = await generateMusicArtworkPair({ prompt, title, artist }, apiKey);
    return privateJson({
      coverDataUrl: images.cover.dataUrl,
      backgroundDataUrl: images.background.dataUrl,
      description: "A Athena criou uma capa quadrada e um fundo panorâmico originais para esta faixa. Efeitos de movimento e redução de movimento continuam controláveis no Music.",
      palette: [],
    });
  } catch (error) {
    return privateJson({ error: error instanceof Error ? error.message : "Não foi possível criar as imagens." }, 502);
  }
}
