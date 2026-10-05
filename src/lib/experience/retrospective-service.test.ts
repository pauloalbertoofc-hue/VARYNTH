import { experienceEventRepository, experienceRepository } from "@/lib/persistence/repositories";
import { buildProjectRetrospective } from "./retrospective-service";

async function run() {
  await Promise.all([experienceEventRepository.clear(), experienceRepository.clear()]);
  const timestamp = new Date().toISOString();
  await experienceEventRepository.save({ id: "created", ownerId: "local-owner", timestamp, actor: "USER", actionType: "PROJECT_CREATED", projectId: "p1", metadata: { approach: "prototype" }, source: "test", privacyScope: "PROJECT_SHARED", learningEligible: true, schemaVersion: 1 });
  await experienceEventRepository.save({ id: "accepted", ownerId: "local-owner", timestamp, actor: "USER", actionType: "PROPOSAL_ACCEPTED", projectId: "p1", metadata: {}, source: "test", privacyScope: "PROJECT_SHARED", learningEligible: true, schemaVersion: 1 });
  await experienceEventRepository.save({ id: "other-project-event", ownerId: "local-owner", timestamp, actor: "USER", actionType: "PROPOSAL_ACCEPTED", projectId: "p2", metadata: {}, source: "test", privacyScope: "PROJECT_SHARED", learningEligible: true, schemaVersion: 1 });
  await experienceEventRepository.save({ id: "other-account-event", ownerId: "another-owner", timestamp, actor: "USER", actionType: "MANUAL_EDIT", projectId: "p1", metadata: {}, source: "test", privacyScope: "PROJECT_SHARED", learningEligible: true, schemaVersion: 1 });
  await experienceRepository.save({ id: "relevant-experience", ownerId: "local-owner", domain: "creative", context: {}, situation: "situation", action: "action", outcome: "outcome", usefulness: 0.8, confidence: 0.8, evidence: [{ eventId: "accepted", weight: "HIGH", reason: "accepted" }], scope: "PROJECT", scopeId: "p1", createdAt: timestamp });
  await experienceRepository.save({ id: "unrelated-experience", ownerId: "local-owner", domain: "creative", context: {}, situation: "situation", action: "action", outcome: "outcome", usefulness: 1, confidence: 1, evidence: [{ eventId: "other-project-event", weight: "HIGH", reason: "other" }], scope: "GLOBAL", createdAt: timestamp });
  await experienceRepository.save({ id: "mismatched-project-evidence", ownerId: "local-owner", domain: "creative", context: {}, situation: "situation", action: "action", outcome: "outcome", usefulness: 1, confidence: 1, evidence: [{ eventId: "other-project-event", weight: "HIGH", reason: "other project" }], scope: "PROJECT", scopeId: "p1", createdAt: timestamp });
  await experienceRepository.save({ id: "other-account-experience", ownerId: "another-owner", domain: "creative", context: {}, situation: "situation", action: "action", outcome: "outcome", usefulness: 1, confidence: 1, evidence: [{ eventId: "other-account-event", weight: "HIGH", reason: "private" }], scope: "PROJECT", scopeId: "p1", createdAt: timestamp });
  const result = await buildProjectRetrospective("p1");
  if (result.initialApproach[0] !== "prototype" || result.importantDecisions[0] !== "accepted" || result.evidence.length !== 2) throw new Error("retrospective assembly failed");
  if (result.successfulExperiences.length !== 1 || result.successfulExperiences[0].id !== "relevant-experience" || result.successfulExperiences[0].evidence[0]?.eventId !== "accepted") throw new Error("retrospective leaked unrelated or cross-account experience");
  if ((await buildProjectRetrospective("  p1  ")).projectId !== "p1") throw new Error("project ID normalization failed");
  let rejectedBlankId = false;
  try { await buildProjectRetrospective("   "); } catch { rejectedBlankId = true; }
  if (!rejectedBlankId) throw new Error("blank project id accepted");
  console.log("Project retrospective validation passed.");
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
