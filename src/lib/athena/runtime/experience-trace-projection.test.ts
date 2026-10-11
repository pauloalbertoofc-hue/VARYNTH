import assert from "node:assert/strict";
import { projectAgentExperienceTraces } from "./experience-trace-projection";
import type { AgentResult } from "../domain/result";

const result: AgentResult = {
  agentId: "musa",
  agentName: "Musa",
  role: "Criatividade",
  success: true,
  content: "Resposta visível ao usuário",
  confidence: 0.7,
  metadata: {
    experienceTrace: {
      agentId: "musa",
      retrievedPreferenceIds: ["pref-1", "pref-1", 4],
      retrievedExperienceIds: ["experience-1"],
      experienceIdsReferencedInResponse: ["experience-1"],
      evidenceEventIdsReferencedInResponse: ["event-1"],
      instructionPrecedence: "CURRENT_INSTRUCTION_OVERRIDES_PERSONALIZATION",
      situation: "must not escape the private result",
    },
  },
};

const projected = projectAgentExperienceTraces([result]);
assert.equal(projected.length, 1);
assert.deepEqual(projected[0].trace.retrievedPreferenceIds, ["pref-1"]);
assert.equal(projected[0].trace.experienceIdsReferencedInResponse[0], "experience-1");
assert.equal(JSON.stringify(projected).includes("must not escape"), false, "Projection contains identifiers only, never memory text");
assert.equal(projectAgentExperienceTraces([{ ...result, metadata: { experienceTrace: { ...result.metadata?.experienceTrace as object, instructionPrecedence: "UNKNOWN" } } }]).length, 0, "Unknown trace contracts fail closed");
console.log("Experience trace projection exposes bounded identifiers only and fails closed on unknown contracts.");
