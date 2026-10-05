import assert from "node:assert/strict";
import { storeKnowledge, updateKnowledge } from "./service";
import "./ownership-history.test";

(async () => {
  await storeKnowledge({ id: "update-k1", title: "Original", content: "v1", primaryDomain: "music", relatedDomains: [], categories: [], tags: [], ownerAgent: "euterpe", contributingAgents: [], visibility: "DOMAIN", sensitivity: "INTERNAL", kind: "REFERENCE", assertion: "FACT", provenance: { sourceType: "TEST", addedBy: "SYSTEM", createdAt: new Date().toISOString(), authority: "INTERNAL_DOCUMENT", inferred: false }, version: 1, freshness: "CURRENT", relatedProjectIds: [], relatedArtifactIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  await assert.rejects(() => updateKnowledge("update-k1", "justitia", { content: "leak" }), /KNOWLEDGE_UPDATE_DENIED/);
  const updated = await updateKnowledge("update-k1", "euterpe", { content: "v2" });
  await assert.rejects(() => updateKnowledge("update-k1", "euterpe", { visibility: "PUBLIC_TO_AGENTS", sensitivity: "PRIVATE" }), /KNOWLEDGE_PATCH_INVALID/);
  await assert.rejects(() => updateKnowledge("update-k1", "euterpe", { visibility: "PUBLIC_TO_AGENTS" }), /fluxo de publicação/);
  const reassigned = await updateKnowledge("update-k1", "euterpe", { ownerAgent: "justitia", visibility: "DOMAIN", sensitivity: "INTERNAL" }, { type: "USER", id: "owner" });
  assert.equal(reassigned.ownerAgent, "justitia");
  const ownerChange = reassigned.ownershipHistory?.at(-1);
  assert.equal(ownerChange?.fromAgent, "euterpe");
  assert.equal(ownerChange?.toAgent, "justitia");
  assert.equal(ownerChange?.changedBy, "USER");
  assert.equal(ownerChange?.actorId, "owner");
  assert.ok(Number.isFinite(Date.parse(ownerChange?.changedAt || "")));
  assert.equal(reassigned.ownershipHistory?.length, 1);
  assert.equal(updated.content, "v2");
  assert.equal(updated.version, 2);
  console.log("Knowledge update tests passed");
})();
