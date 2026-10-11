import { experiencePreferenceRepository } from "@/lib/persistence/repositories";
import { preferenceService } from "./preference-service";
import { seedExperienceEvidence } from "./experience-test-fixtures";

async function run() {
  await experiencePreferenceRepository.clear();
  await seedExperienceEvidence(["event-1", "event-2"]);
  const evidence = [{ eventId: "event-1", weight: "VERY_HIGH" as const, reason: "confirmação explícita" }];
  const inferred = await preferenceService.propose({ subject: "local-owner", domain: "music", key: "tempo", value: "moderado", scope: "DOMAIN", scopeId: "music", evidence, proposedAt: new Date().toISOString() });
  if (inferred.status !== "INFERRED" || inferred.confidence !== 0.5) throw new Error("candidate inference failed");
  const confirmed = await preferenceService.setStatus(inferred.id, "CONFIRMED");
  if (confirmed.source !== "MANUAL") throw new Error("confirmation provenance failed");
  const global = await preferenceService.propose({ subject: "local-owner", domain: "music", key: "tempo", value: "rápido", scope: "GLOBAL", evidence: [{ eventId: "event-2", weight: "HIGH", reason: "repetição contextual" }], proposedAt: new Date().toISOString() });
  const resolved = await preferenceService.resolve({ domain: "music", key: "tempo" });
  if (resolved[0].id !== confirmed.id || resolved[1].id !== global.id) throw new Error("scope hierarchy failed");
  if ((await preferenceService.resolve({ domain: "music", key: "tempo", currentInstruction: "lento" })).length !== 0) throw new Error("current instruction did not override");
  const inferenceFlag = process.env.NEXT_PUBLIC_VARYNTH_EXPERIENCE_PREFERENCE_INFERENCE_ENABLED;
  process.env.NEXT_PUBLIC_VARYNTH_EXPERIENCE_PREFERENCE_INFERENCE_ENABLED = "false";
  let pausedInferenceRejected = false;
  try {
    await preferenceService.propose({ subject: "local-owner", domain: "music", key: "genre", value: "ambient", scope: "DOMAIN", scopeId: "music", evidence: [{ eventId: "event-1", weight: "HIGH", reason: "repeated edit" }], proposedAt: new Date().toISOString() });
  } catch (error) { pausedInferenceRejected = error instanceof Error && error.message.includes("PREFERENCE_INFERENCE_DISABLED"); }
  finally {
    if (inferenceFlag === undefined) delete process.env.NEXT_PUBLIC_VARYNTH_EXPERIENCE_PREFERENCE_INFERENCE_ENABLED;
    else process.env.NEXT_PUBLIC_VARYNTH_EXPERIENCE_PREFERENCE_INFERENCE_ENABLED = inferenceFlag;
  }
  if (!pausedInferenceRejected) throw new Error("preference persistence ignored the inference kill switch");
  console.log("Preference service validation passed.");
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
