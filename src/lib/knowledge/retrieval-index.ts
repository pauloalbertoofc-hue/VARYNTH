import type { KnowledgeItem, KnowledgeQuery } from "./contracts";
import { lifecycleAllowsRetrieval } from "./lifecycle";

export interface KnowledgeRetrievalIndex {
  revision: number;
  items: KnowledgeItem[];
  ordinalById: Map<string, number>;
  textById: Map<string, string>;
  titleTextById: Map<string, string>;
  tagTextById: Map<string, string>;
  documentFrequency: Map<string, number>;
  termFrequencyById: Map<string, Map<string, number>>;
  documentLengthById: Map<string, number>;
  trigramPostings: Map<string, Set<string>>;
  primaryDomainPostings: Map<string, Set<string>>;
  relatedDomainPostings: Map<string, Set<string>>;
  projectPostings: Map<string, Set<string>>;
  categoryPostings: Map<string, Set<string>>;
  unscopedProjectIds: Set<string>;
  chunkedSourceIds: Set<string>;
  validityBoundaries: number[];
}

function addPosting(index: Map<string, Set<string>>, key: string, id: string) {
  const posting = index.get(key);
  if (posting) posting.add(id);
  else index.set(key, new Set([id]));
}

function trigrams(value: string): Set<string> {
  const result = new Set<string>();
  for (let offset = 0; offset <= value.length - 3; offset += 1) result.add(value.slice(offset, offset + 3));
  return result;
}

/** Rebuildable lexical and structured candidate index; KnowledgeItems remain canonical in storage. */
export function buildKnowledgeRetrievalIndex(items: KnowledgeItem[], revision: number): KnowledgeRetrievalIndex {
  const supersededIds = new Set(items.flatMap((item) => item.supersedesId && item.supersedesId !== item.id ? [item.supersedesId] : []));
  const activeItems = items.filter((item) => !item.invalidatedAt && !supersededIds.has(item.id) && lifecycleAllowsRetrieval(item));
  const index: KnowledgeRetrievalIndex = {
    revision,
    items: activeItems,
    ordinalById: new Map(),
    textById: new Map(),
    titleTextById: new Map(),
    tagTextById: new Map(),
    documentFrequency: new Map(),
    termFrequencyById: new Map(),
    documentLengthById: new Map(),
    trigramPostings: new Map(),
    primaryDomainPostings: new Map(),
    relatedDomainPostings: new Map(),
    projectPostings: new Map(),
    categoryPostings: new Map(),
    unscopedProjectIds: new Set(),
    chunkedSourceIds: new Set(activeItems.filter((item) => item.provenance.span).flatMap((item) => item.provenance.derivedFromIds || [])),
    validityBoundaries: [],
  };

  activeItems.forEach((item, ordinal) => {
    index.ordinalById.set(item.id, ordinal);
    const text = `${item.title} ${item.content} ${item.tags.join(" ")}`.toLocaleLowerCase();
    index.textById.set(item.id, text);
    index.titleTextById.set(item.id, item.title.toLocaleLowerCase());
    index.tagTextById.set(item.id, item.tags.join(" ").toLocaleLowerCase());
    const tokens = text.match(/[\p{L}\p{N}]+/gu) || [];
    const frequencies = new Map<string, number>();
    for (const token of tokens) frequencies.set(token, (frequencies.get(token) || 0) + 1);
    index.termFrequencyById.set(item.id, frequencies);
    index.documentLengthById.set(item.id, tokens.length);
    for (const token of frequencies.keys()) index.documentFrequency.set(token, (index.documentFrequency.get(token) || 0) + 1);
    for (const gram of trigrams(text)) addPosting(index.trigramPostings, gram, item.id);
    addPosting(index.primaryDomainPostings, item.primaryDomain, item.id);
    for (const domain of item.relatedDomains) addPosting(index.relatedDomainPostings, domain, item.id);
    for (const category of item.categories) addPosting(index.categoryPostings, category.trim().toLocaleLowerCase(), item.id);
    if (item.relatedProjectIds.length) {
      for (const projectId of item.relatedProjectIds) addPosting(index.projectPostings, projectId, item.id);
    } else index.unscopedProjectIds.add(item.id);
    for (const boundary of [item.validFrom, item.validUntil]) {
      if (!boundary) continue;
      const timestamp = new Date(boundary).getTime();
      if (Number.isFinite(timestamp)) index.validityBoundaries.push(timestamp);
    }
  });
  index.validityBoundaries.sort((left, right) => left - right);
  return index;
}

function textCandidates(index: KnowledgeRetrievalIndex, query?: string): Set<string> {
  const tokens = query?.trim().toLocaleLowerCase().split(/\s+/).filter((token) => token.length > 2) || [];
  if (!tokens.length) return new Set(index.items.map((item) => item.id));
  const result = new Set<string>();
  for (const token of tokens) {
    const postingLists = [...trigrams(token)].map((gram) => index.trigramPostings.get(gram));
    if (!postingLists.length || postingLists.some((posting) => !posting)) continue;
    postingLists.sort((left, right) => left!.size - right!.size);
    for (const id of postingLists[0]!) {
      if (postingLists.every((posting) => posting!.has(id)) && index.textById.get(id)?.includes(token)) result.add(id);
    }
  }
  return result;
}

function domainCandidates(index: KnowledgeRetrievalIndex, domain: string): Set<string> {
  const result = new Set(index.relatedDomainPostings.get(domain) || []);
  for (const [primaryDomain, ids] of index.primaryDomainPostings) {
    if (primaryDomain === domain || primaryDomain.startsWith(`${domain}.`)) for (const id of ids) result.add(id);
  }
  return result;
}

function intersect(left: Set<string>, right: Set<string>): Set<string> {
  const [smaller, larger] = left.size <= right.size ? [left, right] : [right, left];
  return new Set([...smaller].filter((id) => larger.has(id)));
}

/** Match legacy substring/OR semantics while narrowing candidates through structured and trigram indexes. */
export function selectKnowledgeCandidates(index: KnowledgeRetrievalIndex, request: KnowledgeQuery): KnowledgeItem[] {
  let ids = textCandidates(index, request.query);
  if (request.domain) ids = intersect(ids, domainCandidates(index, request.domain));
  if (request.category) ids = intersect(ids, index.categoryPostings.get(request.category.trim().toLocaleLowerCase()) || new Set<string>());
  if (request.projectId) {
    const projectIds = index.projectPostings.get(request.projectId) || new Set<string>();
    ids = new Set([...ids].filter((id) => index.unscopedProjectIds.has(id) || projectIds.has(id)));
  }
  return [...ids]
    .filter((id) => !index.chunkedSourceIds.has(id))
    .map((id) => index.items[index.ordinalById.get(id)!])
    .sort((left, right) => index.ordinalById.get(left.id)! - index.ordinalById.get(right.id)!);
}

/** Weighted lexical relevance used only for ranking; policy filtering remains in the service. */
export function scoreKnowledgeRelevance(index: KnowledgeRetrievalIndex, id: string, query?: string): number {
  const normalized = query?.trim().toLocaleLowerCase();
  if (!normalized) return 0;
  const tokens = [...new Set(normalized.match(/[\p{L}\p{N}]+/gu) || [])].filter((token) => token.length > 2);
  if (!tokens.length) return 0;
  const title = index.titleTextById.get(id) || "";
  const tags = index.tagTextById.get(id) || "";
  const frequencies = index.termFrequencyById.get(id);
  const documentTokenCount = Math.max(1, index.documentLengthById.get(id) || 0);
  const totalDocuments = Math.max(1, index.items.length);
  const relevance = tokens.reduce((sum, token) => {
    const tokenFrequency = frequencies?.get(token) || 0;
    const documentFrequency = index.documentFrequency.get(token) || 0;
    if (!tokenFrequency || !documentFrequency) return sum;
    const inverseDocumentFrequency = Math.log(1 + (totalDocuments - documentFrequency + 0.5) / (documentFrequency + 0.5));
    const lengthNormalization = tokenFrequency / (tokenFrequency + 1.2 * (0.25 + 0.75 * documentTokenCount / 100));
    return sum + inverseDocumentFrequency * lengthNormalization;
  }, 0);
  return relevance * 4 + (title.includes(normalized) ? 4 : 0) + (tags.includes(normalized) ? 2 : 0);
}

export function nextKnowledgeValidityBoundary(index: KnowledgeRetrievalIndex, now: number): number {
  let low = 0;
  let high = index.validityBoundaries.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (index.validityBoundaries[middle] <= now) low = middle + 1;
    else high = middle;
  }
  return index.validityBoundaries[low] ?? Number.POSITIVE_INFINITY;
}
