import assert from "node:assert/strict";
import { experienceEventRepository } from "@/lib/persistence/repositories";
import { recordProjectCreated } from "./project-learning-adapter";
import { extractSignal } from "./signals";

async function run() {
  await experienceEventRepository.clear();
  const event = await recordProjectCreated({ projectId: "project-privacy-test", category: "software", correlationId: "create-flow-1" });
  assert.equal(event.actionType, "PROJECT_CREATED");
  assert.equal(event.projectId, "project-privacy-test");
  assert.equal(event.metadata.category, "software");
  assert.equal(event.correlationId, "create-flow-1");
  assert.equal(extractSignal(event)?.eligible, true);
  assert.equal(JSON.stringify(event).includes("private project title"), false);

  const agentEvent = await recordProjectCreated({ projectId: "agent-project", category: "research", actor: "AGENT" });
  assert.equal(agentEvent.learningEligible, false, "agent-originated project creation cannot be primary user evidence");
  assert.equal(extractSignal(agentEvent)?.eligible, false);
  assert.equal(await experienceEventRepository.getById(event.id) !== undefined, true);
  console.log("Project creation Experience adapter validates provenance, privacy-minimal payload, and agent exclusion.");
}

run().catch((error) => { console.error(error); process.exitCode = 1; });
