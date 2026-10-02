import type { VaultItem } from "../types/vault";
import { knowledgeRepository } from "../persistence/repositories";
import { knowledgeChunksFromVaultItem, knowledgeFromVaultItem, knowledgeProjectionMatches } from "./vault-adapter";
import { linkKnowledge, revokeKnowledge, storeKnowledge, storeKnowledgeProjection } from "./service";

/** Canonically persist the Vault parent and its hashed text chunks within the account scope. */
export async function persistVaultKnowledgeProjection(item: VaultItem) {
  const parent = knowledgeFromVaultItem(item);
  const chunks = await knowledgeChunksFromVaultItem(item);
  const existing = await knowledgeRepository.getAll((candidate) => candidate.provenance.derivedFromIds?.includes(parent.id) === true);
  const desiredIds = new Set(chunks.map((chunk) => chunk.id));
  for (const stale of existing.filter((chunk) => !desiredIds.has(chunk.id) && !chunk.invalidatedAt)) await revokeKnowledge(stale.id);
  const stored = await storeKnowledge(parent);
  for (const chunk of chunks) {
    const current = await knowledgeRepository.getById(chunk.id);
    if (!knowledgeProjectionMatches(current, chunk)) await storeKnowledgeProjection(chunk);
    await linkKnowledge({ id: `derived:${chunk.id}`, fromId: chunk.id, toId: parent.id, type: "DERIVED_FROM" });
  }
  return stored;
}
