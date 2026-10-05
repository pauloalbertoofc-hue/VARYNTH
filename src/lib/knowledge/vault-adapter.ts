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
    ownerAgent: item.knowledgeOwnerAgent !== undefined ? item.knowledgeOwnerAgent || undefined : ownerAgent,
    contributingAgents: [],
    visibility: item.knowledgeVisibility || (item.relatedProjectIds?.length ? "PROJECT" : "DOMAIN"),
    sensitivity: item.knowledgeSensitivity || "INTERNAL",
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

/** Compare the complete canonical projection so stable chunk IDs refresh when metadata changes. */
export function knowledgeProjectionMatches(existing: KnowledgeItem | null | undefined, projected: KnowledgeItem): boolean {
  if (!existing) return false;
  const scalarFields: (keyof KnowledgeItem)[] = [
    "id", "title", "content", "primaryDomain", "ownerAgent", "visibility", "sensitivity", "kind", "assertion",
    "version", "freshness", "validFrom", "validUntil", "createdAt", "updatedAt", "conflictGroupId", "supersedesId", "invalidatedAt",
  ];
  const structuredFields: (keyof KnowledgeItem)[] = [
    "relatedDomains", "categories", "tags", "contributingAgents", "provenance", "classification", "relatedProjectIds", "relatedArtifactIds",
  ];
  return scalarFields.every((field) => existing[field] === projected[field])
    && structuredFields.every((field) => JSON.stringify(existing[field]) === JSON.stringify(projected[field]));
}

const CHUNK_TARGET = 1200;
const CHUNK_OVERLAP = 120;

interface SourceHeading { start: number; end: number; level: number; title: string; sectionPath: string[]; }

function sourceHeadings(points: string[]): SourceHeading[] {
  const headings: SourceHeading[] = [];
  const ancestry: Array<{ level: number; title: string }> = [];
  let lineStart = 0;
  while (lineStart < points.length) {
    let lineEnd = lineStart;
    while (lineEnd < points.length && points[lineEnd] !== "\n") lineEnd += 1;
    const line = points.slice(lineStart, lineEnd).join("").replace(/\r$/u, "");
    const match = /^(#{1,6})\s+(.+?)\s*#*$/u.exec(line);
    if (match) {
      const level = match[1].length;
      while (ancestry.length && ancestry[ancestry.length - 1].level >= level) ancestry.pop();
      ancestry.push({ level, title: match[2] });
      headings.push({ start: lineStart, end: lineEnd, level, title: match[2], sectionPath: ancestry.map((heading) => heading.title) });
    }
    lineStart = lineEnd + 1;
  }
  return headings;
}

function sectionPathAt(headings: SourceHeading[], offset: number): string[] {
  let low = 0;
  let high = headings.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (headings[middle].start <= offset) low = middle + 1;
    else high = middle;
  }
  return low ? [...headings[low - 1].sectionPath] : [];
}

function chooseChunkEnd(points: string[], start: number, headingStarts: Set<number>): number {
  const maximum = Math.min(points.length, start + CHUNK_TARGET);
  if (maximum === points.length) return maximum;
  const lowerBound = start + Math.floor(CHUNK_TARGET * 0.65);
  let best = -1;
  let bestScore = -1;
  for (let index = lowerBound; index <= maximum; index += 1) {
    const previous = points[index - 1];
    const next = points[index];
    let score = -1;
    if (previous === "\n" && next === "\n") score = 3;
    else if (previous === "\n" && headingStarts.has(index)) score = 4;
    else if (/[.!?;:。！？]/u.test(previous || "") && /\s/u.test(next || "")) score = 2;
    else if (/\s/u.test(previous || "")) score = 1;
    if (score > bestScore || (score === bestScore && score >= 0)) { best = index; bestScore = score; }
  }
  return best > start ? best : maximum;
}

function overlapStart(points: string[], end: number, headingStarts: Set<number>): number {
  const desired = Math.max(0, end - CHUNK_OVERLAP);
  if (headingStarts.has(end)) return end;
  // Prefer the beginning of a paragraph/heading after the overlap target. The prior chunk
  // already covers skipped overlap text, so advancing never creates a source gap.
  for (let index = desired; index < end; index += 1) {
    if (headingStarts.has(index)) return index;
    if (points[index - 1] === "\n" && points[index] === "\n") {
      let next = index + 1;
      while (next < end && /\s/u.test(points[next])) next += 1;
      return next < end ? next : desired;
    }
  }
  return desired;
}

/** Produce stable, source-addressable text chunks without replacing the canonical Vault projection. */
export async function knowledgeChunksFromVaultItem(item: VaultItem): Promise<KnowledgeItem[]> {
  const parent = knowledgeFromVaultItem(item);
  const text = parent.content;
  if (!text.trim()) return [];
  const points = Array.from(text);
  const headings = sourceHeadings(points);
  const headingStarts = new Set(headings.map((heading) => heading.start));
  const chunks: KnowledgeItem[] = [];
  let start = 0;
  while (start < points.length) {
    const end = chooseChunkEnd(points, start, headingStarts);
    const content = points.slice(start, end).join("");
    const sectionPath = sectionPathAt(headings, start);
    const bytes = new TextEncoder().encode(content);
    const digest = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), (byte) => byte.toString(16).padStart(2, "0")).join("");
    const id = `${parent.id}::chunk:${start}-${end}:${digest.slice(0, 16)}`;
    chunks.push({
      ...parent,
      id,
      title: `${parent.title} · ${sectionPath.join(" › ") || `trecho ${chunks.length + 1}`}`,
      content,
      kind: "REFERENCE",
      assertion: "REFERENCE",
      provenance: {
        ...parent.provenance,
        sourceType: "VAULT_TEXT_CHUNK",
        derivedFromIds: [parent.id],
        span: {
          sourceId: parent.id,
          sourceReference: parent.provenance.sourceReference || `vault-item:${item.id}`,
          start,
          end,
          unit: "UNICODE_CODE_POINTS",
          contentHash: digest,
          ...(sectionPath.length ? { sectionPath } : {}),
        },
      },
    });
    if (end === points.length) break;
    start = Math.max(start + 1, overlapStart(points, end, headingStarts));
  }
  return chunks;
}
