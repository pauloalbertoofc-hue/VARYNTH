import assert from "node:assert/strict";
import { knowledgeRepository } from "../persistence/repositories";
import { discoverKnowledge, queryKnowledge, storeKnowledge } from "./service";

async function main() {
  const base = { id: "version-k1", title: "Versioned fact", content: "v1", primaryDomain: "music", relatedDomains: [], categories: [], tags: [], contributingAgents: [], visibility: "PUBLIC_TO_AGENTS" as const, sensitivity: "PUBLIC" as const, kind: "PUBLIC_DOMAIN" as const, assertion: "FACT" as const, provenance: { sourceType: "TEST", addedBy: "SYSTEM" as const, createdAt: new Date().toISOString(), authority: "INTERNAL_DOCUMENT" as const, inferred: false }, version: 1, freshness: "CURRENT" as const, relatedProjectIds: [], relatedArtifactIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  const first = await storeKnowledge(base);
  const second = await storeKnowledge({ ...base, content: "v2", updatedAt: new Date().toISOString() });
  assert.equal(first.version, 1);
  assert.equal(second.version, 2);
  assert.equal(second.supersedesId, `${first.id}::version:1`);
  const historicalV1 = await knowledgeRepository.getById(`${first.id}::version:1`);
  assert.equal(historicalV1?.content, "v1");
  assert.equal(historicalV1?.freshness, "HISTORICAL");
  const third = await storeKnowledge({ ...second, content: "v3", updatedAt: new Date().toISOString() });
  assert.equal(third.version, 3);
  assert.equal(third.supersedesId, `${first.id}::version:2`);
  assert.equal((await knowledgeRepository.getById(`${first.id}::version:2`))?.content, "v2");
  const retrieved = await queryKnowledge({ requester: "athena", domain: "music", query: "Versioned fact", purpose: "versioning regression", scope: "PUBLIC" });
  assert.deepEqual(retrieved.map((entry) => [entry.id, entry.content]), [[first.id, "v3"]]);
  const discovered = await discoverKnowledge({ requester: "athena", domain: "music", query: "Versioned fact", purpose: "versioning regression", scope: "PUBLIC" });
  assert.deepEqual(discovered.map((entry) => entry.id), [first.id]);
  await Promise.all(Array.from({ length: 5 }, (_, index) => storeKnowledge({ ...third, content: `parallel-${index}`, updatedAt: new Date(Date.now() + index + 1).toISOString() })));
  const afterConcurrentWrites = await knowledgeRepository.getById(first.id);
  assert.equal(afterConcurrentWrites?.version, 8);
  const concurrentRetrieval = await queryKnowledge({ requester: "athena", domain: "music", query: "Versioned fact", purpose: "concurrent versioning regression", scope: "PUBLIC" });
  assert.deepEqual(concurrentRetrieval.map((entry) => entry.id), [first.id]);
  console.log("Knowledge versioning tests passed");
}
void main();
