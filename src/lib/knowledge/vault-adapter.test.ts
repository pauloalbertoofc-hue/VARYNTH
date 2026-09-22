import assert from "node:assert/strict";
import { knowledgeFromVaultItem } from "./vault-adapter";

const item = knowledgeFromVaultItem({
  id: "v1", title: "Introdução ao Direito", type: "livro", tags: ["juridico"], category: "Direito",
  primarySubject: "Direito", readingStatus: "para_ler", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-02T00:00:00.000Z",
});
assert.equal(item.id, "vault:v1");
assert.equal(item.primaryDomain, "legal");
assert.equal(item.provenance.sourceType, "VAULT_ITEM");
assert.equal(item.provenance.sourceReference, "vault-item:v1");
assert.equal(item.updatedAt, "2026-01-02T00:00:00.000Z");
assert.equal(item.provenance.inferred, false);

const explicitGeneral = knowledgeFromVaultItem({
  id: "v2", title: "Escolha humana", type: "ideia", tags: ["harmonia"], category: "Não ficção",
  primarySubject: "Conhecimento geral", classificationSource: "manual", readingStatus: "para_ler",
  createdAt: "2026-02-01T00:00:00.000Z", updatedAt: "2026-02-02T00:00:00.000Z",
});
assert.equal(explicitGeneral.primaryDomain, "general-knowledge");
assert.equal(explicitGeneral.classification?.source, "USER_CORRECTED");
assert.equal(explicitGeneral.classification?.confidence, 1);
assert.equal(explicitGeneral.provenance.inferred, false);

const inferred = knowledgeFromVaultItem({
  id: "v3", title: "Introdução", content: "Harmonia musical", type: "artigo", tags: [], category: "Não ficção",
  readingStatus: "para_ler", createdAt: "2026-03-01T00:00:00.000Z", updatedAt: "2026-03-02T00:00:00.000Z",
});
assert.equal(inferred.primaryDomain, "music");
assert.equal(inferred.provenance.inferred, true);

const uncertain = knowledgeFromVaultItem({
  id: "v4", title: "Anotações variadas", type: "ideia", tags: [], category: "Não ficção",
  readingStatus: "para_ler", createdAt: "2026-04-01T00:00:00.000Z", updatedAt: "2026-04-02T00:00:00.000Z",
});
assert.equal(uncertain.primaryDomain, "general-knowledge");
assert.equal(uncertain.provenance.inferred, false);
console.log("Vault knowledge adapter tests passed");
