import type { AthenaContext } from "../domain/context";
import type { CapabilityExecutionPlan, CapabilityPlanExecutionSummary } from "../domain/capability-plan";
import type { AthenaEngineContext } from "../engine";
import { executableCapabilityRegistry } from "../kernel/executable-capability-registry";
import { athenaWorkflowExecutor, WorkflowExecutionResult } from "./workflow-executor";

export interface CapabilityPlanExecutionResult {
  plan: CapabilityExecutionPlan;
  workflowResult?: WorkflowExecutionResult;
  summary: CapabilityPlanExecutionSummary;
}

export class CapabilityPlanExecutor {
  async execute(
    original: CapabilityExecutionPlan,
    context: AthenaContext,
    storeContext: AthenaEngineContext
  ): Promise<CapabilityPlanExecutionResult> {
    if (original.status !== "APPROVED" || original.approvedHash !== original.planHash) {
      return { plan: { ...original, status: "BLOCKED" }, summary: this.summary("BLOCKED", [], [], original.steps.map((step) => step.id), [], "Plano não aprovado ou alterado após aprovação.") };
    }

    for (const step of original.steps) {
      if (step.capabilityKind !== "CORE" && !executableCapabilityRegistry.get(step.capabilityId)?.enabled) {
        return { plan: { ...original, status: "BLOCKED" }, summary: this.summary("BLOCKED", [], [], [step.id], [], `Capacidade ${step.capabilityId} indisponível na revalidação.`) };
      }
    }

    const plan: CapabilityExecutionPlan = { ...original, status: "EXECUTING", updatedAt: new Date().toISOString() };
    const workflowResult = await athenaWorkflowExecutor.execute(plan.sourceWorkflow, plan.sourceTask, context, storeContext);
    const steps = plan.steps.map((step) => {
      const source = plan.sourceWorkflow.steps.find((candidate) => candidate.id === step.id);
      return { ...step, status: source?.status === "COMPLETED" ? "COMPLETED" as const : source?.status === "FAILED" ? "FAILED" as const : "SKIPPED" as const, result: source?.result, error: source?.error };
    });
    const completed = steps.filter((step) => step.status === "COMPLETED").map((step) => step.id);
    const failed = steps.filter((step) => step.status === "FAILED").map((step) => step.id);
    const skipped = steps.filter((step) => step.status === "SKIPPED").map((step) => step.id);
    const status = failed.length === 0 ? "COMPLETED" : completed.length > 0 ? "PARTIAL" : "FAILED";
    return {
      plan: { ...plan, steps, status, completedAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      workflowResult,
      summary: this.summary(status, completed, failed, [], skipped, status === "COMPLETED" ? "Todas as etapas foram concluídas." : status === "PARTIAL" ? "Etapas independentes concluídas; há falhas explícitas." : "A execução falhou sem conclusão útil."),
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

