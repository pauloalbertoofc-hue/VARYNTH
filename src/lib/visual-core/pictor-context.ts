export type PictorVisualContext = {
  captureId?: string;
  mode?: string;
  capturedAt?: string;
  source?: string;
  generated?: boolean;
  originalAssetId?: string;
  imageArtifactId?: string;
};

const STRING_KEYS = ["captureId", "mode", "capturedAt", "source", "originalAssetId", "imageArtifactId"] as const;

export function sanitizePictorVisualContext(value: unknown): PictorVisualContext | undefined {
  if (!value || typeof value !== "object") return undefined;
  const input = value as Record<string, unknown>;
  const result: PictorVisualContext = {};
  for (const key of STRING_KEYS)
    if (typeof input[key] === "string" && input[key].trim()) result[key] = input[key].trim().slice(0, 160);
  if (typeof input.generated === "boolean") result.generated = input.generated;
  return Object.keys(result).length ? result : undefined;
}
