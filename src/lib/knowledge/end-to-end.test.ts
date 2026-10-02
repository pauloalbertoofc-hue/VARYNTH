import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { persistVaultKnowledgeProjection } from "./vault-persistence.server";
import { requestDomainResponse } from "./protocol";
import { knowledgeRepository } from "../persistence/repositories";
import { queryKnowledge, revokeKnowledge } from "./service";

async function main() {
  const sourceContent = `A fonte descreve licenciamento e copyright. ${"Condições de uso comercial e licenças dependem do contrato e da jurisdição. ".repeat(35)}`;
  const vaultItem = { id: "e2e-vault", title: "Copyright de trilha musical", content: sourceContent, type: "livro" as const, tags: ["copyright"], category: "Direito", primarySubject: "Direito", readingStatus: "para_ler" as const, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  await persistVaultKnowledgeProjection(vaultItem);
  const unauthorized = await requestDomainResponse({ requester: "athena", domain: "legal", query: "copyright trilha", purpose: "global awareness is not domain access", scope: "DOMAIN" });
  assert.ok(!unauthorized.sources.includes("vault:e2e-vault"));
  const response = await requestDomainResponse({ requester: "justitia", domain: "legal", query: "copyright trilha", purpose: "consulta pelo especialista responsável", scope: "DOMAIN" });
  assert.equal(response.specialistAgent, "justitia");
  assert.ok(response.sources.some((id) => id.startsWith("vault:e2e-vault::chunk:")));
  assert.ok(response.packet.facts.some((fact) => {
    const span = fact.sourceSpan;
    return span?.sourceId === "vault:e2e-vault" && span.contentHash.length === 64
      && span.end - span.start === Array.from(fact.content).length
      && span.contentHash === createHash("sha256").update(fact.content).digest("hex")
      && fact.truncated;
  }));
  assert.ok(response.packet.facts.some((fact) => fact.derivedFromIds.includes("vault:e2e-vault")));
  assert.ok(response.answer.includes("Copyright"));
  assert.ok(response.packet.constraints.some((constraint) => constraint.includes("autorizado")));
  assert.ok(response.packet.constraints.some((constraint) => constraint.includes("raciocínio interno")));
  assert.ok(response.packet.constraints.some((constraint) => constraint.includes("oito fatos")));
  const consultedChunkId = response.sources[0];
  const preclassifiedChunk = await knowledgeRepository.getById(consultedChunkId);
  const reclassified = await persistVaultKnowledgeProjection({ ...vaultItem, classificationSource: "manual", knowledgeCategories: ["Direito autoral"], knowledgeTags: ["human-reviewed-copyright"] });
  const reclassifiedChunks = await knowledgeRepository.getAll((item) => item.provenance.derivedFromIds?.includes(reclassified.id) === true && !item.invalidatedAt);
  assert.ok(reclassifiedChunks.length > 0);
  assert.ok(reclassifiedChunks.every((chunk) => chunk.categories.includes("Direito autoral") && chunk.tags.includes("human-reviewed-copyright")), "same-content taxonomy edits must refresh indexed chunks");
  assert.equal((await knowledgeRepository.getById(consultedChunkId))?.version, preclassifiedChunk?.version, "metadata-only updates must not create content-history versions");
  const reclassifiedSearch = await queryKnowledge({ requester: "justitia", domain: "legal", category: "Direito autoral", purpose: "verify metadata-only Vault reindexing", scope: "DOMAIN" });
  assert.ok(reclassifiedSearch.some((chunk) => chunk.id === consultedChunkId), "metadata-only projection updates must invalidate retrieval indexes and apply new taxonomy filters");
  const revised = await persistVaultKnowledgeProjection({ ...vaultItem, content: "Versão revisada sem o conteúdo anterior.", updatedAt: new Date(Date.now() + 1000).toISOString() });
  assert.equal(revised.id, "vault:e2e-vault");
  assert.ok((await knowledgeRepository.getById(consultedChunkId))?.invalidatedAt, "content updates must revoke stale source chunks");
  const activeChunks = await knowledgeRepository.getAll((item) => item.provenance.derivedFromIds?.includes(revised.id) === true && !item.invalidatedAt);
  assert.ok(activeChunks.length > 0, "the revised Vault source should still have searchable chunks before revocation");
  await revokeKnowledge(revised.id);
  for (const chunk of activeChunks) assert.ok((await knowledgeRepository.getById(chunk.id))?.invalidatedAt, "revoking a Vault source must cascade to every derived chunk");
  const afterRevocation = await queryKnowledge({ requester: "justitia", domain: "legal", query: "versão revisada conteúdo anterior", purpose: "verify Vault source revocation cascade", scope: "DOMAIN" });
  assert.equal(afterRevocation.some((item) => item.id === revised.id || item.provenance.derivedFromIds?.includes(revised.id)), false, "revoked Vault content and all derived chunks must disappear from retrieval");
  console.log("Knowledge Vault-to-domain end-to-end test passed");
}
void main();
