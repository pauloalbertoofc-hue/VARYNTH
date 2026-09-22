import { knowledgeAccessLogRepository, knowledgeRepository } from "../persistence/repositories";
import { KnowledgeDiscovery, KnowledgeItem, KnowledgeQuery, KnowledgeRelationship } from "./contracts";
import { decideKnowledgeAccess } from "./policy";

const queryCache = new Map<string, { revision: number; expiresAt: number; items: KnowledgeItem[] }>();
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

export async function updateKnowledge(id: string, requester: string, patch: Partial<KnowledgeItem>): Promise<KnowledgeItem> {
  const current = await knowledgeRepository.getById(id);
  if (!current) throw new Error("[KNOWLEDGE_NOT_FOUND] Item inexistente.");
  if (requester !== "system" && requester !== current.ownerAgent) throw new Error("[KNOWLEDGE_UPDATE_DENIED] Somente o owner ou sistema pode atualizar conhecimento.");
  const next = { ...current, ...patch, id: current.id, createdAt: current.createdAt, updatedAt: new Date().toISOString() };
  return storeKnowledge(next);
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

export async function publishKnowledge(id: string, requester: string, visibility: KnowledgeItem["visibility"] = "PUBLIC_TO_AGENTS"): Promise<KnowledgeItem> {
  const current = await knowledgeRepository.getById(id);
  if (!current) throw new Error("[KNOWLEDGE_NOT_FOUND] Item inexistente.");
  if (requester !== "system" && requester !== current.ownerAgent) throw new Error("[KNOWLEDGE_PUBLISH_DENIED] Somente o owner ou sistema pode publicar conhecimento.");
  const published = { ...current, visibility, updatedAt: new Date().toISOString(), provenance: { ...current.provenance, addedBy: requester === "system" ? "SYSTEM" as const : current.provenance.addedBy } };
  revision += 1;
  queryCache.clear();
  return knowledgeRepository.save(published);
}

export async function getKnowledgeProvenance(id: string): Promise<KnowledgeItem["provenance"] | null> {
  const item = await knowledgeRepository.getById(id);
  return item?.provenance || null;
}

export async function listKnowledgeAccessLogs(): Promise<import("./contracts").KnowledgeAccessLog[]> { return knowledgeAccessLogRepository.getAll(); }

export async function queryKnowledge(request: KnowledgeQuery): Promise<KnowledgeItem[]> {
  const cacheKey = JSON.stringify(request);
  const cached = queryCache.get(cacheKey);
  if (cached?.revision === revision && cached.expiresAt > Date.now()) return cached.items.map((item) => ({ ...item }));
  const tokens = request.query?.trim().toLocaleLowerCase().split(/\s+/).filter((token) => token.length > 2) || [];
  const allKnowledge = await knowledgeRepository.getAll();
  const supersededIds = new Set(allKnowledge.filter((item) => item.supersedesId && item.supersedesId !== item.id).map((item) => item.supersedesId!));
  const candidates = allKnowledge.filter((item) => {
    if (item.invalidatedAt) return false;
    if (supersededIds.has(item.id)) return false;
    const now = Date.now();
    if (item.validFrom && new Date(item.validFrom).getTime() > now) return false;
    if (item.validUntil && new Date(item.validUntil).getTime() < now) return false;
    const inDomain = !request.domain || item.primaryDomain === request.domain || item.relatedDomains.includes(request.domain) || item.primaryDomain.startsWith(`${request.domain}.`);
    const inProject = !request.projectId || item.relatedProjectIds.length === 0 || item.relatedProjectIds.includes(request.projectId);
    const text = `${item.title} ${item.content} ${item.tags.join(" ")}`.toLocaleLowerCase();
    return inDomain && inProject && (!tokens.length || tokens.some((token) => text.includes(token)));
  });
  const scored = candidates.map((item) => {
    const decision = decideKnowledgeAccess(item, request);
    if (decision.decision === "DENY") return null;
    const authorityScore = { PRIMARY_SOURCE: 5, OFFICIAL_REFERENCE: 4, INTERNAL_DOCUMENT: 3, USER_PROVIDED: 2, AGENT_GENERATED: 2, EXPERIENCE_DERIVED: 1, UNKNOWN: 0 }[item.provenance.authority];
    const freshnessScore = { CURRENT: 3, POSSIBLY_STALE: 1, HISTORICAL: 0, UNKNOWN: 0 }[item.freshness];
    const recencyScore = Math.max(0, 2 - Math.floor((Date.now() - new Date(item.updatedAt).getTime()) / 31536000000));
    const domainScore = request.domain && item.primaryDomain === request.domain ? 3 : 0;
    return { item, decision, score: authorityScore + freshnessScore + recencyScore + domainScore };
  }).filter((entry): entry is { item: KnowledgeItem; decision: ReturnType<typeof decideKnowledgeAccess>; score: number } => Boolean(entry));
  scored.sort((left, right) => right.score - left.score || left.item.title.localeCompare(right.item.title));
  const result = scored.slice(0, request.limit && request.limit > 0 ? request.limit : 50).map((entry) => entry.decision.decision === "ALLOW_SUMMARY" ? { ...entry.item, content: `${entry.item.content.slice(0, 280)}${entry.item.content.length > 280 ? "…" : ""}` } : entry.item);
  const decision = scored.some((entry) => entry.decision.decision === "ALLOW") ? "ALLOW" : scored.length ? "ALLOW_SUMMARY" : "DENY";
  await knowledgeAccessLogRepository.save({ id: `access-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, requester: request.requester, domain: request.domain, purpose: request.purpose, knowledgeIds: result.map((item) => item.id), decision, operation: request.operation || "CAN_QUERY", createdAt: new Date().toISOString() });
  const now = Date.now();
  const nextValidityBoundary = allKnowledge.flatMap((item) => [item.validFrom, item.validUntil]).map((date) => date ? new Date(date).getTime() : Number.POSITIVE_INFINITY).filter((timestamp) => timestamp > now).reduce((nearest, timestamp) => Math.min(nearest, timestamp), Number.POSITIVE_INFINITY);
  queryCache.set(cacheKey, { revision, expiresAt: Math.min(now + 30_000, nextValidityBoundary), items: result });
  return result;
}

export async function discoverKnowledge(request: KnowledgeQuery): Promise<KnowledgeDiscovery[]> {
  const items = await knowledgeRepository.getAll((item) => !item.invalidatedAt && (!request.domain || item.primaryDomain === request.domain || item.relatedDomains.includes(request.domain)));
  const result = items.map((item) => {
    const decision = decideKnowledgeAccess(item, request);
    const contentDecision = decideKnowledgeAccess(item, { ...request, operation: undefined });
    const canQuery = contentDecision.decision !== "DENY";
    const canRead = canQuery && contentDecision.decision === "ALLOW";
    return { id: item.id, title: item.title, primaryDomain: item.primaryDomain, relatedDomains: [...item.relatedDomains], ownerAgent: item.ownerAgent, visibility: item.visibility, kind: item.kind, freshness: item.freshness, authority: item.provenance.authority, canDiscover: true, canQuery, canRead };
  });
  await knowledgeAccessLogRepository.save({ id: `discovery-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, requester: request.requester, domain: request.domain, purpose: request.purpose, knowledgeIds: result.map((item) => item.id), decision: "ALLOW", operation: "CAN_DISCOVER", createdAt: new Date().toISOString() });
  return result;
}

export async function linkKnowledge(relation: Omit<KnowledgeRelationship, "createdAt">): Promise<KnowledgeRelationship> {
  const relationshipTypes = new Set(["BELONGS_TO", "OWNED_BY", "RELATED_TO", "DERIVED_FROM", "USED_BY", "PRODUCED_BY", "REFERENCES", "SPECIALIZES_IN", "DEPENDS_ON", "APPLIES_TO"]);
  if (typeof relation.id !== "string" || typeof relation.fromId !== "string" || typeof relation.toId !== "string" || !relation.id.trim() || !relation.fromId.trim() || !relation.toId.trim() || relation.fromId === relation.toId || !relationshipTypes.has(relation.type)) throw new Error("[KNOWLEDGE_RELATION_INVALID] Relação vazia, autorreferente ou com tipo inválido.");
  const { knowledgeRelationshipRepository } = await import("../persistence/repositories");
  const sameId = await knowledgeRelationshipRepository.getById(relation.id);
  if (sameId) {
    if (sameId.fromId !== relation.fromId || sameId.toId !== relation.toId || sameId.type !== relation.type) throw new Error("[KNOWLEDGE_RELATION_ID_CONFLICT] O identificador já pertence a outra relação.");
    return sameId;
  }
  const duplicate = await knowledgeRelationshipRepository.getAll((candidate) => candidate.fromId === relation.fromId && candidate.toId === relation.toId && candidate.type === relation.type);
  if (duplicate.length) return duplicate[0];
  const stored = { ...relation, createdAt: new Date().toISOString() };
  return knowledgeRelationshipRepository.save(stored);
}

export async function listKnowledgeRelationships(id?: string): Promise<KnowledgeRelationship[]> {
  const { knowledgeRelationshipRepository } = await import("../persistence/repositories");
  const relationships = await knowledgeRelationshipRepository.getAll((relation) => !id || relation.fromId === id || relation.toId === id);
  const revokedIds = new Set((await knowledgeRepository.getAll((item) => Boolean(item.invalidatedAt))).map((item) => item.id));
  return relationships.filter((relation) => relation.fromId !== relation.toId && !revokedIds.has(relation.fromId) && !revokedIds.has(relation.toId));
}
