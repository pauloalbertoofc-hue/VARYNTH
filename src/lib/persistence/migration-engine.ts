import { IndexedDbStoreAdapter, StoreName } from "./indexeddb-adapter";
import { MigrationResult } from "./contracts";
import { athenaEventBus } from "../athena/events/event-bus";

const MIGRATION_FLAG_KEY = "varynth_persistence_migration_v4";
const SNAPSHOT_KEY_PREFIX = "varynth_migration_snapshot_";

const LEGACY_STORAGE_MAPPING: Record<StoreName, string> = {
  projects: "varynth_os_projects",
  tasks: "varynth_os_tasks",
  notes: "varynth_os_notes",
  vault: "varynth_os_vault",
  chronos: "varynth_os_chronos",
  people: "varynth_os_people",
  labs: "varynth_os_labs",
  theses: "varynth_os_theses",
  researches: "varynth_os_researches",
  evidences: "varynth_os_evidences",
  opportunities: "varynth_os_opportunities",
  forge: "varynth_os_forge",
  trash: "varynth_os_trash",
  activities: "varynth_os_activities",
  artifacts: "varynth_artifacts_v4",
  doc_reviews: "varynth_docs_review_queue_v4",
  doc_audit: "varynth_docs_audit_log_v4",
  notifications: "varynth_notifications_v4",
  athena_messages: "varynth_athena_messages",
  athena_episodes: "varynth_athena_episodic_memory",
  asset_blobs: "varynth_asset_blobs",
};

export class MigrationEngine {
  public isMigrationDone(): boolean {
    if (typeof window === "undefined" || !window.localStorage) return true;
    return localStorage.getItem(MIGRATION_FLAG_KEY) === "COMPLETED";
  }

  public async runMigration(force = false): Promise<MigrationResult> {
    const startTime = Date.now();
    const migratedCounts: Record<string, number> = {};

    if (!force && this.isMigrationDone()) {
      return {
        success: true,
        migratedEntities: {},
        durationMs: 0,
      };
    }

    try {
      // 1. Alex Principle: Pre-Migration Snapshot
      const snapshotId = `${SNAPSHOT_KEY_PREFIX}${Date.now()}`;
      const preMigrationDump: Record<string, any> = {};

      if (typeof window !== "undefined" && window.localStorage) {
        Object.entries(LEGACY_STORAGE_MAPPING).forEach(([storeName, legacyKey]) => {
          const raw = localStorage.getItem(legacyKey);
          if (raw) {
            try {
              preMigrationDump[storeName] = JSON.parse(raw);
            } catch {
              // ignore parse errors
            }
          }
        });

        try {
          localStorage.setItem(snapshotId, JSON.stringify(preMigrationDump));
        } catch {
          // ignore quota error on snapshot
        }
      }

      // 2. Perform Atomic Migration Store by Store
      for (const [storeName, legacyKey] of Object.entries(LEGACY_STORAGE_MAPPING)) {
        const adapter = new IndexedDbStoreAdapter<any>(storeName as StoreName);
        let items: any[] = [];

        if (typeof window !== "undefined" && window.localStorage) {
          const raw = localStorage.getItem(legacyKey);
          if (raw) {
            try {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed)) {
                items = parsed;
              } else if (parsed && typeof parsed === "object") {
                items = [parsed];
              }
            } catch {
              items = [];
            }
          }
        }

        if (items.length > 0) {
          // Normalize IDs if missing
          const normalized = items.map((item, idx) => {
            if (!item.id) {
              return { ...item, id: `${storeName}-${idx}-${Date.now()}` };
            }
            return item;
          });

          await adapter.saveBatch(normalized);
          migratedCounts[storeName] = normalized.length;
        } else {
          migratedCounts[storeName] = 0;
        }
      }

      // 3. Mark Migration as Completed
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.setItem(MIGRATION_FLAG_KEY, "COMPLETED");
        localStorage.setItem(`${MIGRATION_FLAG_KEY}_timestamp`, new Date().toISOString());
      }

      const durationMs = Date.now() - startTime;

      athenaEventBus.emit("SYSTEM_ALERT", {
        title: "Migração de Persistência Concluída",
        message: `Migração para IndexedDB soberano concluída com sucesso em ${durationMs}ms.`,
        severity: "SUCCESS",
        source: "SYSTEM",
      });

      return {
        success: true,
        migratedEntities: migratedCounts,
        snapshotId,
        durationMs,
      };
    } catch (err: any) {
      console.error("[MigrationEngine] Erro durante a migração:", err);
      return {
        success: false,
        migratedEntities: migratedCounts,
        durationMs: Date.now() - startTime,
        error: err?.message || "Erro desconhecido durante a migração de persistência.",
      };
    }
  }
}

export const migrationEngine = new MigrationEngine();

