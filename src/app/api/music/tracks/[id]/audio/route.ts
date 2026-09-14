import { get } from "@vercel/blob";
import { requireMusicAccount, musicRedis, validMusicBlobPath } from "@/lib/music/music-cloud";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const account = await requireMusicAccount();
  if (!account) return Response.json({ error: "Autenticação necessária." }, { status: 401 });
  if (!process.env.BLOB_READ_WRITE_TOKEN) return Response.json({ error: "Armazenamento de áudio indisponível." }, { status: 503 });
  const { id } = await params;
  if (!/^[a-f0-9-]{36}$/i.test(id)) return Response.json({ error: "Faixa não encontrada." }, { status: 404 });
  try {
    const raw = await musicRedis(["HGET", account.redisKey, id]);
    if (typeof raw !== "string") return Response.json({ error: "Faixa não encontrada nesta conta." }, { status: 404 });
    const track = JSON.parse(raw) as { blobPathname?: string; name?: string };
    if (!track.blobPathname || !validMusicBlobPath(track.blobPathname, account.namespace)) return Response.json({ error: "Faixa não encontrada nesta conta." }, { status: 404 });
    const blob = await get(track.blobPathname, { access: "private" });
    if (!blob || blob.statusCode !== 200) return Response.json({ error: "O áudio não está disponível." }, { status: 404 });
    return new Response(blob.stream, {
      headers: {
        "content-type": blob.blob.contentType,
        "content-length": String(blob.blob.size),
        "content-disposition": "inline",
        "x-content-type-options": "nosniff",
        "cache-control": "private, no-store",
      },
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível carregar o áudio." }, { status: 503 });
  }
}
