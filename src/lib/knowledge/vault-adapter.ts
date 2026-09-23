import { VaultItem } from "../types/vault";
import { KnowledgeItem } from "./contracts";
import { suggestKnowledgeClassification } from "./classification";

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
  const now = item.updatedAt || item.createdAt;
  const content = item.summary || item.notes || item.content || "";
  const explicitDomains = [...new Set((item.knowledgeDomains || []).filter((domain) => typeof domain === "string" && domain.trim()))];
  const userClassified = item.classificationSource === "manual" || item.classificationSource === "athena_accepted" || explicitDomains.length > 0;
  const systemClassified = item.classificationSource === "migration";
  const subjectIsGeneric = !item.primarySubject || ["Conhecimento geral", "Não classificado"].includes(item.primarySubject);
  const explicitlyClassified = explicitDomains.length > 0 || userClassified || systemClassified || (!subjectIsGeneric && Boolean(item.primarySubject));
  const suggestion = suggestKnowledgeClassification({ title: item.title, content, tags: item.tags, author: item.author, fileName: item.originalFileName, url: item.url, primarySubject: explicitlyClassified ? item.primarySubject : undefined });
  const explicitDomain = SUBJECT_DOMAINS[item.primarySubject || ""];
  const inferredApplied = !explicitlyClassified && subjectIsGeneric && suggestion.primaryDomain !== "general-knowledge" && suggestion.confidence >= 0.8;
  const domain = explicitDomains[0] || explicitDomain || (inferredApplied ? suggestion.primaryDomain : "general-knowledge");
  const relatedDomains = [...new Set([...explicitDomains.slice(1), ...item.tags.filter((tag) => tag.includes(".") || tag.toLowerCase().includes("audio"))])].filter((related) => related !== domain);
  const categories = item.knowledgeCategories || [...new Set([item.literaryCategory, item.workType].filter((value): value is NonNullable<typeof value> => Boolean(value)))];
  return {
    id: `vault:${item.id}`,
    title: item.title,
    content,
    primaryDomain: domain,
    relatedDomains,
    categories: categories.length ? categories : ["Não classificado", "Outro"],
    tags: item.knowledgeTags || item.tags,
    ownerAgent,
    contributingAgents: [],
    visibility: item.relatedProjectIds?.length ? "PROJECT" : "DOMAIN",
    sensitivity: "INTERNAL",
    kind: item.sourceOrigin === "user" ? "USER_PROVIDED" : "DOCUMENT",
    assertion: "REFERENCE",
    provenance: {
      sourceType: "VAULT_ITEM",
      sourceReference: item.storageId ? `vault-storage:${item.storageId}` : item.url || `vault-item:${item.id}`,
      addedBy: "SYSTEM",
      createdAt: item.createdAt,
      observedAt: item.updatedAt,
      authority: "USER_PROVIDED",
      inferred: inferredApplied,
    },
    version: Math.max(1, Number.isInteger(item.taxonomyVersion) ? item.taxonomyVersion! : 1),
    freshness: item.readingStatus === "arquivado" ? "HISTORICAL" : "CURRENT",
    relatedProjectIds: item.relatedProjectIds || [],
    relatedArtifactIds: [],
    createdAt: item.createdAt,
    updatedAt: now,
    classification: { confidence: userClassified ? 1 : inferredApplied ? suggestion.confidence : systemClassified ? item.classificationConfidence ?? 0.7 : explicitlyClassified ? 1 : suggestion.confidence, source: userClassified ? "USER_CORRECTED" : inferredApplied ? "INFERRED" : explicitlyClassified ? "SYSTEM" : "INFERRED", classifiedAt: item.classificationReviewedAt || now },
  };
}
