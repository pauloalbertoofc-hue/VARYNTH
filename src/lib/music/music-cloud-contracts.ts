export type MusicVisualSettings = {
  particleType: "none" | "dust" | "rain" | "stars" | "wave";
  particleDensity: number;
  motionSpeed: number;
  reducedMotion: boolean;
};

export const MUSIC_ARTWORK_MAX_TRACKS = 5_000;
const musicTrackIdPattern = /^[a-f0-9-]{36}$/i;

export type MusicArtworkUploadPayload = {
  assetId: string;
  kind: "cover" | "background";
  trackIds: string[];
  mimeType: string;
  sizeBytes: number;
};

export function isMusicArtworkUploadPayload(value: unknown): value is MusicArtworkUploadPayload {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<MusicArtworkUploadPayload>;
  const mimeTypes = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/avif", "image/svg+xml"];
  return typeof item.assetId === "string" && musicTrackIdPattern.test(item.assetId)
    && (item.kind === "cover" || item.kind === "background")
    && Array.isArray(item.trackIds) && item.trackIds.length > 0 && item.trackIds.length <= MUSIC_ARTWORK_MAX_TRACKS
    && item.trackIds.every((id) => typeof id === "string" && musicTrackIdPattern.test(id))
    && new Set(item.trackIds).size === item.trackIds.length
    && typeof item.mimeType === "string" && mimeTypes.includes(item.mimeType)
    && Number.isSafeInteger(item.sizeBytes) && Number(item.sizeBytes) > 0 && Number(item.sizeBytes) <= 20 * 1024 * 1024;
}

export function normalizeMusicArtworkTrackIds(trackIds: readonly string[]): string[] {
  const uniqueTrackIds = Array.from(new Set(trackIds));
  if (!uniqueTrackIds.length || uniqueTrackIds.length > MUSIC_ARTWORK_MAX_TRACKS || !uniqueTrackIds.every((id) => musicTrackIdPattern.test(id))) {
    throw new Error(`Escolha entre 1 e ${MUSIC_ARTWORK_MAX_TRACKS.toLocaleString("pt-BR")} faixas válidas para aplicar a imagem.`);
  }
  return uniqueTrackIds;
}

export function buildMusicArtworkAssociationCommand(namespace: string, kind: "cover" | "background", trackIds: readonly string[], assetId: string | null) {
  if (!/^[a-f0-9]{32}$/i.test(namespace) || (assetId !== null && !musicTrackIdPattern.test(assetId))) throw new Error("Proprietário ou imagem inválidos.");
  const ids = normalizeMusicArtworkTrackIds(trackIds);
  const artworkValue = assetId ?? "CLEARED";
  return ["HSET", `varynth:music:artwork:v1:${namespace}`, ...ids.flatMap((trackId) => [`${trackId}:${kind}`, artworkValue])];
}

export function isMusicVisualSettings(value: unknown): value is MusicVisualSettings {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<MusicVisualSettings>;
  return ["none", "dust", "rain", "stars", "wave"].includes(String(item.particleType))
    && typeof item.particleDensity === "number" && Number.isFinite(item.particleDensity) && item.particleDensity >= 0 && item.particleDensity <= 1
    && typeof item.motionSpeed === "number" && Number.isFinite(item.motionSpeed) && item.motionSpeed >= 0 && item.motionSpeed <= 0.3
    && typeof item.reducedMotion === "boolean";
}

export function validMusicBlobPath(pathname: string, namespace: string) {
  return /^[a-f0-9]{32}$/i.test(namespace)
    && new RegExp(`^music/${namespace}/tracks/[a-f0-9-]{36}\\.(mp3|wav|ogg|oga|m4a|aac|flac|opus|webm)(?![\\s\\S])`, "i").test(pathname);
}

export function validMusicArtworkBlobPath(pathname: string, namespace: string) {
  return /^[a-f0-9]{32}$/i.test(namespace)
    && new RegExp(`^music/${namespace}/artwork/[a-f0-9-]{36}\\.(png|jpe?g|webp|gif|avif|svg)(?![\\s\\S])`, "i").test(pathname);
}
