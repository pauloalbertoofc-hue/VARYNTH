import type { AthenaContext } from "../domain/context";
import type { CapabilityExecutionPlan, CapabilityPlanExecutionSummary } from "../domain/capability-plan";
import type { AthenaEngineContext } from "../engine";
import { calculateCapabilityPlanHash } from "./capability-plan-builder";
import { capabilityPlanExecutor, CapabilityPlanExecutionResult } from "./capability-plan-executor";
import { capabilityPlanStateMachine } from "./capability-plan-state-machine";
import { capabilityPlanStore, CapabilityPlanStore } from "./capability-plan-store";
import { executableCapabilityRegistry } from "../kernel/executable-capability-registry";

export interface CapabilityPlanReconciliation {
  valid: boolean;
  planId: string;
  completedStepIds: string[];
  unavailableCapabilityIds: string[];
  hashMatches: boolean;
  reason: string;
}

export interface CapabilityPlanDiagnostic {
  planId: string;
  status: CapabilityExecutionPlan["status"];
  progress: number;
  completed: number;
  total: number;
  currentOrNextStep?: string;
  lastEvent?: string;
  metrics: CapabilityExecutionPlan["metrics"];
  recoverable: boolean;
}

export class CapabilityPlanRuntime {
  constructor(private readonly store: CapabilityPlanStore = capabilityPlanStore) {
    this.recoverInterruptedPlans();
  }

  register(plan: CapabilityExecutionPlan): CapabilityExecutionPlan {
    return this.store.save(plan);
  }

  recoverInterruptedPlans(): CapabilityExecutionPlan[] {
    const recovered: CapabilityExecutionPlan[] = [];
    for (const plan of this.store.list()) {
      if (plan.status !== "EXECUTING") continue;
      const interrupted = capabilityPlanStateMachine.transition(
        plan, "INTERRUPTED", "Execução interrompida durante reinicialização local."
      );
      recovered.push(this.store.save(interrupted));
    }
    return recovered;
  }

  reconcile(plan: CapabilityExecutionPlan): CapabilityPlanReconciliation {
    const unavailableCapabilityIds = plan.steps
      .filter((step) => step.capabilityKind !== "CORE" && !executableCapabilityRegistry.get(step.capabilityId)?.enabled)
      .map((step) => step.capabilityId);
    const hashMatches = calculateCapabilityPlanHash(plan) === plan.planHash && plan.approvedHash === plan.planHash;
    const completedStepIds = plan.steps.filter((step) => step.status === "COMPLETED").map((step) => step.id);
    const valid = hashMatches && unavailableCapabilityIds.length === 0;
    return {
      valid,
      planId: plan.id,
      completedStepIds,
      unavailableCapabilityIds,
      hashMatches,
      reason: valid ? "Plano reconciliado com hash, capacidades e checkpoints válidos." :
        !hashMatches ? "Plano divergiu do hash aprovado." :
        `Capacidades indisponíveis: ${unavailableCapabilityIds.join(", ")}`,
    };
  }

  async execute(planId: string, context: AthenaContext, storeContext: AthenaEngineContext): Promise<CapabilityPlanExecutionResult> {
    const plan = this.store.get(planId);
    if (!plan) throw new Error(`[CAPABILITY_PLAN_NOT_FOUND] ${planId}`);
    const reconciliation = this.reconcile(plan);
    if (!reconciliation.valid) {
      const blocked = plan.status === "BLOCKED" ? plan : capabilityPlanStateMachine.transition(plan, "BLOCKED", reconciliation.reason);
      this.store.save(blocked);
      return {
        plan: blocked,
        summary: this.summary("BLOCKED", reconciliation.completedStepIds, [], blocked.steps.filter((step) => step.status !== "COMPLETED").map((step) => step.id), [], reconciliation.reason),
      };
    }

    const result = await capabilityPlanExecutor.execute(plan, context, storeContext, {
      onCheckpoint: (checkpoint) => { this.store.save(checkpoint); },
      shouldContinue: (id) => {
        const current = this.store.get(id);
        return current?.status !== "PAUSED" && current?.status !== "CANCELLED";
      },
    });
    const controlState = this.store.get(planId)?.status;
    if (
      result.plan.status === "INTERRUPTED" &&
      (controlState === "PAUSED" || controlState === "CANCELLED")
    ) {
      result.plan = { ...result.plan, status: controlState };
    }
    this.store.save(result.plan);
    return result;
  }

  pause(planId: string): CapabilityExecutionPlan {
    return this.transition(planId, "PAUSED", "Pausa solicitada; nenhuma nova etapa será iniciada.");
  }

  cancel(planId: string): CapabilityExecutionPlan {
    return this.transition(planId, "CANCELLED", "Execução cancelada; resultados já concluídos foram preservados.");
  }

  resume(planId: string): CapabilityExecutionPlan {
    const plan = this.require(planId);
    const reconciliation = this.reconcile(plan);
    if (!reconciliation.valid) throw new Error(`[CAPABILITY_PLAN_RECONCILIATION_FAILED] ${reconciliation.reason}`);
    const resumed = capabilityPlanStateMachine.transition(plan, "APPROVED", "Plano reconciliado e preparado para retomada idempotente.");
    return this.store.save(resumed);
  }

  retryStep(planId: string, stepId: string): CapabilityExecutionPlan {
    const plan = this.require(planId);
    const step = plan.steps.find((candidate) => candidate.id === stepId);
    if (!step || !["FAILED", "BLOCKED", "SKIPPED"].includes(step.status)) {
      throw new Error(`[CAPABILITY_STEP_NOT_RETRYABLE] ${stepId}`);
    }
    const now = new Date().toISOString();
    const updated: CapabilityExecutionPlan = {
      ...plan,
      status: "APPROVED",
      steps: plan.steps.map((candidate) => candidate.id === stepId ? { ...candidate, status: "PENDING", error: undefined } : candidate),
      sourceWorkflow: {
        ...plan.sourceWorkflow,
        status: "PENDING",
        steps: plan.sourceWorkflow.steps.map((candidate) => candidate.id === stepId ? { ...candidate, status: "PENDING", error: undefined } : candidate),
      },
      updatedAt: now,
      metrics: { ...plan.metrics, retryCount: plan.metrics.retryCount + 1 },
      events: [...plan.events, { id: `event-${Date.now()}-retry`, type: "STEP_RETRY", message: `Nova tentativa autorizada para ${stepId}.`, timestamp: now, stepId }],
    };
    return this.store.save(updated);
  }

  async revert(
    planId: string,
    undoStep: (step: CapabilityExecutionPlan["steps"][number]) => void | Promise<void>
  ): Promise<CapabilityExecutionPlan> {
    let plan = this.require(planId);
    const reversible = [...plan.steps].reverse().filter((step) => step.status === "COMPLETED" && step.authority === "MUTATE_GOVERNED");
    if (reversible.some((step) => !step.supportsUndo)) {
      throw new Error("[CAPABILITY_PLAN_UNDO_UNAVAILABLE] Há mutações concluídas sem contrato de undo.");
    }
    for (const step of reversible) await undoStep(step);
    plan = capabilityPlanStateMachine.transition(plan, "REVERTED", "Mutações reversíveis desfeitas em ordem inversa.");
    plan.metrics = { ...plan.metrics, reversalCount: plan.metrics.reversalCount + 1 };
    return this.store.save(plan);
  }

  diagnose(planId: string): CapabilityPlanDiagnostic {
    const plan = this.require(planId);
    const completed = plan.steps.filter((step) => step.status === "COMPLETED").length;
    const total = plan.steps.length;
    return {
      planId,
      status: plan.status,
      progress: total === 0 ? 100 : Math.round((completed / total) * 100),
      completed,
      total,
      currentOrNextStep: plan.steps.find((step) => step.status === "RUNNING" || step.status === "PENDING")?.name,
      lastEvent: plan.events.at(-1)?.message,
      metrics: { ...plan.metrics, selectedCapabilityIds: [...plan.metrics.selectedCapabilityIds] },
      recoverable: ["PAUSED", "INTERRUPTED", "PARTIAL", "FAILED", "BLOCKED"].includes(plan.status),
    };
  }

  private transition(planId: string, to: CapabilityExecutionPlan["status"], reason: string): CapabilityExecutionPlan {
    return this.store.save(capabilityPlanStateMachine.transition(this.require(planId), to, reason));
  }

  private require(planId: string): CapabilityExecutionPlan {
    const plan = this.store.get(planId);
    if (!plan) throw new Error(`[CAPABILITY_PLAN_NOT_FOUND] ${planId}`);
    return plan;
  }

  private summary(
    status: CapabilityPlanExecutionSummary["status"], completedStepIds: string[], failedStepIds: string[],
    blockedStepIds: string[], skippedStepIds: string[], message: string
  ): CapabilityPlanExecutionSummary {
    return { status, completedStepIds, failedStepIds, blockedStepIds, skippedStepIds, message };
  }
}

export const capabilityPlanRuntime = new CapabilityPlanRuntime();
