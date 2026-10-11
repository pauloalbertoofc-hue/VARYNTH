import assert from "node:assert/strict";
import {
  experienceEventRepository,
  experienceRepository,
  learningExclusionRepository,
} from "@/lib/persistence/repositories";
import { retrieveExperiences } from "./outcome-service";
import { learningExclusionService } from "./learning-exclusion-service";
import { recordReviewedProjectOutcome } from "./reviewed-outcome-service";

async function run() {
  await Promise.all([experienceEventRepository.clear(), experienceRepository.clear(), learningExclusionRepository.clear()]);
  const timestamp = new Date().toISOString();
  await experienceEventRepository.saveBatch([
    { id: "review-source-a", ownerId: "review-owner", timestamp, actor: "USER", actionType: "PROPOSAL_ACCEPTED", domain: "creativity", projectId: "review-project-a", metadata: {}, source: "studio", privacyScope: "PROJECT_SHARED", learningEligible: true, schemaVersion: 1 },
    { id: "review-source-b", ownerId: "review-owner", timestamp, actor: "USER", actionType: "MANUAL_EDIT", domain: "creativity", projectId: "review-project-a", metadata: {}, source: "studio", privacyScope: "PROJECT_SHARED", learningEligible: true, schemaVersion: 1 },
    { id: "review-other-project", ownerId: "review-owner", timestamp, actor: "USER", actionType: "MANUAL_EDIT", domain: "creativity", projectId: "review-project-b", metadata: {}, source: "studio", privacyScope: "PROJECT_SHARED", learningEligible: true, schemaVersion: 1 },
    { id: "review-other-owner", ownerId: "other-owner", timestamp, actor: "USER", actionType: "MANUAL_EDIT", domain: "creativity", projectId: "review-project-a", metadata: {}, source: "studio", privacyScope: "PROJECT_SHARED", learningEligible: true, schemaVersion: 1 },
  ]);

  const saved = await recordReviewedProjectOutcome({
    ownerId: "review-owner", projectId: "review-project-a", situation: "A primeira proposta não atendia ao briefing",
    action: "Ajustar o contraste com base na referência escolhida", outcome: "A versão revisada foi mantida",
    evidenceEventIds: ["review-source-a", "review-source-a", "review-source-b"], confirmsUseful: true,
  });
  assert.equal(saved.ownerId, "review-owner");
  assert.equal(saved.scope, "PROJECT");
  assert.equal(saved.scopeId, "review-project-a");
  assert.equal(saved.confidence, 0.5, "One deliberate review event must not be inflated by the number of selected source events");
  assert.equal(saved.usefulness, 1);
  const visible = await retrieveExperiences(undefined, "review-project-a", 20, { ownerId: "review-owner" });
  assert.deepEqual(visible.map((record) => record.id), [saved.id]);
  assert.equal((await retrieveExperiences(undefined, "review-project-b", 20, { ownerId: "review-owner" })).length, 0, "Project evidence must not cross project scope");
  assert.equal((await retrieveExperiences(undefined, "review-project-a", 20, { ownerId: "other-owner" })).length, 0, "Experience must not cross account scope");
  const outcomeEvent = await experienceEventRepository.getById(saved.evidence[0].eventId);
  assert.equal(outcomeEvent?.actor, "USER");
  assert.equal(outcomeEvent?.learningEligible, true);
  assert.deepEqual(outcomeEvent?.metadata.reviewedEvidenceEventIds, ["review-source-a", "review-source-b"]);

  const countsBefore = (await experienceEventRepository.getAll()).length;
  await assert.rejects(recordReviewedProjectOutcome({ ownerId: "review-owner", projectId: "review-project-a", situation: "s", action: "a", outcome: "o", evidenceEventIds: ["review-other-project"], confirmsUseful: true }), /REVIEWED_OUTCOME_EVIDENCE_SCOPE/);
  await assert.rejects(recordReviewedProjectOutcome({ ownerId: "review-owner", projectId: "review-project-a", situation: "s", action: "a", outcome: "o", evidenceEventIds: ["review-source-a"], confirmsUseful: false }), /REVIEWED_OUTCOME_CONFIRMATION_REQUIRED/);
  await assert.rejects(recordReviewedProjectOutcome({ ownerId: "review-owner", projectId: "review-project-a", situation: " ", action: "a", outcome: "o", evidenceEventIds: ["review-source-a"], confirmsUseful: true }), /REVIEWED_OUTCOME_REQUIRED/);
  assert.equal((await experienceEventRepository.getAll()).length, countsBefore, "Invalid or unconfirmed review must not create an outcome event");

  await learningExclusionService.disable("PROJECT", "review-project-a", "não aprender neste projeto", "review-owner");
  await assert.rejects(recordReviewedProjectOutcome({ ownerId: "review-owner", projectId: "review-project-a", situation: "s", action: "a", outcome: "o", evidenceEventIds: ["review-source-a"], confirmsUseful: true }), /REVIEWED_OUTCOME_LEARNING_DISABLED/);
  assert.equal((await experienceRepository.getAll((record) => record.ownerId === "review-owner")).length, 1, "Disabled learning must prevent outcome persistence");

  console.log("Reviewed project outcome tests passed: explicit confirmation, provenance, account/project isolation, and learning exclusion.");
}

void run().catch((error) => { console.error(error); process.exitCode = 1; });
