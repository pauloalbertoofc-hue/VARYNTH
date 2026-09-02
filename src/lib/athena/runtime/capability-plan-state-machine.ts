import type { CapabilityExecutionPlan, CapabilityPlanStatus } from "../domain/capability-plan";

const TRANSITIONS: Readonly<Record<CapabilityPlanStatus, readonly CapabilityPlanStatus[]>> = {
  UNDERSTOOD: ["PLANNED", "CANCELLED"],
  PLANNED: ["APPROVED", "CANCELLED", "BLOCKED"],
  APPROVED: ["EXECUTING", "CANCELLED", "BLOCKED"],
  EXECUTING: ["PAUSED", "INTERRUPTED", "PARTIAL", "COMPLETED", "FAILED", "CANCELLED", "BLOCKED"],
  PAUSED: ["APPROVED", "CANCELLED"],
  INTERRUPTED: ["APPROVED", "CANCELLED", "BLOCKED"],
  PARTIAL: ["APPROVED", "REVERTED", "CANCELLED"],
  COMPLETED: ["REVERTED"],
  BLOCKED: ["APPROVED", "CANCELLED"],
  FAILED: ["APPROVED", "REVERTED", "CANCELLED"],
  CANCELLED: ["REVERTED"],
  REVERTED: [],
};

export class CapabilityPlanStateMachine {
  canTransition(from: CapabilityPlanStatus, to: CapabilityPlanStatus): boolean {
    return TRANSITIONS[from].includes(to);
  }

  transition(plan: CapabilityExecutionPlan, to: CapabilityPlanStatus, reason: string): CapabilityExecutionPlan {
    if (!this.canTransition(plan.status, to)) {
      throw new Error(`[CAPABILITY_PLAN_INVALID_TRANSITION] ${plan.status} -> ${to}`);
    }
    const now = new Date().toISOString();
    return {
      ...plan,
      status: to,
      updatedAt: now,
      events: [...plan.events, { id: `event-${Date.now()}-${to}`, type: to, message: reason, timestamp: now }],
    };
  }
}

export const capabilityPlanStateMachine = new CapabilityPlanStateMachine();

