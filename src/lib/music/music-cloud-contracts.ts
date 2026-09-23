export type MusicVisualSettings = {
  particleType: "none" | "dust" | "rain" | "stars" | "wave";
  particleDensity: number;
  motionSpeed: number;
  reducedMotion: boolean;
};

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
