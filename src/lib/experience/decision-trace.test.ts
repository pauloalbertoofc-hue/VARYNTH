import assert from "node:assert/strict";
import { experienceEventRepository } from "@/lib/persistence/repositories";
import { MAX_DECISION_TRACES_PER_OWNER, recordExperienceDecisionTrace } from "./decision-trace";
import { extractSignal } from "./signals";
import type { AgentExperienceTrace } from "@/lib/athena/domain/result";

async function run() {
  await experienceEventRepository.clear();
  const trace: AgentExperienceTrace = {
    agentId: "musa",
    retrievedPreferenceIds: ["preference-1", "preference-1", ""],
    retrievedExperienceIds: ["experience-1"],
    experienceIdsReferencedInResponse: ["experience-1"],
    evidenceEventIdsReferencedInResponse: ["event-1"],
    instructionPrecedence: "CURRENT_INSTRUCTION_OVERRIDES_PERSONALIZATION",
  };
  const input = { ownerId: "trace-owner", taskId: "trace-task", agentId: "musa", domain: "creative", projectId: "project-1", sessionId: "session-1", trace };
  assert.equal(await recordExperienceDecisionTrace(input), true);
  assert.equal(await recordExperienceDecisionTrace(input), true, "Retry must be idempotent");
  const events = await experienceEventRepository.getAll((event) => event.ownerId === "trace-owner");
  assert.equal(events.length, 1);
  const event = events[0];
  assert.equal(event.actionType, "EXPERIENCE_CONTEXT_RETRIEVED");
  assert.equal(event.actor, "AGENT");
  assert.equal(event.learningEligible, false);
  assert.equal(event.privacyScope, "AGENT_PRIVATE");
  assert.deepEqual(event.metadata.retrievedPreferenceIds, ["preference-1"]);
  assert.deepEqual(event.metadata.experienceIdsReferencedInResponse, ["experience-1"]);
  assert.equal(extractSignal(event), null, "Retrieval telemetry must not become preference evidence");
  assert.equal(JSON.stringify(event).includes("Resposta revisada"), false, "Trace stores no response or prompt text");

  assert.equal(await recordExperienceDecisionTrace({ ...input, taskId: "disabled", trace: { ...trace, retrievedPreferenceIds: [], retrievedExperienceIds: [] } }), false);
  assert.equal(await recordExperienceDecisionTrace(input, { enabled: false, preferenceInferenceEnabled: true, projectRetrospectivesEnabled: true }), false);
  assert.equal(await recordExperienceDecisionTrace({ ...input, taskId: "wrong-agent", trace: { ...trace, agentId: "logos" } }), false);
  assert.equal((await experienceEventRepository.getAll((event) => event.ownerId === "trace-owner")).length, 1);

  for (let index = 0; index <= MAX_DECISION_TRACES_PER_OWNER; index += 1) {
    await recordExperienceDecisionTrace({ ...input, taskId: `bounded-${index}` });
  }
  const bounded = await experienceEventRepository.getAll((event) => event.ownerId === "trace-owner" && event.actionType === "EXPERIENCE_CONTEXT_RETRIEVED");
  assert.equal(bounded.length, MAX_DECISION_TRACES_PER_OWNER, "Per-owner inspection traces must have a bounded local retention");
  console.log("Experience decision traces are private, ID-only, idempotent, non-learning, and feature-gated.");
}

run().catch((error) => { console.error(error); process.exitCode = 1; });
