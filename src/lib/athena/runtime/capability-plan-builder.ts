import type { AthenaContext } from "../domain/context";
import type { AthenaTask } from "../domain/task";
import type { AthenaWorkflow } from "../domain/workflow";
import type { CapabilityExecutionPlan, CapabilityPlanStep } from "../domain/capability-plan";
import { athenaCapabilitySelector } from "../kernel/capability-selector";

function hash(value: unknown): string {
  const raw = JSON.stringify(value);
  let result = 2166136261;
  for (let index = 0; index < raw.length; index += 1) {
    result ^= raw.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return `cap-plan-${(result >>> 0).toString(16)}`;
}

export function calculateCapabilityPlanHash(
  plan: Pick<CapabilityExecutionPlan, "taskId" | "objective" | "revision" | "steps">
): string {
  return hash({
    taskId: plan.taskId,
    objective: plan.objective,
    revision: plan.revision,
    steps: plan.steps.map(({ status: _status, result: _result, error: _error, ...step }) => step),
  });
}

function assertDag(steps: CapabilityPlanStep[]): void {
  const ids = new Set(steps.map((step) => step.id));
  const state = new Map<string, "VISITING" | "VISITED">();
  const byId = new Map(steps.map((step) => [step.id, step]));

  const visit = (id: string, path: string[]): void => {
    if (!ids.has(id)) throw new Error(`[CAPABILITY_PLAN_MISSING_DEPENDENCY] ${id}`);
    if (state.get(id) === "VISITING") {
      throw new Error(`[CAPABILITY_PLAN_CYCLE] ${[...path, id].join(" -> ")}`);
    }
    if (state.get(id) === "VISITED") return;
    state.set(id, "VISITING");
    for (const dependency of byId.get(id)?.dependsOn || []) visit(dependency, [...path, id]);
    state.set(id, "VISITED");
  };

  for (const step of steps) visit(step.id, []);
}

export class CapabilityPlanBuilder {
  build(task: AthenaTask, workflow: AthenaWorkflow, context: AthenaContext): CapabilityExecutionPlan {
    const steps = workflow.steps.map<CapabilityPlanStep>((step) => {
      if (step.toolCall) {
        const selection = athenaCapabilitySelector.select({
          kind: "TOOL",
          actionType: step.toolCall.toolName as import("../domain/action").ActionType,
        });
        if (selection.status !== "SELECTED" || !selection.selected) {
          throw new Error(`[CAPABILITY_PLAN_${selection.status}] ${selection.reason}`);
        }
        const capability = selection.selected;
        const missingInput = capability.requiredInputs.find((input) => {
          const value = step.toolCall?.params[input];
          return value === undefined || value === null || value === "";
        });
        if (missingInput) throw new Error(`[CAPABILITY_PLAN_INPUT_REQUIRED] ${step.id}.${missingInput}`);
        return {
          id: step.id,
          name: step.name,
          capabilityId: capability.id,
          capabilityKind: "TOOL",
          inputs: { ...step.toolCall.params },
          expectedResult: `Successful ${capability.id} result`,
          dependsOn: [...(step.dependencies || [])],
          risk: capability.requiresConfirmation ? "HIGH" : capability.mutatesData ? "MEDIUM" : "LOW",
          authority: capability.authority,
          requiresConfirmation: capability.requiresConfirmation,
          supportsUndo: capability.supportsUndo,
          failurePolicy: "STOP_DEPENDENTS",
          status: "PENDING",
        };
      }

      if (step.assignedAgentId) {
        const selection = athenaCapabilitySelector.select({
          kind: "AGENT", task, context, preferredCapabilityId: step.assignedAgentId,
        });
        if (selection.status !== "SELECTED" || !selection.selected) {
          throw new Error(`[CAPABILITY_PLAN_${selection.status}] ${selection.reason}`);
        }
        return {
          id: step.id,
          name: step.name,
          capabilityId: selection.selected.id,
          capabilityKind: "AGENT",
          inputs: { taskId: task.id },
          expectedResult: `Contribution from ${selection.selected.name}`,
          dependsOn: [...(step.dependencies || [])],
          risk: "LOW",
          authority: "PROPOSE",
          requiresConfirmation: false,
          supportsUndo: false,
          failurePolicy: "CONTINUE_INDEPENDENT",
          status: "PENDING",
        };
      }

      return {
        id: step.id,
        name: step.name,
        capabilityId: "athena-core",
        capabilityKind: "CORE",
        inputs: { taskId: task.id },
        expectedResult: "Deterministic core processing",
        dependsOn: [...(step.dependencies || [])],
        risk: "LOW",
        authority: "READ_ONLY",
        requiresConfirmation: false,
        supportsUndo: false,
        failurePolicy: "STOP_DEPENDENTS",
        status: "PENDING",
      };
    });

    assertDag(steps);
    const now = new Date().toISOString();
    const plan: CapabilityExecutionPlan = {
      id: `cap-plan-${task.id}`,
      taskId: task.id,
      objective: task.rawPrompt,
      revision: 1,
      planHash: "",
      status: "PLANNED",
      steps,
      sourceTask: task,
      sourceWorkflow: workflow,
      createdAt: now,
      updatedAt: now,
      events: [{ id: `event-${Date.now()}-planned`, type: "PLANNED", message: "Plano composto criado e validado.", timestamp: now }],
      metrics: {
        routedAt: now,
        selectedCapabilityIds: [...new Set(steps.map((step) => step.capabilityId))],
        confirmationCount: steps.filter((step) => step.requiresConfirmation).length,
        failureCount: 0,
        blockedCount: 0,
        retryCount: 0,
        reversalCount: 0,
      },
    };
    plan.planHash = calculateCapabilityPlanHash(plan);
    return plan;
  }

  approve(plan: CapabilityExecutionPlan, mode: "POLICY" | "HUMAN" = "POLICY"): CapabilityExecutionPlan {
    if (plan.status !== "PLANNED") throw new Error(`[CAPABILITY_PLAN_NOT_PLANNED] ${plan.status}`);
    const now = new Date().toISOString();
    return {
      ...plan,
      approvedHash: plan.planHash,
      approvalMode: mode,
      status: "APPROVED",
      updatedAt: now,
      events: [...plan.events, { id: `event-${Date.now()}-approved`, type: "APPROVED", message: `Envelope aprovado por ${mode}.`, timestamp: now }],
    };
  }
}

export const capabilityPlanBuilder = new CapabilityPlanBuilder();
