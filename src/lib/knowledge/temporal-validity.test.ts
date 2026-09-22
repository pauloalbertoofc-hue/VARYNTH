import assert from "node:assert/strict";
import { queryKnowledge, storeKnowledge } from "./service";

(async () => {
  const base = { primaryDomain: "legal", relatedDomains: [], categories: [], tags: ["temporal"], ownerAgent: "justitia", contributingAgents: [], visibility: "PUBLIC_TO_AGENTS" as const, sensitivity: "PUBLIC" as const, kind: "REFERENCE" as const, assertion: "FACT" as const, provenance: { sourceType: "TEST", addedBy: "SYSTEM" as const, createdAt: new Date().toISOString(), authority: "OFFICIAL_REFERENCE" as const, inferred: false }, version: 1, freshness: "CURRENT" as const, relatedProjectIds: [], relatedArtifactIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  await storeKnowledge({ ...base, id: "temporal-active", title: "Active", content: "current", validUntil: new Date(Date.now() + 86400000).toISOString() });
  await storeKnowledge({ ...base, id: "temporal-expired", title: "Expired", content: "old", validUntil: new Date(Date.now() - 86400000).toISOString() });
  const result = await queryKnowledge({ requester: "athena", domain: "legal", query: "temporal", purpose: "validity" });
  assert.equal(result.some((item) => item.id === "temporal-active"), true);
  assert.equal(result.some((item) => item.id === "temporal-expired"), false);
  console.log("Knowledge temporal validity tests passed");
})();
