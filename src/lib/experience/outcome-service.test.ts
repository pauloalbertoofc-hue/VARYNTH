import { experienceRepository } from "@/lib/persistence/repositories";
import { retrieveExperiences, retainExperience } from "./outcome-service";

async function run() {
  await experienceRepository.clear();
  const saved = await retainExperience({ domain: "music", context: { style: "cinematic" }, situation: "dialogue-heavy scene", action: "reduce piano reverb", outcome: "kept in exported version", usefulness: 0.9, evidence: [{ eventId: "export-1", weight: "HIGH", reason: "resultado final" }], scope: "PROJECT", scopeId: "project-1" });
  if (saved.confidence !== 0.5 || (await retrieveExperiences("music", "project-1")).length !== 1) throw new Error("experience retention failed");
  let failed = false;
  try { await retainExperience({ domain: "music", context: {}, situation: "", action: "x", outcome: "y", evidence: [] }); } catch { failed = true; }
  if (!failed) throw new Error("invalid experience accepted");
  console.log("Experience outcome validation passed.");
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
