import type { CapabilityExecutionPlan } from "../domain/capability-plan";
import { CURRENT_CAPABILITY_PLAN_SCHEMA_VERSION, CURRENT_INTERACTION_CONTRACT_VERSION, CURRENT_TOOL_CONTRACT_VERSION, isSupportedPlanSchemaVersion } from "../domain/contract-versions";

const STORAGE_KEY = "varynth_capability_plans_v1";
const BACKUP_KEY = "varynth_capability_plans_pre_migration_backup_v1";
const MIGRATION_MARKER_KEY = "varynth_capability_plans_migration_in_progress_v1";
const STORAGE_EVENT = "varynth_capability_plans_updated";
let fallbackStorage = "[]";

export interface CapabilityPlanStoreHealth {
  healthy: boolean;
  rejectedEntries: number;
  migratedEntries: number;
  currentVersion: number;
  backupCreated: boolean;
  reason?: string;
}

type StoredPlan = Omit<CapabilityExecutionPlan, "schemaVersion" | "interactionContractVersion" | "toolContractVersions"> & Partial<Pick<CapabilityExecutionPlan, "schemaVersion" | "interactionContractVersion" | "toolContractVersions">>;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function isCapabilityPlan(value: unknown): value is StoredPlan {
  if (!value || typeof value !== "object") return false;
  const plan = value as Partial<StoredPlan>;
  return typeof plan.id === "string" && plan.id.length > 0
    && typeof plan.planHash === "string" && plan.planHash.length > 0
    && typeof plan.revision === "number" && Number.isInteger(plan.revision) && plan.revision > 0
    && typeof plan.status === "string"
    && Array.isArray(plan.steps)
    && Array.isArray(plan.events)
    && Boolean(plan.sourceTask)
    && Boolean(plan.sourceWorkflow);
}

function versionOf(plan: StoredPlan): number {
  return plan.schemaVersion ?? 1;
}

function migratePlan(plan: StoredPlan): CapabilityExecutionPlan {
  const fromVersion = versionOf(plan);
  if (fromVersion === CURRENT_CAPABILITY_PLAN_SCHEMA_VERSION) return plan as CapabilityExecutionPlan;
  return {
    ...plan,
    schemaVersion: CURRENT_CAPABILITY_PLAN_SCHEMA_VERSION,
    interactionContractVersion: plan.interactionContractVersion ?? CURRENT_INTERACTION_CONTRACT_VERSION,
    toolContractVersions: plan.toolContractVersions ?? Object.fromEntries(plan.steps.filter((step) => step.capabilityKind === "TOOL").map((step) => [step.capabilityId, CURRENT_TOOL_CONTRACT_VERSION])),
    migration: { fromVersion, toVersion: CURRENT_CAPABILITY_PLAN_SCHEMA_VERSION, migratedAt: new Date().toISOString(), preservedApproval: true },
  } as CapabilityExecutionPlan;
}

function initialHealth(): CapabilityPlanStoreHealth {
  return { healthy: true, rejectedEntries: 0, migratedEntries: 0, currentVersion: CURRENT_CAPABILITY_PLAN_SCHEMA_VERSION, backupCreated: false };
}

export class CapabilityPlanStore {
  private plans = new Map<string, CapabilityExecutionPlan>();
  private health: CapabilityPlanStoreHealth = initialHealth();

  constructor() {
    this.reload();
  }

  save(plan: CapabilityExecutionPlan): CapabilityExecutionPlan {
    if (plan.schemaVersion !== CURRENT_CAPABILITY_PLAN_SCHEMA_VERSION) throw new Error(`[CAPABILITY_PLAN_SCHEMA_WRITE_REJECTED] ${plan.schemaVersion}`);
    const saved = clone(plan);
    this.plans.set(saved.id, saved);
    this.persist();
    return clone(saved);
  }

  get(id: string): CapabilityExecutionPlan | undefined {
    const plan = this.plans.get(id);
    return plan ? clone(plan) : undefined;
  }

  list(): CapabilityExecutionPlan[] {
    return [...this.plans.values()].map(clone).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  getLoadHealth(): CapabilityPlanStoreHealth {
    return { ...this.health };
  }

  remove(id: string): boolean {
    const removed = this.plans.delete(id);
    if (removed) this.persist();
    return removed;
  }

  clear(): void {
    this.plans.clear();
    this.persist();
  }

  reload(): void {
    try {
      const durable = typeof window !== "undefined" && window.localStorage ? window.localStorage : undefined;
      const interruptedBackup = durable?.getItem(MIGRATION_MARKER_KEY) ? durable.getItem(BACKUP_KEY) : undefined;
      const raw = durable ? interruptedBackup || durable.getItem(STORAGE_KEY) || "[]" : fallbackStorage;
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) throw new Error("O armazenamento de planos não contém uma coleção válida.");

      const shaped = parsed.filter(isCapabilityPlan);
      const supported = shaped.filter((plan) => isSupportedPlanSchemaVersion(versionOf(plan)));
      const needsMigration = supported.some((plan) => versionOf(plan) < CURRENT_CAPABILITY_PLAN_SCHEMA_VERSION);
      let backupCreated = Boolean(interruptedBackup);
      if (needsMigration && durable && !interruptedBackup) {
        durable.setItem(BACKUP_KEY, raw);
        durable.setItem(MIGRATION_MARKER_KEY, JSON.stringify({ fromVersion: Math.min(...supported.map(versionOf)), toVersion: CURRENT_CAPABILITY_PLAN_SCHEMA_VERSION, startedAt: new Date().toISOString() }));
        backupCreated = true;
      }
      const valid = supported.map(migratePlan);
      const rejectedEntries = parsed.length - valid.length;
      const migratedEntries = valid.filter((plan) => plan.migration?.toVersion === CURRENT_CAPABILITY_PLAN_SCHEMA_VERSION).length;
      this.plans = new Map(valid.map((plan) => [plan.id, plan]));
      if (needsMigration || interruptedBackup) {
        const serialized = JSON.stringify(valid);
        if (durable) {
          durable.setItem(STORAGE_KEY, serialized);
          durable.removeItem?.(MIGRATION_MARKER_KEY);
        } else fallbackStorage = serialized;
      }
      this.health = {
        healthy: rejectedEntries === 0,
        rejectedEntries,
        migratedEntries,
        currentVersion: CURRENT_CAPABILITY_PLAN_SCHEMA_VERSION,
        backupCreated,
        reason: rejectedEntries > 0 ? "Entradas inválidas ou de versão incompatível foram rejeitadas durante a recuperação local." : undefined,
      };
    } catch (error) {
      this.plans = new Map();
      this.health = { ...initialHealth(), healthy: false, reason: error instanceof Error ? error.message : "Armazenamento local de planos corrompido." };
    }
  }

  private persist(): void {
    try {
      const serialized = JSON.stringify([...this.plans.values()]);
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY, serialized);
        window.dispatchEvent?.(new CustomEvent(STORAGE_EVENT));
      } else {
        fallbackStorage = serialized;
      }
    } catch {
      // The in-memory copy remains authoritative for this session when durable storage is unavailable.
    }
  }
}

export const capabilityPlanStore = new CapabilityPlanStore();
