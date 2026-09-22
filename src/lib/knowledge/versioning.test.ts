import assert from "node:assert/strict";
import { storeKnowledge } from "./service";

async function main() {
  const base = { id: "version-k1", title: "Versioned fact", content: "v1", primaryDomain: "music", relatedDomains: [], categories: [], tags: [], contributingAgents: [], visibility: "PUBLIC_TO_AGENTS" as const, sensitivity: "PUBLIC" as const, kind: "PUBLIC_DOMAIN" as const, assertion: "FACT" as const, provenance: { sourceType: "TEST", addedBy: "SYSTEM" as const, createdAt: new Date().toISOString(), authority: "INTERNAL_DOCUMENT" as const, inferred: false }, version: 1, freshness: "CURRENT" as const, relatedProjectIds: [], relatedArtifactIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  const first = await storeKnowledge(base);
  const second = await storeKnowledge({ ...base, content: "v2", updatedAt: new Date().toISOString() });
  assert.equal(first.version, 1);
  assert.equal(second.version, 2);
  assert.equal(second.supersedesId, first.id);
  console.log("Knowledge versioning tests passed");
}
void main();
