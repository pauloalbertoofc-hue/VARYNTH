import { PersistenceHealthReport, StorageHealthState } from "./contracts";
import { dbConnection, KNOWN_STORES, IndexedDbStoreAdapter } from "./indexeddb-adapter";
import { migrationEngine } from "./migration-engine";
import { fallbackPolicyEngine } from "./fallback-policy";
import { notificationService } from "../notifications/notification-service";

export class StorageHealthService {
  public async assessHealth(): Promise<PersistenceHealthReport> {
    const capabilities = fallbackPolicyEngine.detectCapabilities();
    const isProtected = fallbackPolicyEngine.isProtectedModeActive();

    let activeDriver: PersistenceHealthReport["activeDriver"] = "INDEXED_DB";
    if (!capabilities.indexedDB && capabilities.localStorage) {
      activeDriver = "LOCAL_STORAGE";
    } else if (!capabilities.indexedDB && !capabilities.localStorage) {
      activeDriver = "MEMORY_FALLBACK";
    }

    let storageState: StorageHealthState = "STORAGE_HEALTHY";
    if (isProtected) {
      storageState = "STORAGE_PROTECTED";
    } else if (!capabilities.indexedDB && capabilities.localStorage) {
      storageState = "STORAGE_DEGRADED";
    } else if (!capabilities.indexedDB && !capabilities.localStorage) {
      storageState = "STORAGE_UNAVAILABLE";
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

    const usagePercentage =
      estimatedQuotaBytes > 0 ? Math.round((estimatedUsageBytes / estimatedQuotaBytes) * 100) : 0;

    const migrationState = migrationEngine.getMigrationState();
    const migrationCompleted = migrationEngine.isMigrationDone();
    const migrationTimestamp =
      typeof window !== "undefined" && window.localStorage
        ? localStorage.getItem("varynth_persistence_migration_timestamp_v4") || undefined
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
    } else if (storageState === "STORAGE_PROTECTED") {
      status = "STORAGE_PROTECTED";
    } else if (activeDriver === "MEMORY_FALLBACK" || storageState === "STORAGE_DEGRADED") {
      status = "DEGRADED_FALLBACK";
    }

    return {
      isIndexedDBAvailable: capabilities.indexedDB,
      isLocalStorageAvailable: capabilities.localStorage,
      isOpfsAvailable: capabilities.opfs,
      activeDriver,
      storageState,
      capabilities,
      estimatedUsageBytes,
      estimatedQuotaBytes,
      usagePercentage,
      migrationState,
      migrationCompleted,
      migrationTimestamp,
      totalEntitiesCount,
      status,
    };
  }
}

export const storageHealthService = new StorageHealthService();
