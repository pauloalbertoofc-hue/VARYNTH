import assert from "node:assert/strict";
import { publishKnowledge, storeKnowledge } from "./service";

(async () => {
  await storeKnowledge({ id: "publication-k1", title: "Private reference", content: "controlled", primaryDomain: "music", relatedDomains: [], categories: [], tags: [], ownerAgent: "euterpe", contributingAgents: [], visibility: "AGENT_PRIVATE", sensitivity: "INTERNAL", kind: "REFERENCE", assertion: "FACT", provenance: { sourceType: "TEST", addedBy: "USER", createdAt: new Date().toISOString(), authority: "USER_PROVIDED", inferred: false }, version: 1, freshness: "CURRENT", relatedProjectIds: [], relatedArtifactIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  await assert.rejects(() => publishKnowledge("publication-k1", "justitia"), /KNOWLEDGE_PUBLISH_DENIED/);
  const published = await publishKnowledge("publication-k1", "euterpe");
  assert.equal(published.visibility, "PUBLIC_TO_AGENTS");
  console.log("Knowledge publication tests passed");
})();
