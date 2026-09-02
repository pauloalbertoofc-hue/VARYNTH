import type { AthenaContext } from "../domain/context";
import type { CapabilityExecutionPlan, CapabilityPlanExecutionSummary } from "../domain/capability-plan";
import type { AthenaEngineContext } from "../engine";
import { executableCapabilityRegistry } from "../kernel/executable-capability-registry";
import { athenaWorkflowExecutor, WorkflowExecutionResult } from "./workflow-executor";
import { calculateCapabilityPlanHash } from "./capability-plan-builder";

export interface CapabilityPlanExecutionResult {
  plan: CapabilityExecutionPlan;
  workflowResult?: WorkflowExecutionResult;
  summary: CapabilityPlanExecutionSummary;
}

export interface CapabilityPlanExecutorOptions {
  onCheckpoint?: (plan: CapabilityExecutionPlan) => void | Promise<void>;
  shouldContinue?: (planId: string) => boolean | Promise<boolean>;
}

export class CapabilityPlanExecutor {
  async execute(
    original: CapabilityExecutionPlan,
    context: AthenaContext,
    storeContext: AthenaEngineContext,
    options: CapabilityPlanExecutorOptions = {}
  ): Promise<CapabilityPlanExecutionResult> {
    const currentHash = calculateCapabilityPlanHash(original);
    if (
      original.status !== "APPROVED" ||
      original.approvedHash !== original.planHash ||
      currentHash !== original.planHash
    ) {
      return { plan: { ...original, status: "BLOCKED" }, summary: this.summary("BLOCKED", [], [], original.steps.map((step) => step.id), [], "Plano não aprovado ou alterado após aprovação.") };
    }

    for (const step of original.steps) {
      if (step.capabilityKind !== "CORE" && !executableCapabilityRegistry.get(step.capabilityId)?.enabled) {
        return { plan: { ...original, status: "BLOCKED" }, summary: this.summary("BLOCKED", [], [], [step.id], [], `Capacidade ${step.capabilityId} indisponível na revalidação.`) };
      }
    }

    const startedAt = new Date().toISOString();
    let plan: CapabilityExecutionPlan = {
      ...original,
      status: "EXECUTING",
      updatedAt: startedAt,
      metrics: { ...original.metrics, startedAt },
      events: [...original.events, { id: `event-${Date.now()}-started`, type: "EXECUTING", message: "Execução iniciada.", timestamp: startedAt }],
    };
    await options.onCheckpoint?.(plan);
    const workflowResult = await athenaWorkflowExecutor.execute(
      plan.sourceWorkflow,
      plan.sourceTask,
      context,
      storeContext,
      {
        beforeStep: () => options.shouldContinue ? options.shouldContinue(plan.id) : true,
        onStepSettled: async (workflowStep, snapshot) => {
          const status = workflowStep.status === "COMPLETED" ? "COMPLETED" as const : "FAILED" as const;
          plan = {
            ...plan,
            sourceWorkflow: { ...plan.sourceWorkflow, steps: [...plan.sourceWorkflow.steps] },
            steps: plan.steps.map((step) => step.id === workflowStep.id
              ? { ...step, status, result: workflowStep.result, error: workflowStep.error }
              : step),
            checkpoint: {
              completedStepIds: plan.sourceWorkflow.steps.filter((step) => step.status === "COMPLETED").map((step) => step.id),
              results: { ...snapshot.stepResults },
              savedAt: new Date().toISOString(),
            },
            updatedAt: new Date().toISOString(),
            events: [...plan.events, {
              id: `event-${Date.now()}-${workflowStep.id}`,
              type: status === "COMPLETED" ? "STEP_COMPLETED" : "STEP_FAILED",
              message: `${workflowStep.name}: ${status}`,
              timestamp: new Date().toISOString(),
              stepId: workflowStep.id,
            }],
          };
          await options.onCheckpoint?.(plan);
        },
      }
    );
    const steps = plan.steps.map((step) => {
      const source = plan.sourceWorkflow.steps.find((candidate) => candidate.id === step.id);
      return { ...step, status: source?.status === "COMPLETED" ? "COMPLETED" as const : source?.status === "FAILED" ? "FAILED" as const : "SKIPPED" as const, result: source?.result, error: source?.error };
    });
    const completed = steps.filter((step) => step.status === "COMPLETED").map((step) => step.id);
    const failed = steps.filter((step) => step.status === "FAILED").map((step) => step.id);
    const skipped = steps.filter((step) => step.status === "SKIPPED").map((step) => step.id);
    const controlled = workflowResult.error === "EXECUTION_INTERRUPTED_BY_CONTROL";
    const status = controlled ? "INTERRUPTED" : failed.length === 0 ? "COMPLETED" : completed.length > 0 ? "PARTIAL" : "FAILED";
    const summaryStatus: CapabilityPlanExecutionSummary["status"] = controlled
      ? "BLOCKED"
      : status === "COMPLETED" ? "COMPLETED"
      : status === "PARTIAL" ? "PARTIAL"
      : "FAILED";
    const finishedAt = new Date().toISOString();
    return {
      plan: {
        ...plan,
        steps,
        status,
        completedAt: controlled ? undefined : finishedAt,
        updatedAt: finishedAt,
        metrics: {
          ...plan.metrics,
          durationMs: Date.parse(finishedAt) - Date.parse(startedAt),
          failureCount: plan.metrics.failureCount + failed.length,
          blockedCount: plan.metrics.blockedCount + (controlled ? 1 : 0),
        },
      },
      workflowResult,
      summary: this.summary(
        summaryStatus,
        completed, failed, controlled ? skipped : [], skipped,
        controlled ? "Execução interrompida por pausa ou cancelamento persistido." :
        status === "COMPLETED" ? "Todas as etapas foram concluídas." :
        status === "PARTIAL" ? "Etapas independentes concluídas; há falhas explícitas." :
        "A execução falhou sem conclusão útil."
      ),
    };
  }

  private summary(
    status: CapabilityPlanExecutionSummary["status"], completedStepIds: string[], failedStepIds: string[],
    blockedStepIds: string[], skippedStepIds: string[], message: string
  ): CapabilityPlanExecutionSummary {
    return { status, completedStepIds, failedStepIds, blockedStepIds, skippedStepIds, message };
  }
}

export const capabilityPlanExecutor = new CapabilityPlanExecutor();
