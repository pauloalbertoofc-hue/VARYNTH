import { experienceEventRepository, experiencePreferenceRepository, experienceRepository } from "@/lib/persistence/repositories";
import { experienceService } from "./experience-service";
import { preferenceService } from "./preference-service";
import { retainExperience } from "./outcome-service";

async function run() {
  await Promise.all([experienceEventRepository.clear(), experiencePreferenceRepository.clear(), experienceRepository.clear()]);
  const preference = await preferenceService.propose({ subject: "user", domain: "ui", key: "density", value: "compact", scope: "GLOBAL", evidence: [{ eventId: "e-1", weight: "VERY_HIGH", reason: "explicit" }], proposedAt: new Date().toISOString() });
  await experienceService.record({ actor: "USER", actionType: "MANUAL_EDIT", metadata: {}, source: "test", privacyScope: "USER_SHARED", learningEligible: true });
  await retainExperience({ domain: "ui", context: {}, situation: "editing", action: "compact layout", outcome: "accepted", evidence: [{ eventId: "e-2", weight: "HIGH", reason: "accepted" }] });
  if ((await preferenceService.exportAll()).length !== 1) throw new Error("preference export failed");
  if (!(await preferenceService.forget(preference.id)) || (await preferenceService.resolve({ key: "density" })).length !== 0) throw new Error("preference forget failed");
  if ((await experienceService.list()).length !== 1) throw new Error("event data unexpectedly deleted");
  console.log("Experience data control validation passed.");
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
