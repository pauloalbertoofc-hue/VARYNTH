import assert from "node:assert/strict";
import { experienceEventRepository, experiencePreferenceRepository, experienceRepository, learningExclusionRepository } from "@/lib/persistence/repositories";
import { experienceService } from "./experience-service";
import { preferenceService } from "./preference-service";
import { learningExclusionService } from "./learning-exclusion-service";
import { retainExperience, retrieveExperiences } from "./outcome-service";
import { derivePreferenceCandidates } from "./preference-candidate-service";

async function main() {
  await Promise.all([experienceEventRepository.clear(), experiencePreferenceRepository.clear(), experienceRepository.clear(), learningExclusionRepository.clear()]);
  const eventsA = [];
  for (const artifactId of ["artifact-a", "artifact-b", "artifact-a"]) {
    eventsA.push(await experienceService.record({ ownerId: "account-a", actor: "USER", actionType: "USER_ACTION", domain: "audio", moduleId: "audio", artifactId, metadata: { preferenceSignal: { key: "tempoBpm", value: 120 } }, source: "test", privacyScope: "USER_SHARED", learningEligible: true }));
  }
  const eventB = await experienceService.record({ ownerId: "account-b", actor: "USER", actionType: "USER_ACTION", domain: "audio", moduleId: "audio", artifactId: "artifact-b", metadata: { preferenceSignal: { key: "tempoBpm", value: 90 } }, source: "test", privacyScope: "USER_SHARED", learningEligible: true });
  await experienceEventRepository.save({ id: "legacy-unassigned", timestamp: new Date().toISOString(), actor: "USER", actionType: "USER_ACTION", metadata: {}, source: "legacy", privacyScope: "USER_SHARED", learningEligible: true, schemaVersion: 1 });
  assert.deepEqual((await experienceService.list(undefined, "account-a")).map((event) => event.ownerId), ["account-a", "account-a", "account-a"]);
  assert.deepEqual((await experienceService.list(undefined, "account-b")).map((event) => event.id), [eventB.id]);
  assert.equal((await experienceService.list(undefined, "account-a")).some((event) => event.id === "legacy-unassigned"), false, "legacy events without an owner stay unassigned");
  assert.equal(derivePreferenceCandidates([...eventsA, eventB], "account-a").length, 1, "candidate extraction is owner-bound");
  assert.equal(derivePreferenceCandidates(eventsA, "account-b").length, 0, "another account cannot claim these signals");

  const candidateA = derivePreferenceCandidates(eventsA, "account-a")[0];
  const candidateB = { ...candidateA, subject: "account-b", value: 90, evidence: [{ eventId: eventB.id, weight: "MEDIUM" as const, reason: "account B evidence" }] };
  const preferenceA = await preferenceService.propose(candidateA, "account-a");
  const preferenceB = await preferenceService.propose(candidateB, "account-b");
  assert.notEqual(preferenceA.id, preferenceB.id, "preference keys are namespaced by account");
  assert.deepEqual((await preferenceService.resolve({ ownerId: "account-a", domain: "audio" })).map((item) => item.id), [preferenceA.id]);
  assert.deepEqual((await preferenceService.resolve({ ownerId: "account-b", domain: "audio" })).map((item) => item.id), [preferenceB.id]);
  await assert.rejects(() => preferenceService.setStatus(preferenceA.id, "CONFIRMED", undefined, "account-b"), /PREFERENCE_NOT_FOUND/);

  await retainExperience({ ownerId: "account-a", domain: "audio", context: {}, situation: "situation A", action: "action", outcome: "outcome", evidence: [{ eventId: eventsA[0].id, weight: "HIGH", reason: "account A" }], scope: "GLOBAL" });
  await retainExperience({ ownerId: "account-b", domain: "audio", context: {}, situation: "situation B", action: "action", outcome: "outcome", evidence: [{ eventId: eventB.id, weight: "HIGH", reason: "account B" }], scope: "GLOBAL" });
  assert.deepEqual((await retrieveExperiences("audio", undefined, 20, { ownerId: "account-a" })).map((item) => item.situation), ["situation A"]);
  assert.deepEqual((await retrieveExperiences("audio", undefined, 20, { ownerId: "account-b" })).map((item) => item.situation), ["situation B"]);

  await learningExclusionService.disable("GLOBAL", undefined, "account A pause", "account-a");
  assert.equal((await learningExclusionService.list("account-a")).length, 1);
  assert.equal((await learningExclusionService.list("account-b")).length, 0);
  await learningExclusionRepository.save({ id: "learning-exclusion-global-global", scope: "GLOBAL", reason: "old global pause", createdAt: new Date().toISOString() });
  const failClosedLegacyEvent = await experienceService.record({ ownerId: "account-b", actor: "USER", actionType: "USER_ACTION", metadata: {}, source: "test", privacyScope: "USER_SHARED", learningEligible: true });
  assert.equal(failClosedLegacyEvent.learningEligible, false, "an unassigned legacy exclusion must not silently reactivate learning");
  assert.equal((await learningExclusionService.list("account-b")).some((item) => !item.ownerId), true);
  assert.equal(await experienceService.forget(eventsA[0].id, "account-b"), false, "another account cannot forget this event");
  assert.equal(await experienceService.forget(eventsA[0].id, "account-a"), true);
  assert.equal((await preferenceService.resolve({ ownerId: "account-b", domain: "audio" }))[0].id, preferenceB.id, "forgetting A's event must not change B's preference");
  console.log("Experience account ownership isolation tests passed.");
}

void main().catch((error) => { console.error(error); process.exitCode = 1; });
