import assert from "node:assert/strict";
import { knowledgeRepository } from "../persistence/repositories";
import { revokeVaultKnowledgeItem, syncVaultKnowledgeItem } from "./vault-projection";

async function main() {
  await knowledgeRepository.clear();
  const source = {
    id: "projection-vault-1", title: "Harmony guide", content: "A reference about harmony.", type: "livro" as const,
    tags: ["music"], category: "Music", primarySubject: "Música", classificationSource: "manual" as const,
    readingStatus: "para_ler" as const, createdAt: "2026-04-01T00:00:00.000Z", updatedAt: "2026-04-02T00:00:00.000Z",
  };
  const [first, duplicate] = await Promise.all([syncVaultKnowledgeItem(source), syncVaultKnowledgeItem(source)]);
  assert.equal(first.version, 1);
  assert.equal(duplicate.version, 1);

  const edited = { ...source, content: "Updated source content.", updatedAt: "2026-04-03T00:00:00.000Z" };
  const updated = await syncVaultKnowledgeItem(edited);
  assert.equal(updated.version, 2);
  assert.equal(updated.provenance.sourceReference, "vault-item:projection-vault-1");
  assert.equal(updated.provenance.createdAt, source.createdAt);
  assert.equal(updated.content, "Updated source content.");

  const correctedSource = { ...edited, knowledgeDomains: ["music.composition.harmony", "game-development"], knowledgeCategories: ["Composition"], knowledgeTags: ["reviewed"] };
  const corrected = await syncVaultKnowledgeItem(correctedSource);
  const correctedAgain = await syncVaultKnowledgeItem(correctedSource);
  assert.equal(corrected.primaryDomain, "music.composition.harmony");
  assert.deepEqual(corrected.relatedDomains, ["game-development"]);
  assert.deepEqual(corrected.categories, ["Composition"]);
  assert.deepEqual(corrected.tags, ["reviewed"]);
  assert.equal(correctedAgain.version, corrected.version);

  const [revoked, duplicateRevocation] = await Promise.all([
    revokeVaultKnowledgeItem(source.id),
    revokeVaultKnowledgeItem(source.id),
  ]);
  assert.ok(revoked?.invalidatedAt);
  assert.ok(duplicateRevocation?.invalidatedAt);
  assert.equal(await revokeVaultKnowledgeItem("not-projected"), null);
  console.log("Vault knowledge projection tests passed");
}

void main();
