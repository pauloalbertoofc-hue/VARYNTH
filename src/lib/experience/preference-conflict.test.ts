import { experiencePreferenceRepository } from "@/lib/persistence/repositories";
import { preferenceService } from "./preference-service";
import { seedExperienceEvidence } from "./experience-test-fixtures";

async function run() {
  await experiencePreferenceRepository.clear();
  await seedExperienceEvidence(["e-a", "e-b"]);
  const base = { subject: "user", domain: "music", key: "reverb", scope: "DOMAIN" as const, scopeId: "music", evidence: [{ eventId: "e-a", weight: "HIGH" as const, reason: "choice A" }], proposedAt: new Date().toISOString() };
  await preferenceService.propose({ ...base, value: "low" });
  const contested = await preferenceService.propose({ ...base, value: "high", evidence: [{ eventId: "e-b", weight: "HIGH", reason: "choice B" }] });
  if (contested.status !== "CONTESTED") throw new Error("conflict was not marked");
  if ((await preferenceService.resolve({ domain: "music", key: "reverb" })).length !== 0) throw new Error("contested preference leaked into context");
  console.log("Preference conflict validation passed.");
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
