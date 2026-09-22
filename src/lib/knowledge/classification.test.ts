import assert from "node:assert/strict";
import { applyKnowledgeClassification, suggestKnowledgeClassification } from "./classification";
import type { KnowledgeItem } from "./contracts";

const suggestion = suggestKnowledgeClassification({ title: "Manual de licenciamento musical", content: "", tags: [], fileName: "manual.pdf" });
assert.equal(suggestion.primaryDomain, "music");
assert.ok(suggestion.confidence > 0);
const item = { id: "classification-1", title: "Fonte", content: "", primaryDomain: "general-knowledge", relatedDomains: [], categories: [], tags: [], contributingAgents: [], visibility: "DOMAIN", sensitivity: "INTERNAL", kind: "DOCUMENT", assertion: "REFERENCE", provenance: { sourceType: "TEST", addedBy: "SYSTEM", createdAt: new Date().toISOString(), authority: "UNKNOWN", inferred: false }, version: 1, freshness: "CURRENT", relatedProjectIds: [], relatedArtifactIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as KnowledgeItem;
assert.equal(applyKnowledgeClassification(item, { primaryDomain: "music.game-audio" }).classification?.source, "USER_CORRECTED");
console.log("Knowledge classification tests passed");
