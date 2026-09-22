import assert from "node:assert/strict";
import { queryKnowledge, revokeKnowledge, storeKnowledge } from "./service";

async function main() {
  const item = { id: "revocation-k1", title: "Revocable fact", content: "should disappear", primaryDomain: "music", relatedDomains: [], categories: [], tags: ["revocation"], contributingAgents: [], visibility: "PUBLIC_TO_AGENTS" as const, sensitivity: "PUBLIC" as const, kind: "PUBLIC_DOMAIN" as const, assertion: "FACT" as const, provenance: { sourceType: "TEST", addedBy: "SYSTEM" as const, createdAt: new Date().toISOString(), authority: "INTERNAL_DOCUMENT" as const, inferred: false }, version: 1, freshness: "CURRENT" as const, relatedProjectIds: [], relatedArtifactIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  await storeKnowledge(item);
  await revokeKnowledge(item.id);
  assert.equal((await queryKnowledge({ requester: "athena", domain: "music", query: "revocation", purpose: "test", scope: "PUBLIC" })).some((entry) => entry.id === item.id), false);
  console.log("Knowledge revocation tests passed");
}
void main();
