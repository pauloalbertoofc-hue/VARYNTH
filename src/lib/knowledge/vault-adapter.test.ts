import assert from "node:assert/strict";
import { knowledgeFromVaultItem } from "./vault-adapter";

const item = knowledgeFromVaultItem({
  id: "v1", title: "Introdução ao Direito", type: "livro", tags: ["juridico"], category: "Direito",
  primarySubject: "Direito", readingStatus: "para_ler", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-02T00:00:00.000Z",
});
assert.equal(item.id, "vault:v1");
assert.equal(item.primaryDomain, "legal");
assert.equal(item.provenance.sourceType, "VAULT_ITEM");
console.log("Vault knowledge adapter tests passed");
