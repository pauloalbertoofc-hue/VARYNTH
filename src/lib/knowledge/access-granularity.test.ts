import assert from "node:assert/strict";
import { discoverKnowledge, storeKnowledge } from "./service";

(async () => {
  await storeKnowledge({ id: "granular-private", title: "Private item", content: "secret", primaryDomain: "legal", relatedDomains: [], categories: [], tags: [], ownerAgent: "justitia", contributingAgents: [], visibility: "PRIVATE", sensitivity: "PRIVATE", kind: "DOCUMENT", assertion: "FACT", provenance: { sourceType: "TEST", addedBy: "SYSTEM", createdAt: new Date().toISOString(), authority: "UNKNOWN", inferred: false }, version: 1, freshness: "CURRENT", relatedProjectIds: [], relatedArtifactIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  const result = await discoverKnowledge({ requester: "athena", domain: "legal", purpose: "awareness", operation: "CAN_DISCOVER" });
  const item = result.find((candidate) => candidate.id === "granular-private");
  assert.equal(item?.canDiscover, true);
  assert.equal(item?.canQuery, false);
  assert.equal(item?.canRead, false);
  console.log("Knowledge access granularity tests passed");
})();
