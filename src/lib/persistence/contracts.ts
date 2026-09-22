export type DataClass =
  | "LIGHTWEIGHT_STATE"
  | "STRUCTURED_APP_DATA"
  | "COGNITIVE_DATA"
  | "LARGE_ASSET_BLOB"
  | "TECHNICAL_DOCS"
  | "TRANSIENT_RUNTIME";

export type FallbackMode = "LOCAL_STORAGE" | "MEMORY_ONLY" | "READ_ONLY" | "FAIL_CLOSED";

export type StorageHealthState =
  | "STORAGE_HEALTHY"
  | "STORAGE_DEGRADED"
  | "STORAGE_PROTECTED"
  | "STORAGE_UNAVAILABLE";

export type MigrationState =
  | "NOT_STARTED"
  | "BACKUP_READY"
  | "MIGRATING"
  | "VERIFYING"
  | "COMMITTED"
  | "ROLLED_BACK"
  | "FAILED";

export interface StorageCapabilities {
  localStorage: boolean;
  indexedDB: boolean;
  opfs: boolean;
  persistentStorageGranted?: boolean;
}

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
  storeBlob(id: string, blob: Blob | ArrayBuffer | string, metadata?: Record<string, unknown>): Promise<string>;
  getBlob(id: string): Promise<Blob | string | null>;
  getBlobUrl(id: string): Promise<string | null>;
  deleteBlob(id: string): Promise<boolean>;
  listAssets(): Promise<{ id: string; sizeBytes: number; mimeType?: string; updatedAt: string }[]>;
  getStorageUsage(): Promise<{ usedBytes: number; quotaBytes: number }>;
}

export interface PersistenceHealthReport {
  isIndexedDBAvailable: boolean;
  isLocalStorageAvailable: boolean;
  isOpfsAvailable: boolean;
  activeDriver: "INDEXED_DB" | "LOCAL_STORAGE" | "MEMORY_FALLBACK";
  storageState: StorageHealthState;
  capabilities: StorageCapabilities;
  estimatedUsageBytes: number;
  estimatedQuotaBytes: number;
  usagePercentage: number;
  migrationState: MigrationState;
  migrationCompleted: boolean;
  migrationTimestamp?: string;
  totalEntitiesCount: Record<string, number>;
  status: "HEALTHY" | "WARNING_QUOTA_HIGH" | "DEGRADED_FALLBACK" | "STORAGE_PROTECTED" | "CORRUPTED";
}

export interface MigrationResult {
  success: boolean;
  state: MigrationState;
  migratedEntities: Record<string, number>;
  snapshotId?: string;
  durationMs: number;
  error?: string;
}
