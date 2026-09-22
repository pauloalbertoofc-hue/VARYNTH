import assert from "node:assert/strict";
import { publishKnowledge, storeKnowledge } from "./service";

(async () => {
  await storeKnowledge({ id: "publication-k1", title: "Private reference", content: "controlled", primaryDomain: "music", relatedDomains: [], categories: [], tags: [], ownerAgent: "euterpe", contributingAgents: [], visibility: "AGENT_PRIVATE", sensitivity: "INTERNAL", kind: "REFERENCE", assertion: "FACT", provenance: { sourceType: "TEST", addedBy: "USER", createdAt: new Date().toISOString(), authority: "USER_PROVIDED", inferred: false }, version: 1, freshness: "CURRENT", relatedProjectIds: [], relatedArtifactIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  await assert.rejects(() => publishKnowledge("publication-k1", "justitia"), /KNOWLEDGE_PUBLISH_DENIED/);
  const published = await publishKnowledge("publication-k1", "euterpe");
  assert.equal(published.visibility, "PUBLIC_TO_AGENTS");
  await storeKnowledge({ id: "publication-sensitive-k1", title: "Sensitive reference", content: "controlled", primaryDomain: "music", relatedDomains: [], categories: [], tags: [], ownerAgent: "euterpe", contributingAgents: [], visibility: "AGENT_PRIVATE", sensitivity: "SENSITIVE", kind: "REFERENCE", assertion: "FACT", provenance: { sourceType: "TEST", addedBy: "USER", createdAt: new Date().toISOString(), authority: "USER_PROVIDED", inferred: false }, version: 1, freshness: "CURRENT", relatedProjectIds: [], relatedArtifactIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  await assert.rejects(() => publishKnowledge("publication-sensitive-k1", "euterpe"), /KNOWLEDGE_PUBLISH_SENSITIVE/);
  const domainPublished = await publishKnowledge("publication-sensitive-k1", "euterpe", "DOMAIN");
  assert.equal(domainPublished.visibility, "DOMAIN");
  const privateItem = await storeKnowledge({ id: "publication-private-k1", title: "Private reference", content: "private", primaryDomain: "music", relatedDomains: [], categories: [], tags: [], ownerAgent: "euterpe", contributingAgents: [], visibility: "AGENT_PRIVATE", sensitivity: "PRIVATE", kind: "REFERENCE", assertion: "FACT", provenance: { sourceType: "TEST", addedBy: "USER", createdAt: new Date().toISOString(), authority: "USER_PROVIDED", inferred: false }, version: 1, freshness: "CURRENT", relatedProjectIds: [], relatedArtifactIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  assert.equal(privateItem.visibility, "AGENT_PRIVATE");
  await assert.rejects(() => publishKnowledge("publication-private-k1", "euterpe"), /KNOWLEDGE_PUBLISH_PRIVATE/);
  console.log("Knowledge publication tests passed");
})();
