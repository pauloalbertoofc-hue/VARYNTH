import assert from "node:assert/strict";
import { experienceEventRepository } from "@/lib/persistence/repositories";
import { recordStudioResultFeedback } from "./studio-result-feedback";

async function run() {
  await experienceEventRepository.clear();
  const helpful = await recordStudioResultFeedback({ artifactId: "saved-image-1", moduleId: "image", projectId: "project-1", helpful: true });
  assert.equal(helpful.actionType, "FEEDBACK_SUBMITTED");
  assert.equal(helpful.targetType, "STUDIO_ARTIFACT");
  assert.equal(helpful.targetId, "saved-image-1");
  assert.equal(helpful.moduleId, "image");
  assert.equal(helpful.projectId, "project-1");
  assert.equal(helpful.metadata.feedbackType, "LIKE");
  assert.equal(helpful.agentId, undefined, "Studio feedback must not invent an Athena attribution");
  assert.equal(helpful.privacyScope, "PROJECT_SHARED");

  const correction = await recordStudioResultFeedback({
    artifactId: "athena-document-2", moduleId: "document", createdByAthena: true, helpful: false,
    correction: "Preserve a tese e separe os argumentos ainda sem fonte.",
  });
  assert.equal(correction.metadata.feedbackType, "CORRECTION");
  assert.equal(correction.metadata.reason, "Preserve a tese e separe os argumentos ainda sem fonte.");
  assert.equal(correction.agentId, "athena");
  assert.equal(correction.metadata.prompt, undefined);
  assert.equal(correction.metadata.response, undefined);
  assert.equal(JSON.stringify(correction).includes("document-content"), false);
  console.log("Studio result feedback records account-scoped artifact provenance without copying artifact contents.");
}

run().catch((error) => { console.error(error); process.exitCode = 1; });
