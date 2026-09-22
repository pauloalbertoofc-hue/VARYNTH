import { experienceEventRepository, learningExclusionRepository } from "@/lib/persistence/repositories";
import { experienceService } from "./experience-service";
import { learningExclusionService } from "./learning-exclusion-service";

async function run() {
  await Promise.all([experienceEventRepository.clear(), learningExclusionRepository.clear()]);
  await learningExclusionService.disable("PROJECT", "private-project", "não usar como aprendizado");

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
