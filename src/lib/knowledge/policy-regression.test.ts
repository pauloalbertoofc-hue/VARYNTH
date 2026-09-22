import assert from "node:assert/strict";
import { decideKnowledgeAccess } from "./policy";
import type { KnowledgeItem } from "./contracts";

const base: KnowledgeItem = { id: "policy-1", title: "Policy test", content: "private", primaryDomain: "legal", relatedDomains: [], categories: [], tags: [], ownerAgent: "justitia", contributingAgents: [], visibility: "PUBLIC_TO_AGENTS", sensitivity: "PUBLIC", kind: "PUBLIC_DOMAIN", assertion: "FACT", provenance: { sourceType: "TEST", addedBy: "SYSTEM", createdAt: new Date().toISOString(), authority: "INTERNAL_DOCUMENT", inferred: false }, version: 1, freshness: "CURRENT", relatedProjectIds: [], relatedArtifactIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };

assert.equal(decideKnowledgeAccess(base, { requester: "euterpe", purpose: "public context", scope: "PUBLIC" }).decision, "ALLOW");
assert.equal(decideKnowledgeAccess({ ...base, visibility: "AGENT_PRIVATE", sensitivity: "PRIVATE" }, { requester: "euterpe", purpose: "private context" }).decision, "DENY");
assert.equal(decideKnowledgeAccess({ ...base, visibility: "PROJECT", relatedProjectIds: ["project-a"] }, { requester: "euterpe", projectId: "project-b", purpose: "cross-project" }).decision, "DENY");
assert.equal(decideKnowledgeAccess({ ...base, visibility: "PROJECT", relatedProjectIds: [] }, { requester: "euterpe", purpose: "unscoped project item" }).decision, "DENY");
assert.equal(decideKnowledgeAccess({ ...base, visibility: "DOMAIN", sensitivity: "INTERNAL" }, { requester: "athena", purpose: "global awareness is not content access" }).decision, "DENY");
assert.equal(decideKnowledgeAccess({ ...base, visibility: "DOMAIN", sensitivity: "INTERNAL" }, { requester: "justitia", purpose: "owner domain access" }).decision, "ALLOW");
assert.equal(decideKnowledgeAccess({ ...base, visibility: "SYSTEM", sensitivity: "PRIVATE" }, { requester: "athena", purpose: "private system item" }).decision, "DENY");
assert.equal(decideKnowledgeAccess({ ...base, visibility: "SYSTEM", sensitivity: "INTERNAL" }, { requester: "athena", purpose: "system knowledge" }).decision, "ALLOW");
console.log("Knowledge policy regression tests passed");
