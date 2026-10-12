import assert from "node:assert/strict";
import { experienceEventRepository } from "@/lib/persistence/repositories";
import { recordCapabilityPlanFeedback } from "./capability-plan-feedback";

async function run() {
  await experienceEventRepository.clear();
  const useful = await recordCapabilityPlanFeedback({
    planId: "plan-1", projectId: "project-1", sessionId: "session-1", revision: 2, status: "COMPLETED", helpful: true,
  });
  assert.equal(useful.actor, "USER");
  assert.equal(useful.learningEligible, true);
  assert.equal(useful.actionType, "FEEDBACK_SUBMITTED");
  assert.equal(useful.targetType, "ATHENA_CAPABILITY_PLAN");
  assert.equal(useful.targetId, "plan-1");
  assert.equal(useful.moduleId, "athena");
  assert.equal(useful.projectId, "project-1");
  assert.equal(useful.sessionId, "session-1");
  assert.deepEqual(useful.metadata.context, { feedbackSurface: "capability-plan", planRevision: 2, planStatus: "COMPLETED" });
  assert.equal(useful.metadata.preferenceSignal, undefined, "plan feedback is evidence and must not become an automatic preference");
  assert.equal(useful.metadata.reason, undefined);

  const corrected = await recordCapabilityPlanFeedback({
    planId: "plan-2", revision: 1, status: "BLOCKED", helpful: false, correction: `${"x".repeat(510)}`,
  });
  assert.equal(corrected.metadata.feedbackType, "CORRECTION");
  assert.equal(String(corrected.metadata.reason).length, 500);
  assert.equal(corrected.privacyScope, "USER_SHARED");
  assert.equal(JSON.stringify(corrected).includes("objective"), false);
  assert.throws(() => recordCapabilityPlanFeedback({ planId: " ", revision: 1, status: "PLANNED", helpful: true }));
  assert.throws(() => recordCapabilityPlanFeedback({ planId: "plan-3", revision: 0, status: "PLANNED", helpful: true }));
  console.log("Capability-plan feedback is owner-scoped, privacy-minimal, revision-aware, and never promotes a preference automatically.");
}

void run().catch((error) => { console.error(error); process.exitCode = 1; });
