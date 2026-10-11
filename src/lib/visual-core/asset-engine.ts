export interface VisualAssetRef {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  role: "SOURCE" | "DERIVED" | "PREVIEW";
  immutable: boolean;
  contentHash?: string;
  metadata: Record<string, unknown>;
}

export function assetIdentityKey(asset: Pick<VisualAssetRef, "mimeType" | "sizeBytes" | "contentHash">): string {
  return [asset.mimeType, asset.sizeBytes, asset.contentHash ?? "unknown"].join(":");
}

export function validateAssetRef(asset: VisualAssetRef): { valid: boolean; error?: string } {
  if (!asset.id || !asset.name || !asset.mimeType) return { valid: false, error: "INVALID_ASSET_IDENTITY" };
  if (!Number.isFinite(asset.sizeBytes) || asset.sizeBytes < 0) return { valid: false, error: "INVALID_ASSET_SIZE" };
  if (asset.role === "SOURCE" && !asset.immutable) return { valid: false, error: "SOURCE_ASSET_MUST_BE_IMMUTABLE" };
  return { valid: true };
}

