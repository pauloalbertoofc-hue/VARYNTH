import assert from "node:assert/strict";
import { getKnowledgeProvenance, storeKnowledge } from "./service";

async function main() {
  await storeKnowledge({ id: "provenance-k1", title: "Traceable", content: "source", primaryDomain: "science", relatedDomains: [], categories: [], tags: [], contributingAgents: [], visibility: "DOMAIN", sensitivity: "INTERNAL", kind: "DOCUMENT", assertion: "REFERENCE", provenance: { sourceType: "VAULT_ITEM", sourceReference: "vault:source-1", addedBy: "USER", createdAt: new Date().toISOString(), authority: "USER_PROVIDED", inferred: false }, version: 1, freshness: "CURRENT", relatedProjectIds: [], relatedArtifactIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  const provenance = await getKnowledgeProvenance("provenance-k1");
  assert.equal(provenance?.sourceReference, "vault:source-1");
  assert.equal(await getKnowledgeProvenance("missing"), null);
  console.log("Knowledge provenance tests passed");
}
void main();
