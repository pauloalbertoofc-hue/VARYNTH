import assert from "node:assert/strict";
import { experienceEventRepository, experiencePreferenceRepository, experienceRepository } from "@/lib/persistence/repositories";
import { experienceService } from "./experience-service";
import { preferenceService } from "./preference-service";
import { buildExperienceContext } from "./context-builder";

async function main() {
  await Promise.all([experiencePreferenceRepository.clear(), experienceRepository.clear()]);
  await experienceEventRepository.clear();
  await preferenceService.declare({ domain: "communication", key: "verbosity", value: "concise", scope: "GLOBAL" }, "context-owner");
  const evidence = await experienceService.record({ ownerId: "context-owner", actor: "USER", actionType: "USER_ACTION", domain: "music", metadata: {}, source: "test", privacyScope: "USER_SHARED", learningEligible: true });
  const inferredGlobal = await preferenceService.propose({
    subject: "context-owner", domain: "music", key: "tempo", value: 120, scope: "GLOBAL",
    evidence: [{ eventId: evidence.id, weight: "HIGH", reason: "test" }], proposedAt: new Date().toISOString(),
  }, "context-owner");
  const context = await buildExperienceContext({ requester: "test", ownerId: "context-owner", agentId: "euterpe", domain: "music", currentInstruction: "be detailed", budget: 4 });
  assert.equal(context.preferences.length, 1);
  assert.equal(context.preferences[0].source, "MANUAL");
  assert.equal(context.preferences.some((preference) => preference.key === "tempo"), false, "global inferred preferences are not shared across agents");
  assert.equal(context.instructionPrecedence, "CURRENT_INSTRUCTION_OVERRIDES_PERSONALIZATION");
  assert.ok(context.preferences.length + context.experiences.length <= 4);
  const other = await buildExperienceContext({ requester: "test", ownerId: "other-owner", agentId: "euterpe", domain: "music", budget: 4 });
  assert.equal(other.preferences.length, 0, "context is isolated by owner");
  console.log("Experience context builder tests passed");
}

void main().catch((error) => { console.error(error); process.exitCode = 1; });
