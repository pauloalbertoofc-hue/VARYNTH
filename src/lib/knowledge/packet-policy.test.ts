import assert from "node:assert/strict";
import { requestKnowledgePacket } from "./protocol";
import { storeKnowledge } from "./service";

const content = "conteúdo interno ".repeat(40);
(async () => {
  await storeKnowledge({ id: "packet-policy-summary", title: "Resumo controlado", content, primaryDomain: "music", relatedDomains: ["legal"], categories: [], tags: [], ownerAgent: "euterpe", contributingAgents: [], visibility: "CROSS_DOMAIN", sensitivity: "INTERNAL", kind: "REFERENCE", assertion: "FACT", provenance: { sourceType: "TEST", addedBy: "SYSTEM", createdAt: new Date().toISOString(), authority: "INTERNAL_DOCUMENT", inferred: false }, version: 1, freshness: "CURRENT", relatedProjectIds: [], relatedArtifactIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  const packet = await requestKnowledgePacket({ requester: "athena", domain: "legal", query: "Resumo controlado", purpose: "summary", scope: "DOMAIN" });
  assert.equal(packet.facts.length, 1);
  assert.ok(packet.facts[0].content.length < content.length);
  console.log("Knowledge packet policy tests passed");
})();
