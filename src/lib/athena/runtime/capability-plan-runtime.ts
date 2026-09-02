import type { AthenaContext } from "../domain/context";
import type { CapabilityExecutionPlan, CapabilityPlanExecutionSummary } from "../domain/capability-plan";
import type { AthenaEngineContext } from "../engine";
import { calculateCapabilityPlanHash } from "./capability-plan-builder";
import { capabilityPlanExecutor, CapabilityPlanExecutionResult } from "./capability-plan-executor";
import { capabilityPlanStateMachine } from "./capability-plan-state-machine";
import { capabilityPlanStore, CapabilityPlanStore } from "./capability-plan-store";
import { executableCapabilityRegistry } from "../kernel/executable-capability-registry";
import { athenaToolManager } from "../tools/tool-manager";
import { athenaObservabilityJournal } from "../observability/local-observability-journal";

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

const activePlanOperations = new Set<string>();

export class CapabilityPlanRuntime {
  constructor(private readonly store: CapabilityPlanStore = capabilityPlanStore) {
    this.recoverInterruptedPlans();
  }

  register(plan: CapabilityExecutionPlan): CapabilityExecutionPlan {
    const saved = this.store.save(plan);
    athenaObservabilityJournal.record({ category: "PLAN", type: "PLAN_REGISTERED", status: "INFO", message: `Plano ${plan.id} registrado com ${plan.steps.length} etapas.`, planId: plan.id, taskId: plan.taskId, details: { revision: plan.revision, planHash: plan.planHash, capabilityIds: plan.metrics.selectedCapabilityIds } });
    return saved;
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
    const lockKey = `execute:${planId}`;
    if (activePlanOperations.has(lockKey) || activePlanOperations.has(`revert:${planId}`)) {
      throw new Error(`[CAPABILITY_PLAN_CONCURRENT_OPERATION] O plano ${planId} já possui uma operação em andamento.`);
    }
    activePlanOperations.add(lockKey);
    try {
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
    athenaObservabilityJournal.record({
      category: "PLAN",
      type: `PLAN_${result.plan.status}`,
      status: result.plan.status === "COMPLETED" ? "COMPLETED" : result.plan.status === "BLOCKED" ? "BLOCKED" : result.plan.status === "FAILED" ? "FAILED" : "INFO",
      message: result.summary.message,
      planId: result.plan.id,
      taskId: result.plan.taskId,
      durationMs: result.plan.metrics.durationMs,
      details: { completedStepIds: result.summary.completedStepIds, failedStepIds: result.summary.failedStepIds, blockedStepIds: result.summary.blockedStepIds },
    });
    return result;
    } finally {
      activePlanOperations.delete(lockKey);
    }
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

  confirmStep(planId: string, stepId: string): CapabilityExecutionPlan {
    const plan = this.require(planId);
    if (plan.status !== "APPROVED") throw new Error(`[CAPABILITY_PLAN_NOT_APPROVED] ${plan.status}`);
    if (calculateCapabilityPlanHash(plan) !== plan.planHash || plan.approvedHash !== plan.planHash) {
      throw new Error("[CAPABILITY_PLAN_CONFIRMATION_STALE] O plano mudou após a aprovação.");
    }
    const step = plan.steps.find((candidate) => candidate.id === stepId);
    if (!step || !step.requiresConfirmation || step.capabilityKind !== "TOOL") {
      throw new Error(`[CAPABILITY_STEP_CONFIRMATION_NOT_REQUIRED] ${stepId}`);
    }
    if (step.confirmation) {
      throw new Error(`[CAPABILITY_STEP_ALREADY_CONFIRMED] ${stepId}`);
    }
    const confirmation = athenaToolManager.prepareConfirmation(
      step.capabilityId as import("../domain/action").ActionType,
      step.inputs,
      plan.revision
    );
    const now = new Date().toISOString();
    const confirmed = this.store.save({
      ...plan,
      updatedAt: now,
      steps: plan.steps.map((candidate) => candidate.id === stepId ? {
        ...candidate,
        confirmation: {
          token: confirmation.token,
          authorizationContextHash: confirmation.authorizationContextHash || "",
          confirmedPlanHash: plan.planHash,
          confirmedRevision: plan.revision,
          expiresAt: confirmation.expiresAt,
          confirmedAt: now,
        },
      } : candidate),
      events: [...plan.events, { id: `event-${Date.now()}-confirmation`, type: "STEP_CONFIRMED", message: `${step.name}: confirmação humana vinculada à revisão ${plan.revision}.`, timestamp: now, stepId }],
    });
    athenaObservabilityJournal.record({ category: "SECURITY", type: "STEP_CONFIRMED", status: "COMPLETED", message: `${step.name} confirmada para a revisão ${plan.revision}.`, planId, stepId, capabilityId: step.capabilityId, details: { confirmedPlanHash: plan.planHash, confirmedRevision: plan.revision, expiresAt: confirmation.expiresAt } });
    return confirmed;
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
      steps: plan.steps.map((candidate) => candidate.id === stepId ? { ...candidate, status: "PENDING", error: undefined, confirmation: undefined } : candidate),
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
    const lockKey = `revert:${planId}`;
    if (activePlanOperations.has(lockKey) || activePlanOperations.has(`execute:${planId}`)) {
      throw new Error(`[CAPABILITY_PLAN_CONCURRENT_OPERATION] O plano ${planId} já possui uma operação em andamento.`);
    }
    activePlanOperations.add(lockKey);
    try {
    let plan = this.require(planId);
    const reversible = [...plan.steps].reverse().filter((step) => step.status === "COMPLETED" && step.authority === "MUTATE_GOVERNED");
    if (reversible.some((step) => !step.supportsUndo)) {
      throw new Error("[CAPABILITY_PLAN_UNDO_UNAVAILABLE] Há mutações concluídas sem contrato de undo.");
    }
    for (const step of reversible) await undoStep(step);
    plan = capabilityPlanStateMachine.transition(plan, "REVERTED", "Mutações reversíveis desfeitas em ordem inversa.");
    plan.metrics = { ...plan.metrics, reversalCount: plan.metrics.reversalCount + 1 };
    const reverted = this.store.save(plan);
    athenaObservabilityJournal.record({ category: "PLAN", type: "PLAN_REVERTED", status: "REVERTED", message: "Mutações reversíveis restauradas em ordem inversa.", planId, taskId: plan.taskId, details: { stepIds: reversible.map((step) => step.id) } });
    return reverted;
    } finally {
      activePlanOperations.delete(lockKey);
    }
  }

  async revertWithRegisteredUndo(planId: string, storeContext: AthenaEngineContext): Promise<CapabilityExecutionPlan> {
    return this.revert(planId, async (step) => {
      if (step.capabilityKind !== "TOOL" || !step.mutationRecord) {
        throw new Error(`[CAPABILITY_PLAN_UNDO_UNAVAILABLE] ${step.id}`);
      }
      await athenaToolManager.undoTool(
        step.capabilityId as import("../domain/action").ActionType,
        step.inputs,
        step.mutationRecord.after as import("../domain/action").ActionResult,
        storeContext,
        step.mutationRecord.before
      );
      step.mutationRecord = { ...step.mutationRecord, revertedAt: new Date().toISOString() };
    });
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
