import { knowledgeRepository } from "../persistence/repositories";
import { KnowledgeItem, KnowledgeQuery } from "./contracts";
import { decideKnowledgeAccess } from "./policy";

const queryCache = new Map<string, { revision: number; items: KnowledgeItem[] }>();
let revision = 0;

export async function storeKnowledge(item: KnowledgeItem): Promise<KnowledgeItem> {
  const existing = await knowledgeRepository.getById(item.id);
  const stored = existing ? { ...item, createdAt: existing.createdAt, version: existing.version + 1, supersedesId: existing.id } : item;
  revision += 1;
  queryCache.clear();
  return knowledgeRepository.save(stored);
}

export async function queryKnowledge(request: KnowledgeQuery): Promise<KnowledgeItem[]> {
  const cacheKey = JSON.stringify(request);
  const cached = queryCache.get(cacheKey);
  if (cached?.revision === revision) return cached.items.map((item) => ({ ...item }));
  const tokens = request.query?.trim().toLocaleLowerCase().split(/\s+/).filter((token) => token.length > 2) || [];
  const candidates = await knowledgeRepository.getAll((item) => {
    const inDomain = !request.domain || item.primaryDomain === request.domain || item.relatedDomains.includes(request.domain) || item.primaryDomain.startsWith(`${request.domain}.`);
    const inProject = !request.projectId || item.relatedProjectIds.length === 0 || item.relatedProjectIds.includes(request.projectId);
    const text = `${item.title} ${item.content} ${item.tags.join(" ")}`.toLocaleLowerCase();
    return inDomain && inProject && (!tokens.length || tokens.some((token) => text.includes(token)));
  });
  const result = candidates.filter((item) => decideKnowledgeAccess(item, request).decision !== "DENY");
  queryCache.set(cacheKey, { revision, items: result });
  return result;
}
