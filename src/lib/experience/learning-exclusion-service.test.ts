import { experienceEventRepository, learningExclusionRepository } from "@/lib/persistence/repositories";
import { experienceService } from "./experience-service";
import { learningExclusionService } from "./learning-exclusion-service";
import { derivePreferenceCandidatesWithPolicy } from "./preference-candidate-service";
import { preferenceService } from "./preference-service";
import type { ExperienceEvent } from "./contracts";

async function run() {
  await Promise.all([experienceEventRepository.clear(), learningExclusionRepository.clear()]);
  const historicalSignals: ExperienceEvent[] = ["a", "b", "c"].map((artifactId, index) => ({
    id: `historical-signal-${index}`, ownerId: "local-owner", timestamp: new Date().toISOString(), actor: "USER",
    actionType: "USER_ACTION", moduleId: "audio", domain: "audio", projectId: "private-project", artifactId,
    metadata: { audioAction: "BPM_CHANGED", preferenceSignal: { key: "tempoBpm", value: 120 } }, source: "audio-studio",
    privacyScope: "PROJECT_SHARED", learningEligible: true, schemaVersion: 1,
  }));
  await experienceEventRepository.saveBatch(historicalSignals);
  const [historicalCandidate] = await derivePreferenceCandidatesWithPolicy(historicalSignals, "local-owner");
  if (!historicalCandidate) throw new Error("eligible historical events did not produce a reviewable candidate");
  await learningExclusionService.disable("PROJECT", "private-project", "não usar como aprendizado");
  if ((await derivePreferenceCandidatesWithPolicy(historicalSignals, "local-owner")).length !== 0) throw new Error("active exclusion did not suppress candidates from historical events");
  let excludedProposalRejected = false;
  try { await preferenceService.propose(historicalCandidate, "local-owner"); }
  catch (error) { excludedProposalRejected = error instanceof Error && error.message.includes("PREFERENCE_LEARNING_EXCLUDED"); }
  if (!excludedProposalRejected) throw new Error("direct candidate persistence bypassed the active project learning exclusion");

  const excluded = await experienceService.record({
    actor: "USER", actionType: "MANUAL_EDIT", metadata: {}, source: "editor", domain: "audio",
    privacyScope: "PROJECT_SHARED", learningEligible: true, projectId: "private-project",
  });
  if (excluded.learningEligible || !excluded.metadata.learningExclusionReason) throw new Error("project exclusion did not disable learning while retaining audit event");

  const allowed = await experienceService.record({
    actor: "USER", actionType: "MANUAL_EDIT", metadata: {}, source: "editor", domain: "audio",
    privacyScope: "PROJECT_SHARED", learningEligible: true, projectId: "other-project",
  });
  if (!allowed.learningEligible) throw new Error("project exclusion leaked into another project");

  await learningExclusionService.disable("GLOBAL", undefined, "pausa global");
  await learningExclusionRepository.save({ id: "learning-exclusion-legacy-domain-audio", scope: "DOMAIN", scopeId: "audio", reason: "legado sem proprietário", createdAt: new Date().toISOString() });
  await learningExclusionService.disable("DOMAIN", "audio", "conta A", "account-a");
  await learningExclusionService.disable("DOMAIN", "music", "conta B", "account-b");
  const accountAExclusions = await learningExclusionService.list("account-a");
  if (!accountAExclusions.some((item) => !item.ownerId)) throw new Error("legacy exclusion must remain visible for fail-closed learning policy");
  const accountAExportExclusions = accountAExclusions.filter((item) => item.ownerId === "account-a");
  if (accountAExportExclusions.some((item) => item.ownerId !== "account-a") || accountAExportExclusions.length !== 1) throw new Error("account export exclusion set contains legacy or another account's data");

  const globallyExcluded = await experienceService.record({
    actor: "USER", actionType: "MANUAL_EDIT", metadata: {}, source: "editor",
    privacyScope: "USER_SHARED", learningEligible: true,
  });
  if (globallyExcluded.learningEligible) throw new Error("global exclusion was ignored");

  await learningExclusionService.enable("GLOBAL");
  const afterReenable = await experienceService.record({
    actor: "USER", actionType: "MANUAL_EDIT", metadata: {}, source: "editor",
    privacyScope: "USER_SHARED", learningEligible: true,
  });
  if (!afterReenable.learningEligible) throw new Error("global exclusion did not re-enable learning");
  console.log("Learning exclusion scope and event retention tests passed.");
}

run().catch((error) => { console.error(error); process.exitCode = 1; });
