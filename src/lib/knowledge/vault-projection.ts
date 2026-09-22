import type { VaultItem } from "../types/vault";
import { knowledgeRepository } from "../persistence/repositories";
import { knowledgeFromVaultItem } from "./vault-adapter";
import { revokeKnowledge, storeKnowledge } from "./service";

const operations = new Map<string, Promise<unknown>>();

function serializeByVaultId<T>(vaultId: string, operation: () => Promise<T>): Promise<T> {
  const key = `vault:${vaultId}`;
  const previous = operations.get(key) || Promise.resolve();
  const current = previous.catch(() => undefined).then(operation);
  operations.set(key, current);
  void current.finally(() => {
    if (operations.get(key) === current) operations.delete(key);
  }).catch(() => undefined);
  return current;
}

function projectionMatches(existing: Awaited<ReturnType<typeof knowledgeRepository.getById>>, projected: ReturnType<typeof knowledgeFromVaultItem>): boolean {
  if (!existing) return false;
  return existing.updatedAt === projected.updatedAt
    && existing.title === projected.title
    && existing.content === projected.content
    && existing.primaryDomain === projected.primaryDomain
    && existing.visibility === projected.visibility
    && existing.sensitivity === projected.sensitivity
    && existing.freshness === projected.freshness
    && existing.provenance.sourceReference === projected.provenance.sourceReference
    && existing.provenance.observedAt === projected.provenance.observedAt
    && existing.provenance.inferred === projected.provenance.inferred
    && JSON.stringify(existing.relatedDomains) === JSON.stringify(projected.relatedDomains)
    && JSON.stringify(existing.categories) === JSON.stringify(projected.categories)
    && JSON.stringify(existing.tags) === JSON.stringify(projected.tags)
    && JSON.stringify(existing.relatedProjectIds) === JSON.stringify(projected.relatedProjectIds)
    && JSON.stringify(existing.classification) === JSON.stringify(projected.classification);
}

/** Idempotently project one user-visible Vault item into the Knowledge index. */
export function syncVaultKnowledgeItem(item: VaultItem) {
  return serializeByVaultId(item.id, async () => {
    const projected = knowledgeFromVaultItem(item);
    const existing = await knowledgeRepository.getById(projected.id);
    if (projectionMatches(existing, projected)) return existing!;
    return storeKnowledge(projected);
  });
}

/** Revoke the Vault projection in order with any pending projection writes. */
export function revokeVaultKnowledgeItem(vaultId: string) {
  return serializeByVaultId(vaultId, async () => {
    const knowledgeId = `vault:${vaultId}`;
    if (!await knowledgeRepository.getById(knowledgeId)) return null;
    return revokeKnowledge(knowledgeId);
  });
}
