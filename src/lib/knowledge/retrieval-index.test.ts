import assert from "node:assert/strict";
import { buildKnowledgeRetrievalIndex, nextKnowledgeValidityBoundary, scoreKnowledgeRelevance, selectKnowledgeCandidates } from "./retrieval-index";
import type { KnowledgeItem } from "./contracts";

const now = Date.now();
const item = (id: string, overrides: Partial<KnowledgeItem> = {}): KnowledgeItem => ({
  id, title: `Title ${id}`, content: "harmonics and rhythm", primaryDomain: "arts.music", relatedDomains: [], categories: [], tags: [],
  contributingAgents: [], visibility: "PUBLIC_TO_AGENTS", sensitivity: "PUBLIC", kind: "REFERENCE", assertion: "FACT",
  provenance: { sourceType: "TEST", addedBy: "SYSTEM", createdAt: new Date(now).toISOString(), authority: "USER_PROVIDED", inferred: false },
  version: 1, freshness: "CURRENT", relatedProjectIds: [], relatedArtifactIds: [], createdAt: new Date(now).toISOString(), updatedAt: new Date(now).toISOString(),
  ...overrides,
});

const items = [
  item("primary", { primaryDomain: "arts.music.theory", categories: ["theory"], relatedProjectIds: ["p1"], validFrom: new Date(now + 10_000).toISOString() }),
  item("related", { primaryDomain: "arts.visual", relatedDomains: ["arts.music"], relatedProjectIds: [] }),
  item("other-project", { relatedProjectIds: ["p2"] }),
  item("superseded"),
  item("replacement", { supersedesId: "superseded" }),
  item("revoked", { invalidatedAt: new Date(now).toISOString() }),
  item("parent", { content: "harmonics source", provenance: { sourceType: "TEST", addedBy: "SYSTEM", createdAt: new Date(now).toISOString(), authority: "USER_PROVIDED", inferred: false } }),
  item("chunk", { content: "harmonics chunk", provenance: { sourceType: "TEST", addedBy: "SYSTEM", createdAt: new Date(now).toISOString(), authority: "USER_PROVIDED", inferred: false, span: { sourceId: "parent", sourceReference: "test", start: 0, end: 9, unit: "UNICODE_CODE_POINTS", contentHash: "hash" }, derivedFromIds: ["parent"] } }),
];
const index = buildKnowledgeRetrievalIndex(items, 1);
const rarityIndex = buildKnowledgeRetrievalIndex([
  item("common", { content: "rhythm theory basics" }),
  item("rare", { content: "rhythm solsticeacousticneedle" }),
  ...Array.from({ length: 40 }, (_, offset) => item(`corpus-${offset}`, { content: "general rhythm theory reference" })),
], 2);
const request = { requester: "athena", purpose: "index test" };
assert.deepEqual(selectKnowledgeCandidates(index, { ...request, query: "harmonic" }).map(({ id }) => id), ["primary", "related", "other-project", "replacement", "chunk"]);
assert.deepEqual(selectKnowledgeCandidates(index, { ...request, domain: "arts.music" }).map(({ id }) => id), ["primary", "related", "other-project", "replacement", "chunk"]);
assert.deepEqual(selectKnowledgeCandidates(index, { ...request, projectId: "p1" }).map(({ id }) => id), ["primary", "related", "replacement", "chunk"]);
assert.deepEqual(selectKnowledgeCandidates(index, { ...request, category: " THEORY " }).map(({ id }) => id), ["primary"]);
assert.ok(scoreKnowledgeRelevance(index, "primary", "Title primary") > scoreKnowledgeRelevance(index, "related", "Title primary"));
assert.ok(scoreKnowledgeRelevance(rarityIndex, "rare", "solsticeacousticneedle") > scoreKnowledgeRelevance(rarityIndex, "common", "rhythm"), "rare, query-specific terms should outweigh generic corpus terms");
assert.equal(nextKnowledgeValidityBoundary(index, now), now + 10_000);
assert.equal(nextKnowledgeValidityBoundary(index, now + 20_000), Number.POSITIVE_INFINITY);
console.log("Knowledge retrieval index tests passed");
