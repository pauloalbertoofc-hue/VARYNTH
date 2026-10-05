import { experienceEventRepository, learningExclusionRepository } from "@/lib/persistence/repositories";
import { experienceService } from "./experience-service";
import { learningExclusionService } from "./learning-exclusion-service";
import { derivePreferenceCandidatesWithPolicy } from "./preference-candidate-service";
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
  if ((await derivePreferenceCandidatesWithPolicy(historicalSignals, "local-owner")).length !== 1) throw new Error("eligible historical events did not produce a reviewable candidate");
  await learningExclusionService.disable("PROJECT", "private-project", "não usar como aprendizado");
  if ((await derivePreferenceCandidatesWithPolicy(historicalSignals, "local-owner")).length !== 0) throw new Error("active exclusion did not suppress candidates from historical events");

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
