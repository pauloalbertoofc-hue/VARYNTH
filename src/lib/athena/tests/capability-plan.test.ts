import type { AthenaContext } from "../domain/context";
import type { AthenaTask } from "../domain/task";
import type { AthenaWorkflow } from "../domain/workflow";
import type { AthenaEngineContext } from "../engine";
import { capabilityPlanBuilder } from "../runtime/capability-plan-builder";
import { capabilityPlanExecutor } from "../runtime/capability-plan-executor";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const now = new Date().toISOString();
const task: AthenaTask = {
  id: "composed-task",
  title: "Composed plan",
  rawPrompt: "Prepare e valide a entrega",
  type: "GENERAL_DELIBERATION",
  priority: "media",
  status: "CREATED",
  scope: "geral",
  entities: {},
  createdAt: now,
  updatedAt: now,
};
const context: AthenaContext = {
  scope: "geral",
  relevantProjects: [], relevantTasks: [], relevantVaultItems: [], relevantChronosEvents: [],
  relevantTheses: [], relevantEvidences: [], relevantOpportunities: [], systemTime: now,
};
const store = {
  projects: [], tasks: [], vaultItems: [], chronosEvents: [], theses: [], evidences: [], opportunities: [],
  addTask: () => ({ id: "created", title: "created", status: "a_fazer", priority: "media", createdAt: now }),
  addNote: () => ({}),
} as unknown as AthenaEngineContext;

const workflow: AthenaWorkflow = {
  id: "composed-workflow",
  taskId: task.id,
  name: "Composed workflow",
  plannerId: "test",
  status: "PENDING",
  currentStepIndex: 0,
  createdAt: now,
  steps: [
    { id: "understand", name: "Understand", status: "PENDING" },
    { id: "validate", name: "Validate", dependencies: ["understand"], status: "PENDING" },
  ],
};

async function run(): Promise<void> {
const planned = capabilityPlanBuilder.build(task, workflow, context);
assert(planned.status === "PLANNED" && planned.steps.length === 2, "Workflow must become an inspectable plan");
assert(planned.steps[1].dependsOn[0] === "understand", "DAG dependency must be preserved");
const approved = capabilityPlanBuilder.approve(planned, "POLICY");
assert(approved.approvedHash === approved.planHash, "Approval must bind the exact plan hash");

const completed = await capabilityPlanExecutor.execute(approved, context, store);
assert(completed.summary.status === "COMPLETED", "Approved composed plan must execute through the workflow runtime");
assert(completed.summary.completedStepIds.length === 2, "Summary must name completed steps");

const tampered = {
  ...approved,
  steps: approved.steps.map((step, index) => index === 0 ? { ...step, name: "Tampered after approval" } : step),
};
const blocked = await capabilityPlanExecutor.execute(tampered, context, store);
assert(blocked.summary.status === "BLOCKED", "Post-approval mutation must fail anti-TOCTOU validation");

const cyclic: AthenaWorkflow = {
  ...workflow,
  id: "cyclic",
  steps: [
    { id: "a", name: "A", dependencies: ["b"], status: "PENDING" },
    { id: "b", name: "B", dependencies: ["a"], status: "PENDING" },
  ],
};
let cycleBlocked = false;
try {
  capabilityPlanBuilder.build(task, cyclic, context);
} catch (error) {
  cycleBlocked = String(error).includes("CAPABILITY_PLAN_CYCLE");
}
assert(cycleBlocked, "Cyclic capability plan must be rejected");

const toolWorkflow: AthenaWorkflow = {
  ...workflow,
  id: "tool-workflow",
  steps: [{
    id: "create-task",
    name: "Create task",
    toolCall: { toolName: "tasks.create", params: { title: "Validated input" } },
    status: "PENDING",
  }],
};
const toolPlan = capabilityPlanBuilder.build({ ...task, type: "ACTION_FAST" }, toolWorkflow, context);
assert(toolPlan.steps[0].capabilityId === "tasks.create", "Tool capability must be fixed in the plan");
assert(toolPlan.steps[0].authority === "MUTATE_GOVERNED", "Mutation authority must be explicit");

console.log("✓ Composed capability plans, DAG, approval hash, execution summary and anti-TOCTOU verified");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
