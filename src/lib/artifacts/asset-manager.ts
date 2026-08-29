import { AssetFile, Artifact, ArtifactActor, StorageType } from "./types";
import { assetStorage } from "../persistence/indexeddb-adapter";
import { athenaEventBus } from "../athena/events/event-bus";
import { artifactStore } from "./artifact-store";

const ASSET_REGISTRY_KEY = "varynth_assets_registry_v4";

export class AssetManager {
  private assets: Map<string, AssetFile> = new Map();

  constructor() {
    this.init();
  }

  private init(): void {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        const stored = localStorage.getItem(ASSET_REGISTRY_KEY);
        if (stored) {
          const list: AssetFile[] = JSON.parse(stored);
          list.forEach((a) => this.assets.set(a.id, a));
        }
      } catch (err) {
        console.warn("[AssetManager] Erro ao carregar registry do localStorage:", err);
      }
    }
  }

  private saveRegistry(): void {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        const list = Array.from(this.assets.values());
        localStorage.setItem(ASSET_REGISTRY_KEY, JSON.stringify(list));
      } catch (err) {
        console.error("[AssetManager] Erro ao salvar registry:", err);
      }
    }
  }

  public async registerAsset(
    params: {
      name: string;
      mimeType: string;
      sizeBytes: number;
      storageType?: StorageType;
      createdBy?: ArtifactActor;
      artifactIds?: string[];
      metadata?: Record<string, unknown>;
    },
    data?: Blob | ArrayBuffer | string
  ): Promise<AssetFile> {
    const id = `asset-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const storageKey = `blob-${id}`;
    const storageType = params.storageType || "INDEXEDDB_BLOB";

    if (data) {
      await assetStorage.storeBlob(storageKey, data as any, { mimeType: params.mimeType, ...params.metadata });
    }

    const asset: AssetFile = {
      id,
      name: params.name,
      mimeType: params.mimeType,
      sizeBytes: params.sizeBytes,
      storageType,
      storageKey,
      createdAt: new Date().toISOString(),
      createdBy: params.createdBy || "USER",
      artifactIds: params.artifactIds || [],
      metadata: params.metadata || {},
    };

    this.assets.set(id, asset);
    this.saveRegistry();

    athenaEventBus.emit("ASSET_CREATED", { assetId: id, name: asset.name, sizeBytes: asset.sizeBytes });

    return JSON.parse(JSON.stringify(asset));
  }

  public getAsset(id: string): AssetFile | undefined {
    const asset = this.assets.get(id);
    return asset ? JSON.parse(JSON.stringify(asset)) : undefined;
  }

  public getAssetById(id: string): AssetFile | undefined {
    return this.getAsset(id);
  }

  public async getAssetData(id: string): Promise<Blob | ArrayBuffer | string | null> {
    const asset = this.assets.get(id);
    if (!asset) return null;
    return await assetStorage.getBlob(asset.storageKey);
  }

  public async linkAssetToArtifact(assetId: string, artifactId: string): Promise<boolean> {
    const asset = this.assets.get(assetId);
    if (!asset) return false;
    if (!asset.artifactIds.includes(artifactId)) {
      asset.artifactIds.push(artifactId);
      this.saveRegistry();
    }
    return true;
  }

  public async deleteAsset(id: string, fromArtifactId?: string): Promise<boolean> {
    const asset = this.assets.get(id);
    if (!asset) return false;

    if (fromArtifactId) {
      asset.artifactIds = asset.artifactIds.filter((aId) => aId !== fromArtifactId);
      if (asset.artifactIds.length > 0) {
        this.saveRegistry();
        return true;
      }
    }

    await assetStorage.deleteBlob(asset.storageKey);
    this.assets.delete(id);
    this.saveRegistry();

    athenaEventBus.emit("ASSET_DELETED", { assetId: id });
    return true;
  }

  public validateArtifactAssets(artifactId: string): { valid: boolean; missingAssetIds: string[] } {
    const missing: string[] = [];
    const art = artifactStore.getById(artifactId);
    if (art && art.assetFileIds) {
      for (const id of art.assetFileIds) {
        if (!this.assets.has(id)) {
          missing.push(id);
          athenaEventBus.emit("ASSET_MISSING", { assetId: id, artifactId });
        }
      }
    }
    return { valid: missing.length === 0, missingAssetIds: missing };
  }

  public listAssetsForArtifact(artifactId: string): AssetFile[] {
    return Array.from(this.assets.values()).filter((a) => a.artifactIds.includes(artifactId));
  }

  public async verifyAssetIntegrity(id: string): Promise<{
    valid: boolean;
    status: "VALID" | "ASSET_MISSING" | "ASSET_CORRUPTED";
    sizeBytes?: number;
  }> {
    const asset = this.assets.get(id);
    if (!asset) {
      athenaEventBus.emit("ASSET_MISSING", { assetId: id });
      return { valid: false, status: "ASSET_MISSING" };
    }

    const data = await assetStorage.getBlob(asset.storageKey);
    if (!data) {
      athenaEventBus.emit("ASSET_MISSING", { assetId: id, storageKey: asset.storageKey });
      return { valid: false, status: "ASSET_MISSING" };
    }

    return { valid: true, status: "VALID", sizeBytes: asset.sizeBytes };
  }

  public async validateRequiredAssets(artifact: Artifact): Promise<{ valid: boolean; missingAssets: string[] }> {
    const missing: string[] = [];

    // Media artifacts require at least one physical asset to become ACTIVE
    if (["VIDEO", "GAME", "AUDIO", "IMAGE"].includes(artifact.type)) {
      if (!artifact.assetFileIds || artifact.assetFileIds.length === 0) {
        missing.push(`Nenhum asset registrado para o artefato multimídia ${artifact.name}`);
      } else {
        for (const assetId of artifact.assetFileIds) {
          const check = await this.verifyAssetIntegrity(assetId);
          if (!check.valid) {
            missing.push(`Asset obrigatório ${assetId} não encontrado no storage físico`);
          }
        }
      }
    }

    if (missing.length > 0) {
      athenaEventBus.emit("ARTIFACT_VALIDATION_FAILED", {
        artifactId: artifact.id,
        reason: "Assets obrigatórios ausentes",
        missing,
      });
    }

    return { valid: missing.length === 0, missingAssets: missing };
  }

  public detectOrphanAssets(allArtifacts: Artifact[]): AssetFile[] {
    const referencedIds = new Set<string>();
    allArtifacts.forEach((art) => {
      (art.assetFileIds || []).forEach((id) => referencedIds.add(id));
    });

    const orphans: AssetFile[] = [];
    this.assets.forEach((asset) => {
      if (!referencedIds.has(asset.id)) {
        orphans.push(JSON.parse(JSON.stringify(asset)));
      }
    });

    return orphans;
  }

  public async getTotalStorageUsage(): Promise<{ totalBytes: number; formatted: string; count: number }> {
    let totalBytes = 0;
    this.assets.forEach((asset) => {
      totalBytes += asset.sizeBytes || 0;
    });

    let formatted = `${totalBytes} B`;
    if (totalBytes > 1024 * 1024 * 1024) {
      formatted = `${(totalBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    } else if (totalBytes > 1024 * 1024) {
      formatted = `${(totalBytes / (1024 * 1024)).toFixed(2)} MB`;
    } else if (totalBytes > 1024) {
      formatted = `${(totalBytes / 1024).toFixed(2)} KB`;
    }

    return { totalBytes, formatted, count: this.assets.size };
  }
}

export const assetManager = new AssetManager();
