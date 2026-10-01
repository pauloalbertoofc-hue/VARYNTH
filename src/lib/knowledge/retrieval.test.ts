import assert from "node:assert/strict";
import { discoverKnowledge, queryKnowledge, storeKnowledge } from "./service";

const base = { primaryDomain: "music", relatedDomains: [], categories: [], tags: ["retrieval"], ownerAgent: "euterpe", contributingAgents: [], visibility: "PUBLIC_TO_AGENTS" as const, sensitivity: "PUBLIC" as const, kind: "REFERENCE" as const, assertion: "FACT" as const, version: 1, freshness: "CURRENT" as const, relatedProjectIds: [], relatedArtifactIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
(async () => {
  await storeKnowledge({ ...base, id: "retrieval-primary", title: "Primary source", content: "harmony", provenance: { sourceType: "TEST", addedBy: "SYSTEM", createdAt: new Date().toISOString(), authority: "PRIMARY_SOURCE", inferred: false } });
  await storeKnowledge({ ...base, id: "retrieval-unknown", title: "Unknown source", content: "harmony", provenance: { sourceType: "TEST", addedBy: "SYSTEM", createdAt: new Date().toISOString(), authority: "UNKNOWN", inferred: false } });
  await storeKnowledge({ ...base, id: "retrieval-title-match", title: "Chord harmony guide", content: "guide", categories: ["theory"], provenance: { sourceType: "TEST", addedBy: "SYSTEM", createdAt: new Date().toISOString(), authority: "UNKNOWN", inferred: false } });
  await storeKnowledge({ ...base, id: "retrieval-body-match", title: "General guide", content: "harmony guide", provenance: { sourceType: "TEST", addedBy: "SYSTEM", createdAt: new Date().toISOString(), authority: "UNKNOWN", inferred: false } });
  const result = await queryKnowledge({ requester: "justitia", domain: "music", query: "harmony", purpose: "ranking test", limit: 1 });
  assert.equal(result[0]?.id, "retrieval-primary");
  const relevant = await queryKnowledge({ requester: "justitia", domain: "music", query: "harmony guide", purpose: "relevance ranking test" });
  assert.equal(relevant[0]?.id, "retrieval-title-match");
  const categorized = await queryKnowledge({ requester: "justitia", domain: "music", category: "theory", purpose: "category filter test" });
  assert.deepEqual(categorized.map(({ id }) => id), ["retrieval-title-match"]);
  const discovery = await discoverKnowledge({ requester: "justitia", domain: "music", purpose: "awareness" });
  assert.equal(discovery.find((item) => item.id === "retrieval-primary")?.canQuery, true);
  console.log("Knowledge retrieval tests passed");
})();
