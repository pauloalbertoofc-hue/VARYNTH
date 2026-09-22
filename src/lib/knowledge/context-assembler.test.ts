import assert from "node:assert/strict";
import { buildAgentContext } from "./context-assembler";
import { storeKnowledge } from "./service";
import { experienceRepository } from "@/lib/persistence/repositories";

async function main() {
await experienceRepository.clear();
await experienceRepository.save({ id: "ctx-experience-1", domain: "legal", context: {}, situation: "s1", action: "a1", outcome: "o1", confidence: .8, evidence: [{ eventId: "ctx-event-1", weight: "HIGH", reason: "test" }], scope: "PROJECT", scopeId: "project-1", createdAt: new Date().toISOString() });
await experienceRepository.save({ id: "ctx-experience-2", domain: "legal", context: {}, situation: "s2", action: "a2", outcome: "o2", confidence: .8, evidence: [{ eventId: "ctx-event-2", weight: "HIGH", reason: "test" }], scope: "PROJECT", scopeId: "project-2", createdAt: new Date().toISOString() });
await storeKnowledge({
  id: "ctx-k1", title: "Copyright musical", content: "Licenciamento de uma trilha", primaryDomain: "legal", relatedDomains: ["music"], categories: [], tags: ["copyright"], ownerAgent: "justitia", contributingAgents: ["euterpe"], visibility: "PUBLIC_TO_AGENTS", sensitivity: "PUBLIC", kind: "PUBLIC_DOMAIN", assertion: "REFERENCE",
  provenance: { sourceType: "TEST", addedBy: "SYSTEM", createdAt: new Date().toISOString(), authority: "INTERNAL_DOCUMENT", inferred: false }, version: 1, freshness: "CURRENT", relatedProjectIds: [], relatedArtifactIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
});
const context = await buildAgentContext({ requester: "athena", task: "verifique o copyright da trilha do jogo", purpose: "orchestration", scope: "PUBLIC", budget: 1 });
assert.equal(context.primaryDomain, "legal");
assert.equal(context.specialist, "justitia");
assert.equal(context.knowledge.length, 1);
assert.equal(context.experience.preferences.length, 0);
assert.equal(context.experience.experiences.length, 1);
assert.equal(context.experience.truncated, true);
assert.equal(context.truncated, true);
console.log("Agent context assembler tests passed");
}

void main();
