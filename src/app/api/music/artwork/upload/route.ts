import { head } from "@vercel/blob";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { requireMusicAccount, musicRedis, validMusicArtworkBlobPath, validMusicBlobPath } from "@/lib/music/music-cloud";
import { musicRedisConfigured } from "@/lib/music/music-cloud";
import { isMusicArtworkUploadPayload } from "@/lib/music/music-cloud-contracts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const idPattern = /^[a-f0-9-]{36}$/i;
const kinds = new Set(["cover", "background"]);
const assetsKey = (namespace: string) => `varynth:music:artwork-assets:v1:${namespace}`;

type Payload = import("@/lib/music/music-cloud-contracts").MusicArtworkUploadPayload;

export async function POST(request: Request) {
  try {
    const body = await request.json() as HandleUploadBody;
    const completed = body.type === "blob.upload-completed";
    const account = completed ? null : await requireMusicAccount();
    if (!completed && !account) return Response.json({ error: "Entre na sua conta para salvar a arte." }, { status: 401 });
    if (!completed && request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "Origem inválida." }, { status: 403 });
    if (!process.env.BLOB_READ_WRITE_TOKEN || !musicRedisConfigured()) return Response.json({ error: "O armazenamento privado de artes não está conectado." }, { status: 503 });
    const result = await handleUpload({
      token: process.env.BLOB_READ_WRITE_TOKEN, request, body,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        if (!account) throw new Error("Autenticação necessária.");
        let payload: unknown;
        try { payload = clientPayload ? JSON.parse(clientPayload) : null; } catch { payload = null; }
        if (!isMusicArtworkUploadPayload(payload) || !validMusicArtworkBlobPath(pathname, account.namespace)
          || pathname !== `music/${account.namespace}/artwork/${payload.assetId}.${payload.mimeType === "image/jpeg" ? "jpg" : payload.mimeType.split("/")[1].replace("svg+xml", "svg")}`) {
          throw new Error("Os dados da arte não correspondem ao arquivo enviado.");
        }
        const selectedTracks = await musicRedis(["HMGET", account.redisKey, ...payload.trackIds]);
        if (!Array.isArray(selectedTracks) || selectedTracks.length !== payload.trackIds.length) throw new Error("Não foi possível validar as faixas selecionadas.");
        for (const raw of selectedTracks) {
          if (typeof raw !== "string") throw new Error("Uma das faixas selecionadas não pertence à sua biblioteca.");
          const track = JSON.parse(raw) as { blobPathname?: string };
          if (!track.blobPathname || !validMusicBlobPath(track.blobPathname, account.namespace)) throw new Error("Uma das faixas selecionadas não pertence à sua biblioteca.");
        }
        return { allowedContentTypes: [payload.mimeType], maximumSizeInBytes: 20 * 1024 * 1024, addRandomSuffix: false,
          tokenPayload: JSON.stringify({ namespace: account.namespace, redisKey: account.redisKey, payload, pathname }) };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        if (!tokenPayload) throw new Error("Metadados de propriedade ausentes.");
        const claims = JSON.parse(tokenPayload) as { namespace?: string; redisKey?: string; payload?: unknown; pathname?: string };
        if (!claims.namespace || !/^[a-f0-9]{32}$/i.test(claims.namespace) || claims.redisKey !== `varynth:music:library:v1:${claims.namespace}`
          || !isMusicArtworkUploadPayload(claims.payload) || claims.pathname !== blob.pathname || !validMusicArtworkBlobPath(blob.pathname, claims.namespace)) throw new Error("Não foi possível validar a propriedade da arte.");
        const payload = claims.payload;
        const stored = await head(blob.pathname);
        if (stored.size !== payload.sizeBytes || stored.contentType !== payload.mimeType) throw new Error("A arte armazenada diverge dos metadados validados.");
        const asset = { pathname: blob.pathname, mimeType: stored.contentType, sizeBytes: stored.size, assetId: payload.assetId };
        await musicRedis(["HSET", assetsKey(claims.namespace), payload.assetId, JSON.stringify(asset)]);
      },
    });
    return Response.json(result, { headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Falha ao salvar a arte." }, { status: 400 });
  }
}
