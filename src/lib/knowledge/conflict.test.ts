import assert from "node:assert/strict";
import { findKnowledgeConflicts, storeKnowledge } from "./service";

async function main() {
  const common = { title: "Conflicting source", primaryDomain: "legal", relatedDomains: [], categories: [], tags: [], contributingAgents: [], visibility: "PUBLIC_TO_AGENTS" as const, sensitivity: "PUBLIC" as const, kind: "REFERENCE" as const, assertion: "FACT" as const, provenance: { sourceType: "TEST", addedBy: "SYSTEM" as const, createdAt: new Date().toISOString(), authority: "UNKNOWN" as const, inferred: false }, version: 1, freshness: "CURRENT" as const, relatedProjectIds: [], relatedArtifactIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  await storeKnowledge({ ...common, id: "conflict-a", content: "A" });
  await storeKnowledge({ ...common, id: "conflict-b", content: "B" });
  const groups = await findKnowledgeConflicts("legal");
  assert.equal(groups.length, 1);
  assert.equal(groups[0].items.length, 2);
  console.log("Knowledge conflict tests passed");
}
void main();
