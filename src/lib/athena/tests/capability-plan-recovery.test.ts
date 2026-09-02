import type { AthenaContext } from "../domain/context";
import type { AthenaTask } from "../domain/task";
import type { AthenaWorkflow } from "../domain/workflow";
import type { AthenaEngineContext } from "../engine";
import { capabilityPlanBuilder } from "../runtime/capability-plan-builder";
import { CapabilityPlanRuntime } from "../runtime/capability-plan-runtime";
import { CapabilityPlanStore } from "../runtime/capability-plan-store";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const now = new Date().toISOString();
const task: AthenaTask = {
  id: "recovery-task", title: "Recovery", rawPrompt: "Executar plano recuperável", type: "ACTION_FAST",
  priority: "media", status: "CREATED", scope: "geral", entities: {}, createdAt: now, updatedAt: now,
};
const context: AthenaContext = {
  scope: "geral", relevantProjects: [], relevantTasks: [], relevantVaultItems: [], relevantChronosEvents: [],
  relevantTheses: [], relevantEvidences: [], relevantOpportunities: [], systemTime: now,
};
let mutations = 0;
const engineContext = {
  projects: [], tasks: [], vaultItems: [], chronosEvents: [], theses: [], evidences: [], opportunities: [],
  addTask: () => { mutations += 1; return { id: "created", title: "Recovered", status: "a_fazer", priority: "media", createdAt: now }; },
  addNote: () => ({}),
} as unknown as AthenaEngineContext;

async function run(): Promise<void> {
  const store = new CapabilityPlanStore();
  store.clear();
  const runtime = new CapabilityPlanRuntime(store);
  const workflow: AthenaWorkflow = {
    id: "recovery-workflow", taskId: task.id, name: "Recovery", plannerId: "test", status: "PENDING",
    currentStepIndex: 0, createdAt: now,
    steps: [{ id: "mutate", name: "Create", toolCall: { toolName: "tasks.create", params: { title: "Recovered" } }, status: "PENDING" }],
  };
  const approved = capabilityPlanBuilder.approve(capabilityPlanBuilder.build(task, workflow, context));
  runtime.register(approved);

  store.save({ ...approved, status: "EXECUTING" });
  const recovered = runtime.recoverInterruptedPlans();
  assert(recovered[0]?.status === "INTERRUPTED", "Startup recovery must mark running plan as interrupted");
  const resumed = runtime.resume(approved.id);
  assert(resumed.status === "APPROVED", "Reconciled interrupted plan must return to approved state");

  const firstExecution = await runtime.execute(approved.id, context, engineContext);
  assert(firstExecution.plan.status === "COMPLETED" && mutations === 1, "First execution must commit exactly once");
  assert(firstExecution.plan.checkpoint?.completedStepIds.includes("mutate"), "Completed step must be checkpointed");

  const interruptedAfterCommit = {
    ...firstExecution.plan,
    status: "INTERRUPTED" as const,
    completedAt: undefined,
  };
  store.save(interruptedAfterCommit);
  runtime.resume(approved.id);
  const resumedExecution = await runtime.execute(approved.id, context, engineContext);
  assert(resumedExecution.plan.status === "COMPLETED", "Resume after committed checkpoint must finish");
  assert(mutations === 1, "Committed mutation must not execute twice after resume");

  const diagnostic = runtime.diagnose(approved.id);
  assert(diagnostic.progress === 100 && diagnostic.completed === 1, "Diagnostic must expose truthful progress");
  assert(diagnostic.metrics.selectedCapabilityIds.includes("tasks.create"), "Diagnostic must expose selected capability");

  const pausableWorkflow: AthenaWorkflow = {
    ...workflow,
    id: "pausable-workflow",
    steps: [
      { id: "p1", name: "First", status: "PENDING" },
      { id: "p2", name: "Second", dependencies: ["p1"], status: "PENDING" },
    ],
  };
  const pausable = capabilityPlanBuilder.approve(
    capabilityPlanBuilder.build({ ...task, id: "pause-task" }, pausableWorkflow, context)
  );
  runtime.register(pausable);
  const runningPause = runtime.execute(pausable.id, context, engineContext);
  runtime.pause(pausable.id);
  await runningPause;
  assert(store.get(pausable.id)?.status === "PAUSED", "Pause must prevent the next step and remain persisted");
  assert(runtime.resume(pausable.id).status === "APPROVED", "Paused plan must reconcile before resume");

  const stale = { ...resumedExecution.plan, status: "INTERRUPTED" as const, objective: "tampered" };
  store.save(stale);
  assert(!runtime.reconcile(stale).valid, "Stale persisted plan must fail reconciliation");

  const retryPlan = {
    ...approved,
    status: "FAILED" as const,
    steps: approved.steps.map((step) => ({ ...step, status: "FAILED" as const, error: "recoverable" })),
    sourceWorkflow: { ...approved.sourceWorkflow, status: "FAILED" as const, steps: approved.sourceWorkflow.steps.map((step) => ({ ...step, status: "FAILED" as const, error: "recoverable" })) },
  };
  store.save(retryPlan);
  const retried = runtime.retryStep(approved.id, "mutate");
  assert(retried.steps[0].status === "PENDING" && retried.metrics.retryCount === 1, "Retry must reset only the requested step");

  const reversibleWorkflow: AthenaWorkflow = {
    ...workflow,
    id: "reversible",
    steps: [{ id: "trash", name: "Trash", toolCall: { toolName: "trash.moveWithUndo", params: { title: "X", entityType: "task" } }, status: "COMPLETED", result: { success: true } }],
  };
  const reversible = capabilityPlanBuilder.approve(capabilityPlanBuilder.build({ ...task, id: "revert-task" }, reversibleWorkflow, context));
  const completedReversible = { ...reversible, status: "COMPLETED" as const, steps: reversible.steps.map((step) => ({ ...step, status: "COMPLETED" as const })) };
  runtime.register(completedReversible);
  let undoCalls = 0;
  const reverted = await runtime.revert(completedReversible.id, async () => { undoCalls += 1; });
  assert(reverted.status === "REVERTED" && undoCalls === 1, "Revert must invoke explicit undo in reverse mutation order");

  console.log("✓ Durable plans, crash recovery, reconciliation, idempotent resume, retry, diagnostics and undo verified");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
