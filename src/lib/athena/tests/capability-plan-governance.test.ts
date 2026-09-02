import type { AthenaContext } from "../domain/context";
import type { AthenaTask } from "../domain/task";
import type { AthenaWorkflow } from "../domain/workflow";
import type { AthenaEngineContext } from "../engine";
import { athenaToolManager } from "../tools/tool-manager";
import { capabilityPlanBuilder } from "../runtime/capability-plan-builder";
import { capabilityPlanExecutor } from "../runtime/capability-plan-executor";
import { CapabilityPlanRuntime } from "../runtime/capability-plan-runtime";
import { CapabilityPlanStore } from "../runtime/capability-plan-store";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const now = new Date().toISOString();
const task: AthenaTask = {
  id: "governance-task", title: "Governance", rawPrompt: "Executar alteração governada",
  type: "ACTION_FAST", priority: "media", status: "CREATED", scope: "geral",
  entities: {}, createdAt: now, updatedAt: now,
};
const context: AthenaContext = {
  scope: "geral", relevantProjects: [], relevantTasks: [], relevantVaultItems: [],
  relevantChronosEvents: [], relevantTheses: [], relevantEvidences: [],
  relevantOpportunities: [], systemTime: now,
};

async function run(): Promise<void> {
  let created = 0;
  let removed = 0;
  const engineContext = {
    projects: [], tasks: [], vaultItems: [], chronosEvents: [], theses: [], evidences: [], opportunities: [],
    addTask: () => { created += 1; return { id: "task-created", title: "Criada", status: "a_fazer", priority: "media", createdAt: now }; },
    deleteTask: () => { removed += 1; },
    addNote: () => ({}),
  } as unknown as AthenaEngineContext;

  const sensitiveWorkflow: AthenaWorkflow = {
    id: "sensitive-workflow", taskId: task.id, name: "Sensitive", plannerId: "test",
    status: "PENDING", currentStepIndex: 0, createdAt: now,
    steps: [{ id: "update", name: "Atualizar tarefa", status: "PENDING", toolCall: { toolName: "tasks.update", params: { taskId: "task-1", title: "Novo título" } } }],
  };
  const sensitive = capabilityPlanBuilder.approve(capabilityPlanBuilder.build(task, sensitiveWorkflow, context), "HUMAN");
  assert(sensitive.steps[0].risk === "HIGH" && sensitive.steps[0].requiresConfirmation, "Sensitive mutation must be classified as high risk and require confirmation");
  const blocked = await capabilityPlanExecutor.execute(sensitive, context, engineContext);
  assert(blocked.summary.status === "BLOCKED", "Sensitive mutation must fail closed without a confirmation receipt");

  const store = new CapabilityPlanStore();
  store.clear();
  const runtime = new CapabilityPlanRuntime(store);
  runtime.register(sensitive);
  const confirmed = runtime.confirmStep(sensitive.id, "update");
  assert(confirmed.steps[0].confirmation?.confirmedPlanHash === sensitive.planHash, "Confirmation must bind the approved plan hash");
  const executed = await runtime.execute(sensitive.id, context, engineContext);
  assert(executed.plan.status === "COMPLETED", "Confirmed sensitive mutation must execute");
  const token = confirmed.steps[0].confirmation?.token || "";
  const replay = await athenaToolManager.executeTool("tasks.update", { taskId: "task-1", title: "Novo título", confirmationToken: token }, engineContext);
  assert(!replay.success && replay.error?.includes("já utilizado"), "Confirmation token must be single-use");

  const createWorkflow: AthenaWorkflow = {
    ...sensitiveWorkflow,
    id: "reversible-workflow",
    steps: [{ id: "create", name: "Criar tarefa", status: "PENDING", toolCall: { toolName: "tasks.create", params: { title: "Criada" } } }],
  };
  const reversible = capabilityPlanBuilder.approve(capabilityPlanBuilder.build({ ...task, id: "reversible-task" }, createWorkflow, context), "HUMAN");
  runtime.register(reversible);
  const createdResult = await runtime.execute(reversible.id, context, engineContext);
  assert(createdResult.plan.steps[0].mutationRecord?.after && created === 1, "Mutation must record before/after state");
  const reverted = await runtime.revertWithRegisteredUndo(reversible.id, engineContext);
  assert(reverted.status === "REVERTED" && removed === 1, "Registered concrete undo must restore in reverse order");

  const stale = { ...confirmed, objective: "Objetivo alterado depois da confirmação" };
  assert(!runtime.reconcile(stale).valid, "Changed plan must invalidate approval and confirmation through anti-TOCTOU reconciliation");
  console.log("✓ Risk policy, scoped confirmation, single-use authorization, mutation journal and concrete undo verified");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
