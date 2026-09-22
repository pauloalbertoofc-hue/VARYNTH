import { AssetFile, Artifact, ArtifactActor, StorageType, AssetUsageRecord } from "./types";
import { assetStorage } from "../persistence/indexeddb-adapter";
import { athenaEventBus } from "../athena/events/event-bus";
import { artifactStore } from "./artifact-store";
import { FailureInjector } from "../hardening/failure-injector";

const ASSET_REGISTRY_KEY = "varynth_assets_registry_v4";
const ASSET_USAGES_KEY = "varynth_asset_usages_v4";

export class AssetManager {
  private assets: Map<string, AssetFile> = new Map();
  private usages: Map<string, AssetUsageRecord> = new Map();
  private isLoaded: boolean = false;

  constructor() {
    this.init();
    this.setupStorageListener();
  }

  private setupStorageListener(): void {
    if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
      window.addEventListener("storage", (event) => {
        if (event.key === ASSET_REGISTRY_KEY || event.key === ASSET_USAGES_KEY) {
          this.init();
        }
      });
    }
  }

  private init(): void {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        const stored = localStorage.getItem(ASSET_REGISTRY_KEY);
        if (stored) {
          const list: AssetFile[] = JSON.parse(stored);
          this.assets.clear();
          list.forEach((a) => {
            if (!a.status) a.status = "VALID";
            this.assets.set(a.id, a);
          });
        }

        const storedUsages = localStorage.getItem(ASSET_USAGES_KEY);
        if (storedUsages) {
          const uList: AssetUsageRecord[] = JSON.parse(storedUsages);
          this.usages.clear();
          uList.forEach((u) => this.usages.set(u.id, u));
        }
      } catch (err) {
        console.warn("[AssetManager] Erro ao carregar registry do localStorage:", err);
      }
    }
    this.isLoaded = true;
  }

  private saveRegistry(): void {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        const list = Array.from(this.assets.values());
        localStorage.setItem(ASSET_REGISTRY_KEY, JSON.stringify(list));

        const uList = Array.from(this.usages.values());
        localStorage.setItem(ASSET_USAGES_KEY, JSON.stringify(uList));
      } catch (err) {
        console.error("[AssetManager] Erro ao salvar registry:", err);
      }
    }
  }

  public registerUsage(record: AssetUsageRecord): AssetUsageRecord {
    this.usages.set(record.id, JSON.parse(JSON.stringify(record)));
    this.saveRegistry();
    return record;
  }

  public removeUsage(usageId: string): boolean {
    const res = this.usages.delete(usageId);
    if (res) this.saveRegistry();
    return res;
  }

  public getUsagesForAsset(assetId: string): AssetUsageRecord[] {
    return Array.from(this.usages.values()).filter((u) => u.assetId === assetId);
  }

  public getUsagesForArtifact(artifactId: string): AssetUsageRecord[] {
    return Array.from(this.usages.values()).filter((u) => u.consumerArtifactId === artifactId);
  }

  public getUsagesForVersion(artifactId: string, versionId: string): AssetUsageRecord[] {
    return Array.from(this.usages.values()).filter(
      (u) => u.consumerArtifactId === artifactId && u.consumerVersionId === versionId
    );
  }

  public getAllUsages(): AssetUsageRecord[] {
    return Array.from(this.usages.values());
  }

  public calculateChecksum(data: Blob | ArrayBuffer | string): string {
    if (typeof data === "string") {
      let hash = 0;
      for (let i = 0; i < data.length; i++) {
        hash = (hash << 5) - hash + data.charCodeAt(i);
        hash |= 0;
      }
      return `chk-${data.length}-${Math.abs(hash).toString(16)}`;
    }
    const byteLength = data instanceof Blob ? data.size : data.byteLength;
    return `chk-bin-${byteLength}`;
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
    // Failure Injector simulation points
    FailureInjector.checkAndThrow("storage-exhaustion", "Storage quota exceeded during asset registration.");
    FailureInjector.checkAndThrow("during-asset-write", "Disk write failure during asset payload storage.");

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
      status: "VALID",
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

  public quarantineAsset(assetId: string, reason: string): AssetFile | undefined {
    const asset = this.assets.get(assetId);
    if (!asset) return undefined;

    asset.status = "QUARANTINED";
    asset.quarantineReason = reason;
    this.saveRegistry();

    athenaEventBus.emit("ASSET_QUARANTINED" as any, { assetId, reason });
    return JSON.parse(JSON.stringify(asset));
  }

  public isAssetUsable(assetId: string): boolean {
    const asset = this.assets.get(assetId);
    if (!asset) return false;
    if (asset.status === "QUARANTINED" || asset.status === "CORRUPTED") return false;
    return true;
  }

  public getAllAssets(): AssetFile[] {
    return Array.from(this.assets.values()).map((a) => JSON.parse(JSON.stringify(a)));
  }

  public getAll(): AssetFile[] {
    return this.getAllAssets();
  }

  public async createAsset(
    params: {
      name: string;
      type?: string;
      mimeType: string;
      sizeBytes: number;
      data?: Blob | ArrayBuffer | string;
      metadata?: Record<string, unknown>;
    },
    actor: ArtifactActor = "USER"
  ): Promise<{ asset: AssetFile }> {
    const asset = await this.registerAsset(
      {
        name: params.name,
        mimeType: params.mimeType,
        sizeBytes: params.sizeBytes,
        createdBy: actor,
        metadata: { ...params.metadata, assetType: params.type },
      },
      params.data
    );
    return { asset };
  }

  public getAsset(id: string): AssetFile | undefined {
    const asset = this.assets.get(id);
    return asset ? JSON.parse(JSON.stringify(asset)) : undefined;
  }

  /** Updates canonical asset facts (for example decoded duration/rate/channels).
   * User-authored, project-specific audio labels belong on the audio document instead. */
  public updateAssetMetadata(id: string, patch: Record<string, unknown>): AssetFile | undefined {
    const asset = this.assets.get(id);
    if (!asset) return undefined;
    asset.metadata = { ...(asset.metadata || {}), ...JSON.parse(JSON.stringify(patch)) };
    this.saveRegistry();
    if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("varynth:asset-metadata-updated", { detail: { assetId: id } }));
    return JSON.parse(JSON.stringify(asset));
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

  public isAssetReferenced(assetId: string, allArtifacts?: Artifact[]): boolean {
    // 1. Check direct asset.artifactIds
    const asset = this.assets.get(assetId);
    if (asset && asset.artifactIds && asset.artifactIds.length > 0) return true;

    // 2. Check active usages
    const hasUsage = Array.from(this.usages.values()).some((u) => u.assetId === assetId);
    if (hasUsage) return true;

    // 3. Check artifacts and historical versions
    if (allArtifacts) {
      for (const art of allArtifacts) {
        if (art.assetFileIds?.includes(assetId)) return true;
        if (art.versions) {
          for (const ver of art.versions) {
            if (ver.fileAssetIds?.includes(assetId)) return true;
          }
        }
      }
    }

    return false;
  }

  public detectOrphanAssets(allArtifacts: Artifact[]): AssetFile[] {
    const referencedIds = new Set<string>();
    allArtifacts.forEach((art) => {
      (art.assetFileIds || []).forEach((id) => referencedIds.add(id));
      (art.versions || []).forEach((ver) => {
        (ver.fileAssetIds || []).forEach((id) => referencedIds.add(id));
      });
    });

    // Also include all active usages
    this.usages.forEach((u) => referencedIds.add(u.assetId));

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
