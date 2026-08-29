export interface StorageAdapter<T extends { id: string }> {
  getById(id: string): Promise<T | null>;
  getAll(filter?: (item: T) => boolean): Promise<T[]>;
  save(item: T): Promise<T>;
  saveBatch(items: T[]): Promise<void>;
  delete(id: string): Promise<boolean>;
  clear(): Promise<void>;
  count(): Promise<number>;
}

export interface AssetStorageAdapter {
  storeBlob(id: string, blob: Blob | string, metadata?: Record<string, unknown>): Promise<string>;
  getBlob(id: string): Promise<Blob | string | null>;
  getBlobUrl(id: string): Promise<string | null>;
  deleteBlob(id: string): Promise<boolean>;
  listAssets(): Promise<{ id: string; sizeBytes: number; mimeType?: string; updatedAt: string }[]>;
  getStorageUsage(): Promise<{ usedBytes: number; quotaBytes: number }>;
}

export interface PersistenceHealthReport {
  isIndexedDBAvailable: boolean;
  isLocalStorageAvailable: boolean;
  activeDriver: "INDEXED_DB" | "LOCAL_STORAGE" | "MEMORY_FALLBACK";
  estimatedUsageBytes: number;
  estimatedQuotaBytes: number;
  usagePercentage: number;
  migrationCompleted: boolean;
  migrationTimestamp?: string;
  totalEntitiesCount: Record<string, number>;
  status: "HEALTHY" | "WARNING_QUOTA_HIGH" | "DEGRADED_FALLBACK" | "CORRUPTED";
}

export interface MigrationResult {
  success: boolean;
  migratedEntities: Record<string, number>;
  snapshotId?: string;
  durationMs: number;
  error?: string;
}

