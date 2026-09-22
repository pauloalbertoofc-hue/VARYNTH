import { requireMusicAccount, musicRedis, validMusicArtworkBlobPath, validMusicBlobPath } from "@/lib/music/music-cloud";

export const dynamic = "force-dynamic";
const idPattern = /^[a-f0-9-]{36}$/i;
const key = (namespace: string) => `varynth:music:artwork:v1:${namespace}`;

export async function POST(request: Request) {
  const account = await requireMusicAccount();
  if (!account) return Response.json({ error: "Autenticação necessária." }, { status: 401 });
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "Origem inválida." }, { status: 403 });
  try {
    const body = await request.json() as { trackIds?: unknown; kind?: unknown; assetId?: unknown };
    if (!Array.isArray(body.trackIds) || body.trackIds.length < 1 || body.trackIds.length > 100 || !body.trackIds.every((id) => typeof id === "string" && idPattern.test(id))
      || !["cover", "background"].includes(String(body.kind))) return Response.json({ error: "Faixas ou tipo de imagem inválidos." }, { status: 400 });
    for (const trackId of body.trackIds as string[]) {
      const raw = await musicRedis(["HGET", account.redisKey, trackId]);
      if (typeof raw !== "string") return Response.json({ error: "Uma das faixas não pertence à sua biblioteca." }, { status: 404 });
      const track = JSON.parse(raw) as { blobPathname?: string };
      if (!track.blobPathname || !validMusicBlobPath(track.blobPathname, account.namespace)) return Response.json({ error: "Faixa inválida." }, { status: 404 });
    }
    if (body.assetId !== undefined) {
      if (typeof body.assetId !== "string" || !idPattern.test(body.assetId)) return Response.json({ error: "Imagem inválida." }, { status: 400 });
      const rawAsset = await musicRedis(["HGET", `varynth:music:artwork-assets:v1:${account.namespace}`, body.assetId]);
      if (typeof rawAsset !== "string") return Response.json({ error: "Imagem não encontrada nesta conta." }, { status: 404 });
      const asset = JSON.parse(rawAsset) as { pathname?: string };
      if (!asset.pathname || !validMusicArtworkBlobPath(asset.pathname, account.namespace)) return Response.json({ error: "Imagem não encontrada nesta conta." }, { status: 404 });
      for (const trackId of body.trackIds as string[]) await musicRedis(["HSET", key(account.namespace), `${trackId}:${body.kind}`, body.assetId]);
    } else {
      for (const trackId of body.trackIds as string[]) await musicRedis(["HDEL", key(account.namespace), `${trackId}:${body.kind}`]);
    }
    return Response.json({ ok: true }, { headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível remover a imagem." }, { status: 503 });
  }
}
