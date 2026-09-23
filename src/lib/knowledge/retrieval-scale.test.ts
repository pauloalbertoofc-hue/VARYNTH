import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { knowledgeRepository } from "../persistence/repositories";
import type { KnowledgeItem } from "./contracts";
import { invalidateKnowledgeQueryCache, queryKnowledge, revokeKnowledge, storeKnowledge } from "./service";

const timestamp = new Date().toISOString();
const makeItem = (id: string, content: string, index: number): KnowledgeItem => ({
  id, title: `Scale reference ${index}`, content, primaryDomain: `knowledge.scale.topic.${String(index % 20).padStart(2, "0")}`,
  relatedDomains: [], categories: ["scale"], tags: ["benchmark", `itemmarker${index}`], ownerAgent: "athena", contributingAgents: [],
  visibility: "PUBLIC_TO_AGENTS", sensitivity: "PUBLIC", kind: "REFERENCE", assertion: "FACT",
  provenance: { sourceType: "SCALE_TEST", addedBy: "SYSTEM", createdAt: timestamp, authority: "USER_PROVIDED", inferred: false },
  version: 1, freshness: "CURRENT", relatedProjectIds: index % 5 === 0 ? ["scale-project-main"] : [`project-${index % 7}`], relatedArtifactIds: [],
  createdAt: timestamp, updatedAt: timestamp,
});

async function main() {
  await knowledgeRepository.clear();
  invalidateKnowledgeQueryCache();
  const records = Array.from({ length: 5_000 }, (_, index) => makeItem(`scale-${index}`, `routine knowledge material record${index} ${"reference detail ".repeat(8)}`, index));
  const targetIndex = 2_000;
  records[targetIndex] = { ...records[targetIndex], content: `${records[targetIndex].content} solsticeacousticneedle ${"long document passage ".repeat(2_000)}` };
  records[targetIndex].relatedProjectIds = ["scale-project-main"];
  records[targetIndex].primaryDomain = "knowledge.scale.topic.07";
  records.push({ ...makeItem("scale-private", "solsticeacousticneedle restricted record", 5_001), primaryDomain: "knowledge.scale.topic.07", relatedProjectIds: ["scale-project-main"], visibility: "PRIVATE" });
  await knowledgeRepository.saveBatch(records);
  invalidateKnowledgeQueryCache();

  const query = { requester: "athena", domain: "knowledge.scale.topic.07", projectId: "scale-project-main", scope: "PUBLIC" as const, query: "solsticeacousticneedle", purpose: "retrieval scale benchmark", limit: 20 };
  const started = performance.now();
  const first = await queryKnowledge(query);
  const coldMs = performance.now() - started;
  assert(first.some(({ id }) => id === "scale-2000"), "target in large document should be retrieved");
  assert(!first.some(({ id }) => id === "scale-private"), "retrieval candidates must still pass access policy");

  const warmStarted = performance.now();
  for (let offset = 0; offset < 20; offset += 1) {
    const warm = await queryKnowledge({ ...query, query: `itemmarker${offset * 50}` });
    assert(warm.length <= 1);
  }
  const warmAverageMs = (performance.now() - warmStarted) / 20;
  console.log(`Knowledge retrieval scale: ${records.length} items; cold ${coldMs.toFixed(1)} ms; warm average ${warmAverageMs.toFixed(1)} ms`);
  assert(coldMs < 15_000, "cold retrieval should complete within the generous regression ceiling");
  assert(warmAverageMs < 1_000, "indexed warm retrieval should remain responsive");

  await storeKnowledge({ ...makeItem("scale-new-target", "solsticeacousticneedle new target", 10_000), primaryDomain: "knowledge.scale.topic.07", relatedProjectIds: ["scale-project-main"] });
  const afterWrite = await queryKnowledge(query);
  assert(afterWrite.some(({ id }) => id === "scale-new-target"), "writes must invalidate the derived retrieval index");
  await revokeKnowledge("scale-new-target");
  const afterRevoke = await queryKnowledge(query);
  assert(!afterRevoke.some(({ id }) => id === "scale-new-target"), "revocations must invalidate the derived retrieval index");
  console.log("Knowledge retrieval scale and invalidation tests passed");
}

void main();
