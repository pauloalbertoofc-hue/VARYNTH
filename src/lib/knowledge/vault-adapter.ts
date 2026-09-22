import { VaultItem } from "../types/vault";
import { KnowledgeItem } from "./contracts";

const SUBJECT_DOMAINS: Record<string, string> = {
  Direito: "legal",
  Filosofia: "philosophy",
  Tecnologia: "technology",
  História: "history",
  Psicologia: "psychology",
  Ciência: "science",
  Música: "music",
};

export function knowledgeFromVaultItem(item: VaultItem, ownerAgent?: string): KnowledgeItem {
  const now = new Date().toISOString();
  const domain = SUBJECT_DOMAINS[item.primarySubject || ""] || "general-knowledge";
  return {
    id: `vault:${item.id}`,
    title: item.title,
    content: item.summary || item.notes || item.content || "",
    primaryDomain: domain,
    relatedDomains: item.tags.filter((tag) => tag.includes(".") || tag.toLowerCase().includes("audio")),
    categories: [item.literaryCategory || "Não classificado", item.workType || "Outro"],
    tags: item.tags,
    ownerAgent,
    contributingAgents: [],
    visibility: item.relatedProjectIds?.length ? "PROJECT" : "DOMAIN",
    sensitivity: "INTERNAL",
    kind: item.sourceOrigin === "user" ? "USER_PROVIDED" : "DOCUMENT",
    assertion: "REFERENCE",
    provenance: {
      sourceType: "VAULT_ITEM",
      sourceReference: item.storageId || item.url || item.id,
      addedBy: "SYSTEM",
      createdAt: item.createdAt,
      observedAt: item.updatedAt,
      authority: "USER_PROVIDED",
      inferred: false,
    },
    version: 1,
    freshness: "CURRENT",
    relatedProjectIds: item.relatedProjectIds || [],
    relatedArtifactIds: [],
    createdAt: item.createdAt,
    updatedAt: now,
  };
}
