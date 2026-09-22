import { suggestTaxonomy } from "../vault/taxonomy";
import { KnowledgeItem } from "./contracts";

const SUBJECT_DOMAINS: Record<string, string> = { Direito: "legal", Filosofia: "philosophy", Tecnologia: "technology", História: "history", Psicologia: "psychology", Ciência: "science", Música: "music" };

export interface KnowledgeClassificationSuggestion { primaryDomain: string; categories: string[]; tags: string[]; confidence: number; source: "INFERRED"; }

export function suggestKnowledgeClassification(input: Pick<KnowledgeItem, "title" | "content" | "tags"> & { author?: string; fileName?: string; url?: string; primarySubject?: string }): KnowledgeClassificationSuggestion {
  const taxonomy = suggestTaxonomy({ title: input.title, author: input.author || "", fileName: input.fileName || "", url: input.url || "" });
  const normalized = `${input.title} ${input.content} ${input.tags.join(" ")}`.toLocaleLowerCase();
  const inferredSubject = /m[uú]sic|[áa]udio|melodia|harmonia|licenciamento musical/.test(normalized) ? "Música" : taxonomy.primarySubject;
  const subject = input.primarySubject || inferredSubject;
  const confidence = inferredSubject !== taxonomy.primarySubject ? Math.max(taxonomy.confidence, 0.86) : taxonomy.confidence;
  return { primaryDomain: SUBJECT_DOMAINS[subject] || "general-knowledge", categories: [taxonomy.literaryCategory, taxonomy.workType], tags: [...new Set([...input.tags, ...taxonomy.tags])], confidence, source: "INFERRED" };
}

export function applyKnowledgeClassification(item: KnowledgeItem, correction: { primaryDomain: string; categories?: string[]; tags?: string[] }): KnowledgeItem {
  return { ...item, primaryDomain: correction.primaryDomain, categories: correction.categories || item.categories, tags: correction.tags || item.tags, classification: { confidence: 1, source: "USER_CORRECTED", classifiedAt: new Date().toISOString() }, updatedAt: new Date().toISOString() };
}
