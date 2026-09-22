import assert from "node:assert/strict";
import { knowledgeRelationshipRepository } from "../persistence/repositories";
import { queryKnowledge, revokeKnowledge, storeKnowledge, linkKnowledge } from "./service";

async function main() {
  const item = { id: "revocation-k1", title: "Revocable fact", content: "should disappear", primaryDomain: "music", relatedDomains: [], categories: [], tags: ["revocation"], contributingAgents: [], visibility: "PUBLIC_TO_AGENTS" as const, sensitivity: "PUBLIC" as const, kind: "PUBLIC_DOMAIN" as const, assertion: "FACT" as const, provenance: { sourceType: "TEST", addedBy: "SYSTEM" as const, createdAt: new Date().toISOString(), authority: "INTERNAL_DOCUMENT" as const, inferred: false }, version: 1, freshness: "CURRENT" as const, relatedProjectIds: [], relatedArtifactIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  await storeKnowledge(item);
  const derived = { ...item, id: "revocation-derived", title: "Derived summary", content: "derived from source", provenance: { ...item.provenance, sourceType: "AGENT_GENERATED", derivedFromIds: [item.id] } };
  await storeKnowledge(derived);
  await linkKnowledge({ id: "revocation-derived-edge", fromId: derived.id, toId: item.id, type: "DERIVED_FROM" });
  const downstream = { ...derived, id: "revocation-downstream", title: "Downstream summary", provenance: { ...derived.provenance, derivedFromIds: [derived.id] } };
  await storeKnowledge(downstream);
  await linkKnowledge({ id: "revocation-downstream-edge", fromId: downstream.id, toId: derived.id, type: "DERIVED_FROM" });
  await revokeKnowledge(item.id);
  assert.equal((await queryKnowledge({ requester: "athena", domain: "music", query: "revocation", purpose: "test", scope: "PUBLIC" })).some((entry) => entry.id === item.id), false);
  const derivedResult = await queryKnowledge({ requester: "athena", domain: "music", query: "derived summary", purpose: "test", scope: "PUBLIC" });
  assert.equal(derivedResult.some((entry) => entry.id === derived.id), false);
  assert.equal((await queryKnowledge({ requester: "athena", domain: "music", query: "downstream summary", purpose: "test", scope: "PUBLIC" })).some((entry) => entry.id === downstream.id), false);
  assert.equal((await knowledgeRelationshipRepository.getById("revocation-derived-edge"))?.type, "DERIVED_FROM");
  console.log("Knowledge revocation tests passed");
}
void main();
