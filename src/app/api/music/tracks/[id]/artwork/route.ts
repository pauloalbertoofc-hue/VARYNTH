import { get } from "@vercel/blob";
import { requireMusicAccount, musicRedis, validMusicArtworkBlobPath, validMusicBlobPath } from "@/lib/music/music-cloud";
import { isMusicVisualSettings } from "@/lib/music/music-cloud-contracts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const idPattern = /^[a-f0-9-]{36}$/i;
const assetsKey = (namespace: string) => `varynth:music:artwork-assets:v1:${namespace}`;
const profilesKey = (namespace: string) => `varynth:music:artwork:v1:${namespace}`;
const settingsKey = (namespace: string) => `varynth:music:visual-settings:v1:${namespace}`;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const account = await requireMusicAccount();
  if (!account) return Response.json({ error: "Autenticação necessária." }, { status: 401 });
  const { id } = await params;
  if (!idPattern.test(id)) return Response.json({ error: "Faixa não encontrada." }, { status: 404 });
  try {
    const rawTrack = await musicRedis(["HGET", account.redisKey, id]);
    if (typeof rawTrack !== "string") return Response.json({ error: "Faixa não encontrada nesta conta." }, { status: 404 });
    const track = JSON.parse(rawTrack) as { blobPathname?: string };
    if (!track.blobPathname || !validMusicBlobPath(track.blobPathname, account.namespace)) return Response.json({ error: "Faixa não encontrada nesta conta." }, { status: 404 });
    const kind = new URL(request.url).searchParams.get("kind");
    if (!kind) {
      const [cover, background, rawSettings] = await Promise.all([
        musicRedis(["HGET", profilesKey(account.namespace), `${id}:cover`]),
        musicRedis(["HGET", profilesKey(account.namespace), `${id}:background`]),
        musicRedis(["HGET", settingsKey(account.namespace), id]),
      ]);
      const assetIds = [cover, background].filter((value): value is string => typeof value === "string");
      const assets = await Promise.all(assetIds.map((assetId) => musicRedis(["HGET", assetsKey(account.namespace), assetId])));
      const paths = new Map(assetIds.map((assetId, index) => {
        try { const asset = JSON.parse(String(assets[index])) as { pathname?: string }; return [assetId, asset.pathname || ""]; } catch { return [assetId, ""]; }
      }));
      const resolve = (value: unknown, visualKind: string) => typeof value === "string" && paths.get(value) && validMusicArtworkBlobPath(paths.get(value)!, account.namespace) ? `/api/music/tracks/${encodeURIComponent(id)}/artwork?kind=${visualKind}` : undefined;
      let visualSettings: unknown;
      try { visualSettings = typeof rawSettings === "string" ? JSON.parse(rawSettings) : undefined; } catch { visualSettings = undefined; }
      return Response.json({ coverUrl: resolve(cover, "cover"), backgroundUrl: resolve(background, "background"), visualSettings: isMusicVisualSettings(visualSettings) ? visualSettings : undefined }, { headers: { "cache-control": "private, no-store" } });
    }
    if (kind !== "cover" && kind !== "background") return Response.json({ error: "Tipo de imagem inválido." }, { status: 400 });
    const assetId = await musicRedis(["HGET", profilesKey(account.namespace), `${id}:${kind}`]);
    if (typeof assetId !== "string" || !idPattern.test(assetId)) return new Response(null, { status: 404, headers: { "cache-control": "private, no-store" } });
    const assetRaw = await musicRedis(["HGET", assetsKey(account.namespace), assetId]);
    if (typeof assetRaw !== "string") return new Response(null, { status: 404, headers: { "cache-control": "private, no-store" } });
    const asset = JSON.parse(assetRaw) as { pathname?: string; mimeType?: string; sizeBytes?: number };
    if (!asset.pathname || !validMusicArtworkBlobPath(asset.pathname, account.namespace)) return new Response(null, { status: 404, headers: { "cache-control": "private, no-store" } });
    const blob = await get(asset.pathname, { access: "private" });
    if (!blob || blob.statusCode !== 200) return new Response(null, { status: 404, headers: { "cache-control": "private, no-store" } });
    return new Response(blob.stream, { headers: {
      "content-type": blob.blob.contentType, "content-length": String(blob.blob.size), "content-disposition": "inline",
      "x-content-type-options": "nosniff", "cache-control": "private, no-store",
      ...(blob.blob.contentType === "image/svg+xml" ? { "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; img-src data:; sandbox" } : {}),
    } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível carregar a arte." }, { status: 503 });
  }
}
