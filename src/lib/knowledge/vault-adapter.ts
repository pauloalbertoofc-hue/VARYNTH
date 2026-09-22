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
  const now = new Date().toISOString();
  const content = item.summary || item.notes || item.content || "";
  const userClassified = item.classificationSource === "manual" || item.classificationSource === "athena_accepted";
  const systemClassified = item.classificationSource === "migration";
  const subjectIsGeneric = !item.primarySubject || ["Conhecimento geral", "Não classificado"].includes(item.primarySubject);
  const suggestion = suggestKnowledgeClassification({ title: item.title, content, tags: item.tags, author: item.author, fileName: item.originalFileName, url: item.url, primarySubject: userClassified || !subjectIsGeneric ? item.primarySubject : undefined });
  const explicitDomain = SUBJECT_DOMAINS[item.primarySubject || ""];
  const inferredApplied = !userClassified && subjectIsGeneric && suggestion.confidence >= 0.8;
  const domain = explicitDomain || (inferredApplied ? suggestion.primaryDomain : "general-knowledge");
  return {
    id: `vault:${item.id}`,
    title: item.title,
    content,
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
    classification: { confidence: userClassified ? 1 : inferredApplied ? suggestion.confidence : systemClassified ? item.classificationConfidence ?? 0.7 : suggestion.confidence, source: userClassified ? "USER_CORRECTED" : inferredApplied ? "INFERRED" : systemClassified ? "SYSTEM" : "INFERRED", classifiedAt: userClassified || systemClassified ? item.classificationReviewedAt || now : now },
  };
}
