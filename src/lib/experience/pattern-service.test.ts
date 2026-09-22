import assert from "node:assert/strict";
import { experienceRepository } from "@/lib/persistence/repositories";
import { deriveExperienceInsights, deriveExperiencePatterns } from "./pattern-service";

(async () => {
  await experienceRepository.clear();
  await experienceRepository.save({ id: "experience-pattern-1", domain: "music", context: {}, situation: "mixagem vocal", action: "reduzir sibilância", outcome: "voz mais clara", confidence: .9, evidence: [{ eventId: "event-1", weight: "HIGH", reason: "resultado preservado" }], scope: "PROJECT", scopeId: "project-1", createdAt: "2026-09-20T00:00:00.000Z" });
  await experienceRepository.save({ id: "experience-pattern-2", domain: "music", context: {}, situation: "mixagem vocal", action: "reduzir sibilância", outcome: "voz mais clara", confidence: .8, evidence: [{ eventId: "event-2", weight: "HIGH", reason: "resultado preservado" }], scope: "PROJECT", scopeId: "project-2", createdAt: "2026-09-21T00:00:00.000Z" });
  const patterns = await deriveExperiencePatterns("music");
  assert.equal(patterns.length, 1);
  assert.equal(patterns[0].occurrences, 2);
  assert.equal(patterns[0].evidence.length, 2);
  const insights = await deriveExperienceInsights("music");
  assert.equal(insights[0].patternId, patterns[0].id);
  assert.equal(insights[0].confidence, patterns[0].confidence);
  console.log("Experience pattern and insight tests passed");
})();
