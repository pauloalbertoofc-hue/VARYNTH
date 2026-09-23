import type { VaultItem, VaultItemType, ReadingStatus } from "../types/vault";
import { knowledgeFromVaultItem } from "./vault-adapter";
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
