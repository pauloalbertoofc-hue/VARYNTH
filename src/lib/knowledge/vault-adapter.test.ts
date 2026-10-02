import assert from "node:assert/strict";
import { knowledgeFromVaultItem, knowledgeChunksFromVaultItem, knowledgeProjectionMatches } from "./vault-adapter";

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
const correctedTaxonomy = knowledgeFromVaultItem({
  id: "v5", title: "Correção interdisciplinar", type: "artigo", tags: ["original-tag"], category: "Não ficção",
  readingStatus: "para_ler", createdAt: "2026-05-01T00:00:00.000Z", updatedAt: "2026-05-02T00:00:00.000Z",
  knowledgeDomains: ["music.composition.harmony", "game-development"], knowledgeCategories: ["Composition"], knowledgeTags: ["human-reviewed"],
});
assert.equal(correctedTaxonomy.primaryDomain, "music.composition.harmony");
assert.deepEqual(correctedTaxonomy.relatedDomains, ["game-development"]);
assert.deepEqual(correctedTaxonomy.categories, ["Composition"]);
assert.deepEqual(correctedTaxonomy.tags, ["human-reviewed"]);
assert.equal(correctedTaxonomy.classification?.source, "USER_CORRECTED");
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
async function verifySourceChunks() {
  const content = `${"á🙂, texto com origem. ".repeat(100)}FIM-DA-FONTE`;
  const source = { id: "chunk-source", title: "Fonte longa", type: "livro" as const, content, tags: [], category: "Não ficção", readingStatus: "lendo" as const, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-02T00:00:00.000Z" };
  const chunks = await knowledgeChunksFromVaultItem(source);
  assert.ok(chunks.length > 1);
  assert.equal(chunks[0].id, (await knowledgeChunksFromVaultItem(source))[0].id, "chunk IDs must be stable");
  assert.equal(knowledgeProjectionMatches(chunks[0], chunks[0]), true);
  assert.equal(knowledgeProjectionMatches({ ...chunks[0], tags: ["stale-tag"] }, chunks[0]), false, "taxonomy changes must refresh stable chunk IDs");
  assert.equal(knowledgeProjectionMatches({ ...chunks[0], provenance: { ...chunks[0].provenance, sourceReference: "stale-reference" } }, chunks[0]), false, "source metadata changes must refresh stable chunk IDs");
  assert.equal(chunks[0].provenance.span?.unit, "UNICODE_CODE_POINTS");
  assert.ok(chunks.every((chunk) => chunk.provenance.span?.sourceId === "vault:chunk-source"));
  assert.ok(chunks.every((chunk) => chunk.provenance.span?.contentHash.length === 64));
  const points = Array.from(content.trim());
  for (const chunk of chunks) {
    const span = chunk.provenance.span!;
    assert.equal(points.slice(span.start, span.end).join(""), chunk.content);
    assert.equal(chunk.provenance.derivedFromIds?.[0], "vault:chunk-source");
  }
  assert.equal(chunks.map((chunk) => chunk.content).join("").includes("FIM-DA-FONTE"), true);
  console.log("Vault knowledge adapter tests passed");
}

async function verifySemanticSections() {
  const firstParagraph = `${"Conteúdo da seção inicial, preservado em parágrafos. ".repeat(18)}\n\n`;
  const secondSection = `## Segunda seção\n\n${"Conteúdo da segunda seção com rastreabilidade. ".repeat(36)}`;
  const content = `# Documento\n\n${firstParagraph}${secondSection}`;
  const source = { id: "section-source", title: "Documento estruturado", type: "pdf" as const, content, tags: [], category: "Referência", readingStatus: "lendo" as const, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-02T00:00:00.000Z" };
  const chunks = await knowledgeChunksFromVaultItem(source);
  assert.ok(chunks.some((chunk) => chunk.provenance.span?.sectionPath?.includes("Segunda seção")), "chunks must retain Markdown section ancestry");
  assert.ok(chunks.some((chunk) => chunk.title.includes("Segunda seção")), "section titles must aid retrieval");
  assert.ok(chunks.some((chunk) => chunk.content.startsWith("## Segunda seção") && chunk.provenance.span?.sectionPath?.includes("Segunda seção")), "chunk boundaries must align to a section heading when the boundary is nearby");
  const points = Array.from(content);
  for (const chunk of chunks) {
    const span = chunk.provenance.span!;
    assert.equal(points.slice(span.start, span.end).join(""), chunk.content);
    assert.ok(chunk.content.length <= 1200);
  }
}
void verifySourceChunks();
void verifySemanticSections();
