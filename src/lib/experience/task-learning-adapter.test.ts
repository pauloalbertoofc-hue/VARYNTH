import assert from "node:assert/strict";
import { experienceEventRepository } from "@/lib/persistence/repositories";
import { extractSignal } from "./signals";
import { recordTaskExperience } from "./task-learning-adapter";

async function main() {
  await experienceEventRepository.clear();
  const task = { id: "task-123", projectId: "project-1", status: "a_fazer" as const, priority: "alta" as const };
  const created = await recordTaskExperience({ task, signal: "TASK_CREATED", actorType: "user" });
  assert.equal(created.moduleId, "chronos");
  assert.equal(created.domain, "productivity");
  assert.equal(created.projectId, "project-1");
  assert.equal(created.targetId, task.id);
  assert.equal(created.learningEligible, true);
  assert.equal(extractSignal(created)?.kind, "DIRECT_EDIT");
  assert.deepEqual(created.after, { status: "a_fazer", priority: "alta" });
  assert.equal(JSON.stringify(created).includes("title"), false, "task title and description must not be retained");

  const completion = await recordTaskExperience({
    task: { ...task, status: "concluida" }, actorType: "user", signal: "TASK_STATUS_CHANGED", before: { status: "a_fazer" },
  });
  assert.deepEqual(completion.before, { status: "a_fazer" });
  assert.deepEqual(completion.after, { status: "concluida", priority: "alta" });
  assert.equal(completion.correlationId, created.correlationId, "task lifecycle actions should remain correlatable");
  assert.equal(extractSignal(completion)?.eligible, true);

  const agentAction = await recordTaskExperience({ task, actorType: "athena", signal: "TASK_CREATED" });
  assert.equal(agentAction.actor, "AGENT");
  assert.equal(agentAction.agentId, "athena");
  assert.equal(agentAction.learningEligible, false, "agent-created task evidence must not train user preferences");
  assert.equal(extractSignal(agentAction)?.eligible, false);

  const systemAction = await recordTaskExperience({ task, actorType: "system", signal: "TASK_STATUS_CHANGED" });
  assert.equal(systemAction.actor, "SYSTEM");
  assert.equal(systemAction.learningEligible, false);
  console.log("Task lifecycle Experience signals preserve project scope, correlation, data minimization, and actor eligibility.");
}

void main().catch((error) => { console.error(error); process.exitCode = 1; });
