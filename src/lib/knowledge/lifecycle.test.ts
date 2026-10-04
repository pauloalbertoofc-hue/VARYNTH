import assert from "node:assert/strict";
import { knowledgeRepository } from "../persistence/repositories";
import { discoverKnowledge, linkKnowledge, listKnowledgeLifecycleItems, publishKnowledge, queryKnowledge, revokeKnowledge, storeKnowledge, updateKnowledge } from "./service";
import { requestKnowledgePacket } from "./protocol";
import type { KnowledgeItem } from "./contracts";

const now = new Date().toISOString();
function item(id: string, overrides: Partial<KnowledgeItem> = {}): KnowledgeItem {
  return {
    id, title: id, content: `content for ${id}`, primaryDomain: "music", relatedDomains: [], categories: [], tags: ["lifecycle"], ownerAgent: "euterpe", contributingAgents: [],
    visibility: "PUBLIC_TO_AGENTS", sensitivity: "PUBLIC", kind: "REFERENCE", assertion: "FACT",
    provenance: { sourceType: "TEST", addedBy: "SYSTEM", createdAt: now, authority: "OFFICIAL_REFERENCE", inferred: false },
    version: 1, freshness: "CURRENT", relatedProjectIds: [], relatedArtifactIds: [], createdAt: now, updatedAt: now, ...overrides,
  };
}
const request = (requester: string, query: string) => ({ requester, domain: "music", query, purpose: "knowledge lifecycle test", scope: "PUBLIC" as const });

async function main() {
  await storeKnowledge(item("lifecycle-source"));
  await storeKnowledge(item("lifecycle-derived", { provenance: { sourceType: "AGENT_GENERATED", addedBy: "AGENT", agentId: "euterpe", createdAt: now, authority: "AGENT_GENERATED", inferred: false, derivedFromIds: ["lifecycle-source"] } }));
  await linkKnowledge({ id: "lifecycle-derived-edge", fromId: "lifecycle-derived", toId: "lifecycle-source", type: "DERIVED_FROM" });
  await storeKnowledge(item("lifecycle-dependent", { provenance: { sourceType: "TEST", addedBy: "SYSTEM", createdAt: now, authority: "INTERNAL_DOCUMENT", inferred: false } }));
  await linkKnowledge({ id: "lifecycle-dependency-edge", fromId: "lifecycle-dependent", toId: "lifecycle-source", type: "DEPENDS_ON" });
  await storeKnowledge(item("lifecycle-transitive-dependent"));
  await linkKnowledge({ id: "lifecycle-transitive-edge", fromId: "lifecycle-transitive-dependent", toId: "lifecycle-dependent", type: "DEPENDS_ON" });
  await updateKnowledge("lifecycle-source", "euterpe", { content: "updated canonical source" });

  const derived = await knowledgeRepository.getById("lifecycle-derived");
  const dependent = await knowledgeRepository.getById("lifecycle-dependent");
  assert.equal(derived?.lifecycleState, "REVIEW");
  assert.equal(derived?.freshness, "POSSIBLY_STALE");
  assert.equal(dependent?.lifecycleState, "REVIEW", "dependency edges must trigger review after source changes");
  assert.equal((await knowledgeRepository.getById("lifecycle-transitive-dependent"))?.lifecycleState, "REVIEW", "review must propagate through the complete dependency chain");

  await storeKnowledge(item("lifecycle-draft", { lifecycleState: "DRAFT" }));
  await storeKnowledge(item("lifecycle-review", { lifecycleState: "REVIEW" }));
  await storeKnowledge(item("lifecycle-stale", { lifecycleState: "STALE", freshness: "POSSIBLY_STALE" }));
  await storeKnowledge(item("lifecycle-archived", { lifecycleState: "ARCHIVED" }));
  await storeKnowledge(item("lifecycle-deprecated", { lifecycleState: "DEPRECATED" }));
  const inventory = await listKnowledgeLifecycleItems();
  assert.equal(inventory.some((entry) => entry.id === "lifecycle-draft"), true, "owner inventory must include drafts hidden from ordinary retrieval");
  assert.equal(inventory.some((entry) => entry.id === "lifecycle-archived"), true, "owner inventory must allow restoration of archived knowledge");

  assert.equal((await queryKnowledge(request("athena", "lifecycle-draft"))).some((entry) => entry.id === "lifecycle-draft"), false);
  assert.equal((await queryKnowledge(request("euterpe", "lifecycle-draft"))).some((entry) => entry.id === "lifecycle-draft"), true);
  assert.equal((await discoverKnowledge(request("athena", ""))).some((entry) => entry.id === "lifecycle-review"), false);
  assert.equal((await discoverKnowledge(request("euterpe", ""))).some((entry) => entry.id === "lifecycle-review"), true);
  const publicResults = await queryKnowledge(request("athena", "lifecycle"));
  assert.equal(publicResults.some((entry) => entry.id === "lifecycle-archived" || entry.id === "lifecycle-deprecated"), false);
  assert.equal(publicResults.some((entry) => entry.id === "lifecycle-stale"), true, "stale knowledge remains available for historical use");
  const packet = await requestKnowledgePacket({ ...request("athena", "lifecycle-stale"), provider: "euterpe" });
  assert.equal(packet.facts[0]?.lifecycleState, "STALE", "cross-agent packets must preserve lifecycle warnings");

  await assert.rejects(() => updateKnowledge("lifecycle-source", "another-agent", { lifecycleState: "ARCHIVED" }), /KNOWLEDGE_UPDATE_DENIED/);
  await assert.rejects(() => updateKnowledge("lifecycle-source", "euterpe", { lifecycleState: "NOT_A_STATE" as KnowledgeItem["lifecycleState"] }), /KNOWLEDGE_LIFECYCLE_STATE_INVALID/);
  await assert.rejects(() => publishKnowledge("lifecycle-stale", "euterpe"), /KNOWLEDGE_PUBLISH_LIFECYCLE/);
  await updateKnowledge("lifecycle-source", "euterpe", { lifecycleState: "DEPRECATED" });
  await assert.rejects(() => updateKnowledge("lifecycle-source", "euterpe", { lifecycleState: "ACTIVE" }), /KNOWLEDGE_LIFECYCLE_TRANSITION_INVALID/);

  await revokeKnowledge("lifecycle-source");
  assert.ok((await knowledgeRepository.getById("lifecycle-derived"))?.invalidatedAt, "revoking a source invalidates derived content");
  assert.equal((await knowledgeRepository.getById("lifecycle-dependent"))?.lifecycleState, "REVIEW", "revoking a dependency requests review without deleting its dependent");
  assert.equal((await knowledgeRepository.getById("lifecycle-transitive-dependent"))?.lifecycleState, "REVIEW");
  console.log("Knowledge lifecycle and dependency tests passed");
}

void main();
