import { IndexedDbStoreAdapter, StoreName } from "./indexeddb-adapter";
import { MigrationResult, MigrationState } from "./contracts";
import { athenaEventBus } from "../athena/events/event-bus";
import { notificationService } from "../notifications/notification-service";

const MIGRATION_STATE_KEY = "varynth_persistence_migration_state_v4";
const MIGRATION_BACKUP_KEY = "varynth_durable_migration_backup_v4";
const MIGRATION_TIMESTAMP_KEY = "varynth_persistence_migration_timestamp_v4";

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
  experience_events: "varynth_experience_events_v1",
  experience_preferences: "varynth_experience_preferences_v1",
  experience_records: "varynth_experience_records_v1",
  knowledge_items: "varynth_knowledge_items_v1",
  knowledge_access_logs: "varynth_knowledge_access_logs_v1",
};

export class MigrationEngine {
  constructor() {
    this.checkAndRecoverInterruptedMigration();
  }

  public getMigrationState(): MigrationState {
    if (typeof window === "undefined" || !window.localStorage) return "COMMITTED";
    const state = localStorage.getItem(MIGRATION_STATE_KEY) as MigrationState | null;
    return state || "NOT_STARTED";
  }

  private setMigrationState(state: MigrationState): void {
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem(MIGRATION_STATE_KEY, state);
    }
  }

  public isMigrationDone(): boolean {
    return this.getMigrationState() === "COMMITTED";
  }

  public checkAndRecoverInterruptedMigration(): { interrupted: boolean; recoveredState?: MigrationState } {
    const currentState = this.getMigrationState();

    if (currentState === "MIGRATING" || currentState === "VERIFYING") {
      console.warn(`[MigrationEngine] Detectada migração interrompida no estado: ${currentState}. Executando recuperação segura (Alex Principle).`);

      this.setMigrationState("ROLLED_BACK");

      athenaEventBus.emit("MIGRATION_ROLLED_BACK", {
        reason: `Migração interrompida durante o estágio ${currentState}. Estado revertido com segurança para os dados legados.`,
        timestamp: new Date().toISOString(),
      });

      notificationService.create({
        type: "MIGRATION_INTERRUPTED",
        title: "Recuperação de Migração",
        message: "Uma migração de armazenamento anterior foi interrompida. Seus dados antigos foram preservados e o VARYNTH voltou ao modo seguro.",
        severity: "WARNING",
        source: "SYSTEM",
      });

      return { interrupted: true, recoveredState: "ROLLED_BACK" };
    }

    return { interrupted: false };
  }

  public async runMigration(force = false): Promise<MigrationResult> {
    const startTime = Date.now();
    const migratedCounts: Record<string, number> = {};

    if (!force && this.isMigrationDone()) {
      return {
        success: true,
        state: "COMMITTED",
        migratedEntities: {},
        durationMs: 0,
      };
    }

    try {
      athenaEventBus.emit("MIGRATION_STARTED", { timestamp: new Date().toISOString(), force });

      // 1. Alex Principle: Create DURABLE pre-migration snapshot in persistent storage
      const durableBackup: Record<string, any> = {};
      if (typeof window !== "undefined" && window.localStorage) {
        Object.entries(LEGACY_STORAGE_MAPPING).forEach(([storeName, legacyKey]) => {
          const raw = localStorage.getItem(legacyKey);
          if (raw) {
            try {
              durableBackup[storeName] = JSON.parse(raw);
            } catch {
              // ignore parse errors
            }
          }
        });

        try {
          localStorage.setItem(MIGRATION_BACKUP_KEY, JSON.stringify(durableBackup));
        } catch {
          // ignore quota warning on backup key
        }
      }

      this.setMigrationState("BACKUP_READY");
      athenaEventBus.emit("MIGRATION_BACKUP_CREATED", {
        timestamp: new Date().toISOString(),
        keysCount: Object.keys(durableBackup).length,
      });

      // 2. Transition to MIGRATING
      this.setMigrationState("MIGRATING");

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

      athenaEventBus.emit("MIGRATION_WRITE_COMPLETED", {
        timestamp: new Date().toISOString(),
        counts: migratedCounts,
      });

      // 3. Transition to VERIFYING
      this.setMigrationState("VERIFYING");

      for (const [storeName, legacyKey] of Object.entries(LEGACY_STORAGE_MAPPING)) {
        const adapter = new IndexedDbStoreAdapter<any>(storeName as StoreName);
        const storedCount = await adapter.count();
        const expectedCount = migratedCounts[storeName] || 0;

        if (storedCount < expectedCount) {
          throw new Error(`Falha de verificação na coleção '${storeName}': esperado ${expectedCount}, encontrado ${storedCount}`);
        }
      }

      athenaEventBus.emit("MIGRATION_VERIFICATION_PASSED", {
        timestamp: new Date().toISOString(),
      });

      // 4. Transition to COMMITTED
      this.setMigrationState("COMMITTED");
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.setItem(MIGRATION_TIMESTAMP_KEY, new Date().toISOString());
      }

      const durationMs = Date.now() - startTime;

      athenaEventBus.emit("MIGRATION_COMMITTED", {
        timestamp: new Date().toISOString(),
        durationMs,
        counts: migratedCounts,
      });

      return {
        success: true,
        state: "COMMITTED",
        migratedEntities: migratedCounts,
        snapshotId: MIGRATION_BACKUP_KEY,
        durationMs,
      };
    } catch (err: any) {
      console.error("[MigrationEngine] Falha na migração:", err);
      this.setMigrationState("FAILED");

      athenaEventBus.emit("MIGRATION_FAILED", {
        error: err?.message || err,
        timestamp: new Date().toISOString(),
      });

      notificationService.create({
        type: "MIGRATION_FAILED",
        title: "Falha na Migração de Armazenamento",
        message: `A migração falhou (${err?.message || err}). Seus dados legados permanecem intactos.`,
        severity: "CRITICAL",
        source: "SYSTEM",
      });

      return {
        success: false,
        state: "FAILED",
        migratedEntities: migratedCounts,
        durationMs: Date.now() - startTime,
        error: err?.message || "Erro desconhecido durante a migração.",
      };
    }
  }
}

export const migrationEngine = new MigrationEngine();
