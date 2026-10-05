import assert from "node:assert/strict";
import { canonicalVaultProjection } from "./vault-sync";

const source = {
  id: "source-1", title: "Vault source", type: "livro", tags: ["music"], category: "Music",
  readingStatus: "para_ler", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-02T00:00:00.000Z",
  relatedProjectIds: [],
};

const forged = canonicalVaultProjection({
  ...source,
  visibility: "PUBLIC_TO_AGENTS",
  sensitivity: "PUBLIC",
  ownerAgent: "forged-agent",
  provenance: { sourceType: "AGENT_GENERATED", authority: "PRIMARY_SOURCE" },
});

assert.ok(forged);
assert.equal(forged.visibility, "DOMAIN");
assert.equal(forged.sensitivity, "INTERNAL");
assert.equal(forged.ownerAgent, undefined);
assert.equal(forged.provenance.sourceType, "VAULT_ITEM");
const governed = canonicalVaultProjection({ ...source, knowledgeDomains: ["legal", "music"], knowledgeOwnerAgent: "justitia", knowledgeVisibility: "DOMAIN", knowledgeSensitivity: "SENSITIVE" });
assert.equal(governed?.primaryDomain, "legal");
assert.deepEqual(governed?.relatedDomains, ["music"]);
assert.equal(governed?.ownerAgent, "justitia");
assert.equal(governed?.visibility, "DOMAIN");
assert.equal(governed?.sensitivity, "SENSITIVE");
const historical = canonicalVaultProjection({ ...source, knowledgeOwnerHistory: [{ fromAgent: "euterpe", toAgent: "justitia", changedAt: "2026-02-01T00:00:00.000Z", changedBy: "USER", actorId: "owner_1" }] });
assert.equal(historical?.ownershipHistory?.[0].toAgent, "justitia");
assert.equal(canonicalVaultProjection({ ...source, knowledgeOwnerHistory: [{ fromAgent: "euterpe", toAgent: "justitia", changedAt: "bad", changedBy: "OWNER" }] }), null);
assert.equal(canonicalVaultProjection({ ...source, knowledgeVisibility: "SYSTEM" }), null);
assert.equal(canonicalVaultProjection({ ...source, knowledgeOwnerAgent: "bad owner id" }), null);
assert.equal(canonicalVaultProjection({ ...source, knowledgeVisibility: "PUBLIC_TO_AGENTS", knowledgeSensitivity: "PRIVATE" }), null);
assert.equal(canonicalVaultProjection({ ...source, readingStatus: "untrusted" }), null);
console.log("Canonical Vault projection tests passed");
