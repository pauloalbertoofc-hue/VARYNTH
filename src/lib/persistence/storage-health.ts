import { PersistenceHealthReport } from "./contracts";
import { dbConnection, KNOWN_STORES, IndexedDbStoreAdapter } from "./indexeddb-adapter";
import { migrationEngine } from "./migration-engine";
import { notificationService } from "../notifications/notification-service";

export class StorageHealthService {
  public async assessHealth(): Promise<PersistenceHealthReport> {
    const isIndexedDBAvailable = dbConnection.isAvailable();
    const isLocalStorageAvailable = typeof window !== "undefined" && typeof window.localStorage !== "undefined";

    let activeDriver: PersistenceHealthReport["activeDriver"] = "INDEXED_DB";
    if (!isIndexedDBAvailable && isLocalStorageAvailable) {
      activeDriver = "LOCAL_STORAGE";
    } else if (!isIndexedDBAvailable && !isLocalStorageAvailable) {
      activeDriver = "MEMORY_FALLBACK";
    }

    let estimatedUsageBytes = 0;
    let estimatedQuotaBytes = 1024 * 1024 * 1024; // 1 GB fallback

    if (typeof navigator !== "undefined" && navigator.storage && navigator.storage.estimate) {
      try {
        const est = await navigator.storage.estimate();
        estimatedUsageBytes = est.usage || 0;
        estimatedQuotaBytes = est.quota || estimatedQuotaBytes;
      } catch {
        // fallback
      }
    }

    const usagePercentage = estimatedQuotaBytes > 0
      ? Math.round((estimatedUsageBytes / estimatedQuotaBytes) * 100)
      : 0;

    const migrationCompleted = migrationEngine.isMigrationDone();
    const migrationTimestamp =
      typeof window !== "undefined" && window.localStorage
        ? localStorage.getItem("varynth_persistence_migration_v4_timestamp") || undefined
        : undefined;

    const totalEntitiesCount: Record<string, number> = {};
    for (const storeName of KNOWN_STORES) {
      try {
        const adapter = new IndexedDbStoreAdapter<any>(storeName);
        totalEntitiesCount[storeName] = await adapter.count();
      } catch {
        totalEntitiesCount[storeName] = 0;
      }
    }

    let status: PersistenceHealthReport["status"] = "HEALTHY";
    if (usagePercentage >= 80) {
      status = "WARNING_QUOTA_HIGH";
      notificationService.create({
        type: "STORAGE_QUOTA_WARNING",
        title: "Armazenamento Local Quase Cheio",
        message: `O VARYNTH OS está utilizando ${usagePercentage}% da quota do navegador. Considere exportar um backup.`,
        severity: "WARNING",
        source: "SYSTEM",
      });
    } else if (activeDriver === "MEMORY_FALLBACK") {
      status = "DEGRADED_FALLBACK";
    }

    return {
      isIndexedDBAvailable,
      isLocalStorageAvailable,
      activeDriver,
      estimatedUsageBytes,
      estimatedQuotaBytes,
      usagePercentage,
      migrationCompleted,
      migrationTimestamp,
      totalEntitiesCount,
      status,
    };
  }
}

export const storageHealthService = new StorageHealthService();

