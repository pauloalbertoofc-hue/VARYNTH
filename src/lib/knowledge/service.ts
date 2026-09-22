import { knowledgeAccessLogRepository, knowledgeRepository } from "../persistence/repositories";
import { KnowledgeItem, KnowledgeQuery } from "./contracts";
import { decideKnowledgeAccess } from "./policy";

const queryCache = new Map<string, { revision: number; items: KnowledgeItem[] }>();
let revision = 0;

export async function storeKnowledge(item: KnowledgeItem): Promise<KnowledgeItem> {
  const existing = await knowledgeRepository.getById(item.id);
  const siblings = await knowledgeRepository.getAll((candidate) => candidate.id !== item.id && candidate.primaryDomain === item.primaryDomain && candidate.title.toLocaleLowerCase() === item.title.toLocaleLowerCase() && candidate.content !== item.content);
  const conflictGroupId = siblings.length ? (siblings[0].conflictGroupId || `conflict-${item.primaryDomain}-${item.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`) : undefined;
  const stored = existing ? { ...item, createdAt: existing.createdAt, version: existing.version + 1, supersedesId: existing.id, conflictGroupId: conflictGroupId || existing.conflictGroupId } : { ...item, conflictGroupId };
  if (conflictGroupId) await knowledgeRepository.saveBatch(siblings.map((sibling) => ({ ...sibling, conflictGroupId })));
  revision += 1;
  queryCache.clear();
  return knowledgeRepository.save(stored);
}

export async function findKnowledgeConflicts(domain?: string): Promise<Array<{ groupId: string; items: KnowledgeItem[] }>> {
  const items = await knowledgeRepository.getAll((item) => Boolean(item.conflictGroupId) && (!domain || item.primaryDomain === domain));
  const groups = new Map<string, KnowledgeItem[]>();
  for (const item of items) groups.set(item.conflictGroupId!, [...(groups.get(item.conflictGroupId!) || []), item]);
  return [...groups.entries()].map(([groupId, grouped]) => ({ groupId, items: grouped }));
}

export async function revokeKnowledge(id: string): Promise<KnowledgeItem> {
  const current = await knowledgeRepository.getById(id);
  if (!current) throw new Error("[KNOWLEDGE_NOT_FOUND] Item inexistente.");
  const revoked = { ...current, invalidatedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  revision += 1;
  queryCache.clear();
  return knowledgeRepository.save(revoked);
}

export async function listKnowledgeAccessLogs(): Promise<import("./contracts").KnowledgeAccessLog[]> { return knowledgeAccessLogRepository.getAll(); }

export async function queryKnowledge(request: KnowledgeQuery): Promise<KnowledgeItem[]> {
  const cacheKey = JSON.stringify(request);
  const cached = queryCache.get(cacheKey);
  if (cached?.revision === revision) return cached.items.map((item) => ({ ...item }));
  const tokens = request.query?.trim().toLocaleLowerCase().split(/\s+/).filter((token) => token.length > 2) || [];
  const candidates = await knowledgeRepository.getAll((item) => {
    if (item.invalidatedAt) return false;
    const inDomain = !request.domain || item.primaryDomain === request.domain || item.relatedDomains.includes(request.domain) || item.primaryDomain.startsWith(`${request.domain}.`);
    const inProject = !request.projectId || item.relatedProjectIds.length === 0 || item.relatedProjectIds.includes(request.projectId);
    const text = `${item.title} ${item.content} ${item.tags.join(" ")}`.toLocaleLowerCase();
    return inDomain && inProject && (!tokens.length || tokens.some((token) => text.includes(token)));
  });
  const result = candidates.filter((item) => decideKnowledgeAccess(item, request).decision !== "DENY");
  await knowledgeAccessLogRepository.save({ id: `access-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, requester: request.requester, domain: request.domain, purpose: request.purpose, knowledgeIds: result.map((item) => item.id), decision: result.length ? "ALLOW" : "DENY", createdAt: new Date().toISOString() });
  queryCache.set(cacheKey, { revision, items: result });
  return result;
}
