import assert from "node:assert/strict";
import { storeKnowledge, updateKnowledge } from "./service";

(async () => {
  await storeKnowledge({ id: "update-k1", title: "Original", content: "v1", primaryDomain: "music", relatedDomains: [], categories: [], tags: [], ownerAgent: "euterpe", contributingAgents: [], visibility: "DOMAIN", sensitivity: "INTERNAL", kind: "REFERENCE", assertion: "FACT", provenance: { sourceType: "TEST", addedBy: "SYSTEM", createdAt: new Date().toISOString(), authority: "INTERNAL_DOCUMENT", inferred: false }, version: 1, freshness: "CURRENT", relatedProjectIds: [], relatedArtifactIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  await assert.rejects(() => updateKnowledge("update-k1", "justitia", { content: "leak" }), /KNOWLEDGE_UPDATE_DENIED/);
  const updated = await updateKnowledge("update-k1", "euterpe", { content: "v2" });
  assert.equal(updated.content, "v2");
  assert.equal(updated.version, 2);
  console.log("Knowledge update tests passed");
})();
