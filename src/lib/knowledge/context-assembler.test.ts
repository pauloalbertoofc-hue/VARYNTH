import assert from "node:assert/strict";
import { buildAgentContext } from "./context-assembler";
import { storeKnowledge } from "./service";
import { experienceRepository } from "@/lib/persistence/repositories";
import { experiencePreferenceRepository } from "@/lib/persistence/repositories";

async function main() {
await experienceRepository.clear();
await experiencePreferenceRepository.clear();
await experiencePreferenceRepository.save({ id: "ctx-preference-1", ownerId: "local-owner", subject: "user:context-test", domain: "legal", key: "responseStyle", value: "concise", scope: "DOMAIN", scopeId: "legal", confidence: 0.9, status: "CONFIRMED", evidence: [{ eventId: "ctx-preference-event", weight: "VERY_HIGH", reason: "explicit user confirmation" }], source: "MANUAL", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
await experienceRepository.save({ id: "ctx-experience-1", ownerId: "local-owner", domain: "legal", context: {}, situation: "s1", action: "a1", outcome: "o1", confidence: .8, evidence: [{ eventId: "ctx-event-1", weight: "HIGH", reason: "test" }], scope: "GLOBAL", createdAt: new Date().toISOString() });
await experienceRepository.save({ id: "ctx-experience-2", ownerId: "local-owner", domain: "legal", context: {}, situation: "s2", action: "a2", outcome: "o2", confidence: .8, evidence: [{ eventId: "ctx-event-2", weight: "HIGH", reason: "test" }], scope: "PROJECT", scopeId: "project-2", createdAt: new Date().toISOString() });
await experienceRepository.save({ id: "ctx-experience-3", ownerId: "local-owner", domain: "legal", context: {}, situation: "s3", action: "a3", outcome: "o3", confidence: .7, evidence: [{ eventId: "ctx-event-3", weight: "MEDIUM", reason: "test" }], scope: "GLOBAL", createdAt: new Date().toISOString() });
await storeKnowledge({
  id: "ctx-k1", title: "Copyright musical", content: "Licenciamento de uma trilha", primaryDomain: "legal.intellectual-property", relatedDomains: ["music.asset-provenance"], categories: [], tags: ["copyright"], ownerAgent: "justitia", contributingAgents: ["euterpe"], visibility: "PUBLIC_TO_AGENTS", sensitivity: "PUBLIC", kind: "PUBLIC_DOMAIN", assertion: "REFERENCE",
  provenance: { sourceType: "TEST", addedBy: "SYSTEM", createdAt: new Date().toISOString(), authority: "INTERNAL_DOCUMENT", inferred: false }, version: 1, freshness: "CURRENT", relatedProjectIds: [], relatedArtifactIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
});
const context = await buildAgentContext({ requester: "athena", ownerId: "local-owner", task: "verifique o copyright da trilha do jogo", purpose: "orchestration", scope: "PUBLIC", projectId: "project-1", budget: 2 });
assert.equal(context.primaryDomain, "legal.intellectual-property");
assert.equal(context.specialist, "justitia");
assert.equal(context.knowledge.length, 1);
assert.equal(context.experience.preferences.length, 1, "an ancestor-domain preference must remain applicable to its subdomain task");
assert.equal(context.experience.preferences[0].key, "responseStyle");
assert.equal(context.experience.instructionPrecedence, "CURRENT_INSTRUCTION_OVERRIDES_PERSONALIZATION");
assert.ok(context.experience.preferences.length + context.experience.experiences.length <= 2, "preference and experience context share one bounded budget");
assert.ok(context.experience.experiences.length <= 1);
assert.equal(context.experience.experiences.some((item) => item.scopeId === "project-2"), false);
assert.ok(context.knowledge.length + context.experience.preferences.length + context.experience.experiences.length <= 2, "knowledge and experience must share one total context budget");
assert.equal(context.experience.truncated, true);
assert.equal(context.truncated, true);
const zeroBudgetContext = await buildAgentContext({ requester: "athena", ownerId: "local-owner", task: "verifique o copyright da trilha do jogo", purpose: "zero-budget context", budget: 0 });
assert.equal(zeroBudgetContext.knowledge.length, 0, "a zero context budget must not retrieve knowledge");
console.log("Agent context assembler tests passed");
}

void main();
