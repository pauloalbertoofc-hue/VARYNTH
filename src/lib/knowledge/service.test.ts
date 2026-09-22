import assert from "node:assert/strict";
import { DomainRegistry } from "./domain-registry";
import { decideKnowledgeAccess } from "./policy";
import { KnowledgeItem } from "./contracts";

const registry = new DomainRegistry();
registry.register({ id: "music", label: "Music", primaryOwner: "euterpe", specialists: ["euterpe"], capabilities: [], relatedDomains: [], enabled: true });
assert.equal(registry.resolveOwner("music.game-audio"), "euterpe");

const item: KnowledgeItem = { id: "k1", title: "Audio formats", content: "WAV and OGG", primaryDomain: "music", relatedDomains: [], categories: [], tags: ["audio"], ownerAgent: "euterpe", contributingAgents: [], visibility: "PUBLIC_TO_AGENTS", sensitivity: "PUBLIC", kind: "PUBLIC_DOMAIN", assertion: "FACT", provenance: { sourceType: "INTERNAL_DOCUMENT", addedBy: "AGENT", agentId: "euterpe", createdAt: new Date().toISOString(), authority: "INTERNAL_DOCUMENT", inferred: false }, version: 1, freshness: "CURRENT", relatedProjectIds: [], relatedArtifactIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
assert.equal(decideKnowledgeAccess(item, { requester: "justitia", domain: "music", purpose: "technical context", scope: "PUBLIC" }).decision, "ALLOW");
assert.equal(decideKnowledgeAccess({ ...item, visibility: "AGENT_PRIVATE", sensitivity: "PRIVATE" }, { requester: "justitia", purpose: "context" }).decision, "DENY");
console.log("Knowledge core tests passed");
