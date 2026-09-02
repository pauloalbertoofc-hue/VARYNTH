import type { CapabilityExecutionPlan } from "../domain/capability-plan";

const STORAGE_KEY = "varynth_capability_plans_v1";
const STORAGE_EVENT = "varynth_capability_plans_updated";
let fallbackStorage = "[]";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

export class CapabilityPlanStore {
  private plans = new Map<string, CapabilityExecutionPlan>();

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
      const parsed = JSON.parse(raw) as CapabilityExecutionPlan[];
      this.plans = new Map(parsed.map((plan) => [plan.id, plan]));
    } catch {
      this.plans = new Map();
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
