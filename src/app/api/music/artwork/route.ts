import { requireMusicAccount, musicRedis, validMusicBlobPath } from "@/lib/music/music-cloud";
import { isMusicVisualSettings, MUSIC_ARTWORK_MAX_TRACKS } from "@/lib/music/music-cloud-contracts";
import { associateMusicArtworkTracks, MusicArtworkAssociationError } from "@/lib/music/music-artwork-association";

export const dynamic = "force-dynamic";
const idPattern = /^[a-f0-9-]{36}$/i;
const settingsKey = (namespace: string) => `varynth:music:visual-settings:v1:${namespace}`;

export async function POST(request: Request) {
  const account = await requireMusicAccount();
  if (!account) return Response.json({ error: "Autenticação necessária." }, { status: 401 });
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "Origem inválida." }, { status: 403 });
  try {
    const body = await request.json() as { trackIds?: unknown; trackId?: unknown; kind?: unknown; assetId?: unknown; visualSettings?: unknown };
    if (body.visualSettings !== undefined) {
      if (typeof body.trackId !== "string" || !idPattern.test(body.trackId) || !isMusicVisualSettings(body.visualSettings)) {
        return Response.json({ error: "Configuração visual inválida." }, { status: 400 });
      }
      const raw = await musicRedis(["HGET", account.redisKey, body.trackId]);
      if (typeof raw !== "string") return Response.json({ error: "Uma faixa não pertence à sua biblioteca." }, { status: 404 });
      const track = JSON.parse(raw) as { blobPathname?: string };
      if (!track.blobPathname || !validMusicBlobPath(track.blobPathname, account.namespace)) return Response.json({ error: "Faixa inválida." }, { status: 404 });
      await musicRedis(["HSET", settingsKey(account.namespace), body.trackId, JSON.stringify(body.visualSettings)]);
      return Response.json({ ok: true }, { headers: { "cache-control": "private, no-store" } });
    }
    if (!Array.isArray(body.trackIds) || body.trackIds.length < 1 || body.trackIds.length > MUSIC_ARTWORK_MAX_TRACKS || !body.trackIds.every((id) => typeof id === "string" && idPattern.test(id))
      || !["cover", "background"].includes(String(body.kind))) return Response.json({ error: "Faixas ou tipo de imagem inválidos." }, { status: 400 });
    const trackIds = Array.from(new Set(body.trackIds as string[]));
    if (trackIds.length > MUSIC_ARTWORK_MAX_TRACKS) return Response.json({ error: `A seleção pode conter até ${MUSIC_ARTWORK_MAX_TRACKS.toLocaleString("pt-BR")} faixas.` }, { status: 400 });
    const storedTracks = await musicRedis(["HMGET", account.redisKey, ...trackIds]);
    if (!Array.isArray(storedTracks) || storedTracks.length !== trackIds.length) return Response.json({ error: "Não foi possível validar as faixas selecionadas." }, { status: 503 });
    for (const raw of storedTracks) {
      if (typeof raw !== "string") return Response.json({ error: "Uma das faixas não pertence à sua biblioteca." }, { status: 404 });
      const track = JSON.parse(raw) as { blobPathname?: string };
      if (!track.blobPathname || !validMusicBlobPath(track.blobPathname, account.namespace)) return Response.json({ error: "Faixa inválida." }, { status: 404 });
    }
    if (body.assetId !== undefined && typeof body.assetId !== "string") return Response.json({ error: "Imagem inválida." }, { status: 400 });
    await associateMusicArtworkTracks(musicRedis, {
      namespace: account.namespace,
      libraryKey: account.redisKey,
      kind: body.kind as "cover" | "background",
      trackIds,
      assetId: typeof body.assetId === "string" ? body.assetId : null,
    });
    return Response.json({ ok: true }, { headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    if (error instanceof MusicArtworkAssociationError) return Response.json({ error: error.message }, { status: error.status });
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível remover a imagem." }, { status: 503 });
  }
}
