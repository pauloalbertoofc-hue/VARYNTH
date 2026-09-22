import { experiencePreferenceRepository } from "@/lib/persistence/repositories";
import { preferenceService } from "./preference-service";

async function run() {
  await experiencePreferenceRepository.clear();
  const confirmed = await preferenceService.propose({ subject: "user", domain: "ui", key: "density", value: "compact", scope: "GLOBAL", evidence: [{ eventId: "explicit", weight: "VERY_HIGH", reason: "manual" }], proposedAt: "2026-01-01T00:00:00.000Z" });
  await preferenceService.setStatus(confirmed.id, "CONFIRMED");
  const inferred = await preferenceService.propose({ subject: "user", domain: "music", key: "tempo", value: "fast", scope: "DOMAIN", scopeId: "music", evidence: [{ eventId: "implicit", weight: "HIGH", reason: "repeated edit" }], proposedAt: "2026-01-01T00:00:00.000Z" });
  await experiencePreferenceRepository.save({ ...inferred, lastObservedAt: "2026-01-01T00:00:00.000Z" });
  if (await preferenceService.applyDecay(new Date("2026-03-02T00:00:00.000Z"), 30) !== 1) throw new Error("decay count failed");
  const [after] = await preferenceService.resolve({ domain: "music", key: "tempo" });
  const [manual] = await preferenceService.resolve({ key: "density" });
  if (after.confidence !== 0.09 || manual.confidence !== 0.5 || manual.status !== "CONFIRMED") throw new Error(`decay policy failed: after=${after?.confidence} manual=${manual?.confidence} status=${manual?.status}`);
  console.log("Preference decay validation passed.");
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
