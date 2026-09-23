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
assert.equal(canonicalVaultProjection({ ...source, readingStatus: "untrusted" }), null);
console.log("Canonical Vault projection tests passed");
