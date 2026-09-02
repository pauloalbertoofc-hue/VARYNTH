import type { CapabilityExecutionPlan } from "../domain/capability-plan";

const STORAGE_KEY = "varynth_capability_plans_v1";
const STORAGE_EVENT = "varynth_capability_plans_updated";
let fallbackStorage = "[]";

export interface CapabilityPlanStoreHealth {
  healthy: boolean;
  rejectedEntries: number;
  reason?: string;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function isCapabilityPlan(value: unknown): value is CapabilityExecutionPlan {
  if (!value || typeof value !== "object") return false;
  const plan = value as Partial<CapabilityExecutionPlan>;
  return typeof plan.id === "string" && plan.id.length > 0
    && typeof plan.planHash === "string" && plan.planHash.length > 0
    && typeof plan.revision === "number" && Number.isInteger(plan.revision) && plan.revision > 0
    && typeof plan.status === "string"
    && Array.isArray(plan.steps)
    && Array.isArray(plan.events)
    && Boolean(plan.sourceTask)
    && Boolean(plan.sourceWorkflow);
}

export class CapabilityPlanStore {
  private plans = new Map<string, CapabilityExecutionPlan>();
  private health: CapabilityPlanStoreHealth = { healthy: true, rejectedEntries: 0 };

  constructor() {
    this.reload();
  }

  save(plan: CapabilityExecutionPlan): CapabilityExecutionPlan {
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
      const raw = typeof window !== "undefined" && window.localStorage
        ? window.localStorage.getItem(STORAGE_KEY) || "[]"
        : fallbackStorage;
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) throw new Error("O armazenamento de planos não contém uma coleção válida.");
      const valid = parsed.filter(isCapabilityPlan);
      const rejectedEntries = parsed.length - valid.length;
      this.plans = new Map(valid.map((plan) => [plan.id, plan]));
      this.health = rejectedEntries === 0
        ? { healthy: true, rejectedEntries: 0 }
        : { healthy: false, rejectedEntries, reason: "Entradas estruturalmente inválidas foram rejeitadas durante a recuperação local." };
    } catch (error) {
      this.plans = new Map();
      this.health = { healthy: false, rejectedEntries: 0, reason: error instanceof Error ? error.message : "Armazenamento local de planos corrompido." };
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
