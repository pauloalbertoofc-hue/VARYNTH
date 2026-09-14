import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { head } from "@vercel/blob";
import { requireMusicAccount, validMusicBlobPath } from "@/lib/music/music-cloud";
import { musicRedis } from "@/lib/music/music-cloud";
import type { MusicTrack } from "@/lib/music/types";

type UploadMetadata = Pick<MusicTrack, "id" | "name" | "artist" | "album" | "durationMs" | "mimeType" | "sizeBytes" | "addedAt">;

function validMetadata(value: unknown): value is UploadMetadata {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<UploadMetadata>;
  return typeof item.id === "string" && /^[a-f0-9-]{36}$/i.test(item.id)
    && typeof item.name === "string" && item.name.length > 0 && item.name.length <= 240
    && typeof item.artist === "string" && item.artist.length <= 240
    && Number.isFinite(item.durationMs) && Number(item.durationMs) >= 0
    && Number.isFinite(item.sizeBytes) && Number(item.sizeBytes) > 0 && Number(item.sizeBytes) <= 500 * 1024 * 1024
    && typeof item.mimeType === "string" && typeof item.addedAt === "string";
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as HandleUploadBody;
    const isCompletion = body.type === "blob.upload-completed";
    const account = isCompletion ? null : await requireMusicAccount();
    if (!isCompletion && !account) return Response.json({ error: "Entre na sua conta para enviar músicas." }, { status: 401 });
    if (!isCompletion && request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "Origem inválida." }, { status: 403 });
    if (!process.env.BLOB_READ_WRITE_TOKEN) return Response.json({ error: "O armazenamento privado de áudio ainda não está conectado." }, { status: 503 });
    const result = await handleUpload({
      token: process.env.BLOB_READ_WRITE_TOKEN,
      request,
      body,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        if (!account || !validMusicBlobPath(pathname, account.namespace)) throw new Error("O caminho do upload não pertence à sua biblioteca.");
        let metadata: unknown;
        try { metadata = clientPayload ? JSON.parse(clientPayload) : null; } catch { metadata = null; }
        if (!validMetadata(metadata) || pathname.split("/").at(-1)?.split(".")[0]?.toLowerCase() !== metadata.id.toLowerCase()) {
          throw new Error("Os metadados da faixa não correspondem ao upload.");
        }
        return {
          allowedContentTypes: ["audio/*", "application/octet-stream"],
          maximumSizeInBytes: 500 * 1024 * 1024,
          addRandomSuffix: false,
          tokenPayload: JSON.stringify({ owner: account.namespace, redisKey: account.redisKey, metadata, pathname }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        if (!tokenPayload) throw new Error("Faltam os dados autenticados da conta.");
        const claims = JSON.parse(tokenPayload) as { owner?: string; redisKey?: string; metadata?: unknown; pathname?: string };
        if (typeof claims.owner !== "string" || typeof claims.redisKey !== "string" || claims.redisKey !== `varynth:music:library:v1:${claims.owner}`
          || !validMetadata(claims.metadata) || claims.pathname !== blob.pathname || !validMusicBlobPath(blob.pathname, claims.owner)) {
          throw new Error("Não foi possível validar a propriedade desta faixa.");
        }
        const metadata = claims.metadata;
        const stored = await head(blob.pathname);
        if (stored.size !== metadata.sizeBytes || !stored.contentType.toLowerCase().startsWith("audio/")) throw new Error("O áudio não corresponde aos metadados validados.");
        const track = { ...metadata, sizeBytes: stored.size, mimeType: stored.contentType, blobPathname: blob.pathname, storageMode: "account" };
        await musicRedis(["HSET", claims.redisKey, metadata.id, JSON.stringify(track)]);
      },
    });
    return Response.json(result, { headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Falha ao preparar o envio seguro." }, { status: 400 });
  }
}
