import { head } from "@vercel/blob";
import { requireMusicAccount, musicRedis, musicRedisConfigured, validMusicBlobPath } from "@/lib/music/music-cloud";
import type { MusicTrack } from "@/lib/music/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AccountTrack = MusicTrack & { blobPathname: string; storageMode: "account" };

function accountRequiredResponse() {
  return Response.json({ error: "Entre na sua conta para usar a biblioteca sincronizada." }, { status: 401 });
}

export async function GET() {
  const account = await requireMusicAccount();
  if (!account) return accountRequiredResponse();
  if (!musicRedisConfigured() || !process.env.BLOB_READ_WRITE_TOKEN) {
    return Response.json({ error: "O armazenamento privado da biblioteca musical não está configurado." }, { status: 503 });
  }
  try {
    const raw = await musicRedis(["HGETALL", account.redisKey]);
    const entries = Array.isArray(raw)
      ? Array.from({ length: Math.floor(raw.length / 2) }, (_, index) => [raw[index * 2], raw[index * 2 + 1]])
      : Object.entries((raw || {}) as Record<string, string>);
    const tracks = entries.flatMap(([, value]) => {
      try {
        const track = JSON.parse(String(value)) as AccountTrack;
        return validMusicBlobPath(track.blobPathname, account.namespace) ? [{ ...track, storageMode: "account" as const, blobPathname: undefined }] : [];
      } catch { return []; }
    }).sort((a, b) => a.name.localeCompare(b.name));
    return Response.json({ tracks, uploadPrefix: `music/${account.namespace}/tracks`, storageMode: "account" }, { headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível carregar sua biblioteca." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const account = await requireMusicAccount();
  if (!account) return accountRequiredResponse();
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "Origem inválida." }, { status: 403 });
  if (!musicRedisConfigured() || !process.env.BLOB_READ_WRITE_TOKEN) {
    return Response.json({ error: "O armazenamento privado da biblioteca musical não está configurado." }, { status: 503 });
  }
  try {
    const body = await request.json() as { track?: MusicTrack; pathname?: string };
    const track = body.track;
    const pathname = body.pathname || "";
    if (!track || !/^[a-f0-9-]{36}$/i.test(track.id) || !validMusicBlobPath(pathname, account.namespace)
      || pathname.split("/").at(-1)?.split(".")[0]?.toLowerCase() !== track.id.toLowerCase()
      || typeof track.name !== "string" || track.name.length === 0 || track.name.length > 240
      || typeof track.artist !== "string" || track.artist.length > 240
      || !Number.isFinite(track.sizeBytes) || track.sizeBytes <= 0 || track.sizeBytes > 500 * 1024 * 1024
      || !Number.isFinite(track.durationMs) || track.durationMs < 0) {
      return Response.json({ error: "Os dados da faixa não correspondem a um upload válido desta conta." }, { status: 400 });
    }
    const blob = await head(pathname);
    if (blob.size !== track.sizeBytes || !blob.contentType.toLowerCase().startsWith("audio/")) {
      return Response.json({ error: "O áudio armazenado não corresponde aos metadados enviados." }, { status: 400 });
    }
    const saved: AccountTrack = {
      id: track.id, identityId: track.identityId || track.id, name: track.name, artist: track.artist.slice(0, 240), album: track.album?.slice(0, 240),
      durationMs: Math.round(track.durationMs), mimeType: blob.contentType, sizeBytes: blob.size,
      metadataSource: track.metadataSource, metadataConfidence: track.metadataConfidence, originalFilename: track.originalFilename,
      addedAt: track.addedAt, blobPathname: pathname, storageMode: "account",
    };
    await musicRedis(["HSET", account.redisKey, saved.id, JSON.stringify(saved)]);
    return Response.json({ track: { ...saved, blobPathname: undefined }, storageMode: "account" }, { status: 201, headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível salvar a faixa na sua conta." }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  const account = await requireMusicAccount();
  if (!account) return accountRequiredResponse();
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "Origem inválida." }, { status: 403 });
  try {
    const body = await request.json() as { trackId?: string; name?: string; artist?: string };
    if (!body.trackId || !/^[a-f0-9-]{36}$/i.test(body.trackId) || typeof body.name !== "string" || !body.name.trim() || body.name.length > 240 || typeof body.artist !== "string" || body.artist.length > 240) {
      return Response.json({ error: "Título ou artista inválido." }, { status: 400 });
    }
    const raw = await musicRedis(["HGET", account.redisKey, body.trackId]);
    if (typeof raw !== "string") return Response.json({ error: "Faixa não encontrada nesta conta." }, { status: 404 });
    const current = JSON.parse(raw) as AccountTrack;
    if (!validMusicBlobPath(current.blobPathname, account.namespace)) return Response.json({ error: "Faixa não encontrada nesta conta." }, { status: 404 });
    const updated: AccountTrack = { ...current, name: body.name.trim(), artist: body.artist.trim(), metadataSource: "manual", metadataConfidence: 1 };
    await musicRedis(["HSET", account.redisKey, updated.id, JSON.stringify(updated)]);
    return Response.json({ track: { ...updated, blobPathname: undefined }, storageMode: "account" }, { headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível atualizar os metadados." }, { status: 503 });
  }
}
