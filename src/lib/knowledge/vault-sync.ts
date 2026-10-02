import type { VaultItem, VaultItemType, ReadingStatus } from "../types/vault";
import { knowledgeRepository } from "../persistence/repositories";
import { knowledgeChunksFromVaultItem, knowledgeFromVaultItem, knowledgeProjectionMatches, mergeKnowledgeProjection } from "./vault-adapter";
import { linkKnowledge, revokeKnowledge, storeKnowledge } from "./service";
import type { KnowledgeItem } from "./contracts";

const VAULT_TYPES: VaultItemType[] = ["artigo", "livro", "jurisprudencia", "lei", "pdf", "link", "video", "citacao", "codigo", "ideia"];
const READING_STATUSES: ReadingStatus[] = ["para_ler", "lendo", "concluido", "arquivado"];

/** Rebuild a Vault projection on the server; never accept client-supplied policy fields. */
export function canonicalVaultProjection(value: unknown): KnowledgeItem | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<VaultItem>;
  if (typeof item.id !== "string" || !item.id || typeof item.title !== "string" || !item.title.trim()
    || !VAULT_TYPES.includes(item.type as VaultItemType) || !READING_STATUSES.includes(item.readingStatus as ReadingStatus)
    || !Array.isArray(item.tags) || !item.tags.every((tag) => typeof tag === "string")
    || typeof item.category !== "string" || typeof item.createdAt !== "string" || typeof item.updatedAt !== "string"
    || (item.content !== undefined && typeof item.content !== "string") || (item.summary !== undefined && typeof item.summary !== "string")
    || (item.notes !== undefined && typeof item.notes !== "string") || (item.url !== undefined && typeof item.url !== "string")
    || (item.relatedProjectIds !== undefined && (!Array.isArray(item.relatedProjectIds) || !item.relatedProjectIds.every((id) => typeof id === "string")))
    || (item.knowledgeDomains !== undefined && (!Array.isArray(item.knowledgeDomains) || !item.knowledgeDomains.every((id) => typeof id === "string")))
    || (item.knowledgeCategories !== undefined && (!Array.isArray(item.knowledgeCategories) || !item.knowledgeCategories.every((value) => typeof value === "string")))
    || (item.knowledgeTags !== undefined && (!Array.isArray(item.knowledgeTags) || !item.knowledgeTags.every((value) => typeof value === "string")))
  ) return null;
  return knowledgeFromVaultItem(item as VaultItem);
}

const operations = new Map<string, Promise<unknown>>();

async function syncServer(operation: "UPSERT_VAULT" | "REVOKE_VAULT", data: { item?: VaultItem; id?: string }) {
  if (typeof window === "undefined") return;
  const response = await fetch("/api/knowledge/items", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ operation, ...data }),
  });
  const result = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) throw new Error(result.error || "Não foi possível sincronizar a projeção do Vault com Knowledge.");
}

function serializeByVaultId<T>(vaultId: string, operation: () => Promise<T>): Promise<T> {
  const key = `vault:${vaultId}`;
  const previous = operations.get(key) || Promise.resolve();
  const current = previous.catch(() => undefined).then(operation);
  operations.set(key, current);
  void current.finally(() => { if (operations.get(key) === current) operations.delete(key); }).catch(() => undefined);
  return current;
}

function projectionMatches(existing: Awaited<ReturnType<typeof knowledgeRepository.getById>>, projected: ReturnType<typeof knowledgeFromVaultItem>): boolean {
  if (!existing) return false;
  return existing.updatedAt === projected.updatedAt
    && existing.title === projected.title && existing.content === projected.content
    && existing.primaryDomain === projected.primaryDomain && existing.visibility === projected.visibility
    && existing.sensitivity === projected.sensitivity && existing.freshness === projected.freshness
    && existing.provenance.sourceReference === projected.provenance.sourceReference
    && existing.provenance.observedAt === projected.provenance.observedAt
    && existing.provenance.inferred === projected.provenance.inferred
    && JSON.stringify(existing.relatedDomains) === JSON.stringify(projected.relatedDomains)
    && JSON.stringify(existing.categories) === JSON.stringify(projected.categories)
    && JSON.stringify(existing.tags) === JSON.stringify(projected.tags)
    && JSON.stringify(existing.relatedProjectIds) === JSON.stringify(projected.relatedProjectIds)
    && JSON.stringify(existing.classification) === JSON.stringify(projected.classification);
}

/** Idempotently project a Vault item and its source-addressable chunks into local Knowledge. */
export function syncVaultKnowledgeItem(item: VaultItem) {
  return serializeByVaultId(item.id, async () => {
    const projected = knowledgeFromVaultItem(item);
    const chunks = await knowledgeChunksFromVaultItem(item);
    const existing = await knowledgeRepository.getById(projected.id);
    const stored = projectionMatches(existing, projected) ? existing! : await storeKnowledge(projected);
    const desiredIds = new Set(chunks.map((chunk) => chunk.id));
    const oldChunks = await knowledgeRepository.getAll((candidate) => candidate.provenance.derivedFromIds?.includes(projected.id) === true);
    for (const stale of oldChunks.filter((chunk) => !desiredIds.has(chunk.id) && !chunk.invalidatedAt)) await revokeKnowledge(stale.id);
    for (const chunk of chunks) {
      const existingChunk = await knowledgeRepository.getById(chunk.id);
      if (!knowledgeProjectionMatches(existingChunk, chunk)) {
        if (existingChunk && !existingChunk.invalidatedAt && existingChunk.content === chunk.content) {
          await knowledgeRepository.save(mergeKnowledgeProjection(existingChunk, chunk));
        } else await storeKnowledge(chunk);
      }
      await linkKnowledge({ id: `derived:${chunk.id}`, fromId: chunk.id, toId: projected.id, type: "DERIVED_FROM" });
    }
    await syncServer("UPSERT_VAULT", { item });
    return stored;
  });
}

/** Revoke the Vault projection and all derived chunks in order with pending writes. */
export function revokeVaultKnowledgeItem(vaultId: string) {
  return serializeByVaultId(vaultId, async () => {
    const knowledgeId = `vault:${vaultId}`;
    if (!await knowledgeRepository.getById(knowledgeId)) return null;
    const revoked = await revokeKnowledge(knowledgeId);
    await syncServer("REVOKE_VAULT", { id: knowledgeId });
    return revoked;
  });
}
