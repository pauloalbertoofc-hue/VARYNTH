import { knowledgeAccessLogRepository, knowledgeRepository } from "../persistence/repositories";
import { KnowledgeDiscovery, KnowledgeItem, KnowledgeQuery, KnowledgeRelationship } from "./contracts";
import { decideKnowledgeAccess } from "./policy";
import { buildKnowledgeRetrievalIndex, nextKnowledgeValidityBoundary, selectKnowledgeCandidates, type KnowledgeRetrievalIndex } from "./retrieval-index";

const queryCache = new Map<string, { revision: number; expiresAt: number; items: KnowledgeItem[] }>();
const knowledgeWriteQueues = new Map<string, Promise<void>>();
let revision = 0;
let retrievalIndex: KnowledgeRetrievalIndex | undefined;
let retrievalIndexBuild: Promise<KnowledgeRetrievalIndex | null> | undefined;
let retrievalIndexBuildRevision = -1;

export function invalidateKnowledgeQueryCache(): void {
  revision += 1;
  queryCache.clear();
  retrievalIndex = undefined;
  retrievalIndexBuild = undefined;
  retrievalIndexBuildRevision = -1;
}

async function getKnowledgeRetrievalIndex(): Promise<KnowledgeRetrievalIndex> {
  while (true) {
    if (retrievalIndex?.revision === revision) return retrievalIndex;
    if (!retrievalIndexBuild || retrievalIndexBuildRevision !== revision) {
      const buildRevision = revision;
      retrievalIndexBuildRevision = buildRevision;
      const buildPromise = knowledgeRepository.getAll().then((items) => buildRevision === revision ? buildKnowledgeRetrievalIndex(items, buildRevision) : null);
      retrievalIndexBuild = buildPromise;
    }
    const pending = retrievalIndexBuild;
    let built: KnowledgeRetrievalIndex | null;
    try {
      built = await pending;
    } catch (error) {
      if (pending === retrievalIndexBuild) retrievalIndexBuild = undefined;
      throw error;
    }
    if (pending === retrievalIndexBuild && built && built.revision === revision) {
      retrievalIndex = built;
      retrievalIndexBuild = undefined;
      return built;
    }
    if (pending === retrievalIndexBuild) retrievalIndexBuild = undefined;
  }
}

function currentKnowledge(items: KnowledgeItem[]): KnowledgeItem[] {
  const supersededIds = new Set(items.flatMap((item) => item.supersedesId ? [item.supersedesId] : []));
  return items.filter((item) => !item.invalidatedAt && !supersededIds.has(item.id));
}

async function persistKnowledge(item: KnowledgeItem): Promise<KnowledgeItem> {
  const write = async () => {
    const existing = await knowledgeRepository.getById(item.id);
    const allKnowledge = await knowledgeRepository.getAll();
    const activeIds = new Set(currentKnowledge(allKnowledge).map((candidate) => candidate.id));
    const siblings = allKnowledge.filter((candidate) => activeIds.has(candidate.id) && candidate.id !== item.id && candidate.primaryDomain === item.primaryDomain && candidate.title.toLocaleLowerCase() === item.title.toLocaleLowerCase() && candidate.content !== item.content);
    const conflictGroupId = siblings.length ? (siblings[0].conflictGroupId || `conflict-${item.primaryDomain}-${item.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`) : undefined;
    let snapshot: KnowledgeItem | undefined;
    const snapshotId = existing ? `${existing.id}::version:${existing.version}` : undefined;
    if (existing && snapshotId) {
      snapshot = {
        ...existing,
        id: snapshotId,
        supersedesId: existing.supersedesId,
        freshness: "HISTORICAL",
      };
    }
    const stored = existing ? {
      ...item,
      createdAt: existing.createdAt,
      version: existing.version + 1,
      supersedesId: snapshotId,
      conflictGroupId: conflictGroupId || existing.conflictGroupId,
      provenance: {
        ...item.provenance,
        createdAt: existing.provenance.createdAt,
        derivedFromIds: item.provenance.derivedFromIds || existing.provenance.derivedFromIds,
      },
    } : { ...item, conflictGroupId };
    const writes = [
      ...(snapshot ? [snapshot] : []),
      ...(conflictGroupId ? siblings.map((sibling) => ({ ...sibling, conflictGroupId })) : []),
      stored,
    ];
    await knowledgeRepository.saveBatch(writes);
    invalidateKnowledgeQueryCache();
    return stored;
  };

  const lockManager = typeof navigator !== "undefined" ? navigator.locks : undefined;
  return lockManager
    ? lockManager.request(`varynth:knowledge-item:${item.id}`, write)
    : write();
}

export function storeKnowledge(item: KnowledgeItem): Promise<KnowledgeItem> {
  const previous = knowledgeWriteQueues.get(item.id) || Promise.resolve();
  const current = previous.catch(() => undefined).then(() => persistKnowledge(item));
  const queueEntry = current.then(() => undefined, () => undefined);
  knowledgeWriteQueues.set(item.id, queueEntry);
  return current.finally(() => {
    if (knowledgeWriteQueues.get(item.id) === queueEntry) knowledgeWriteQueues.delete(item.id);
  });
}

export async function updateKnowledge(id: string, requester: string, patch: Partial<KnowledgeItem>): Promise<KnowledgeItem> {
  const current = await knowledgeRepository.getById(id);
  if (!current) throw new Error("[KNOWLEDGE_NOT_FOUND] Item inexistente.");
  if (requester !== "system" && requester !== current.ownerAgent) throw new Error("[KNOWLEDGE_UPDATE_DENIED] Somente o owner ou sistema pode atualizar conhecimento.");
  const next = { ...current, ...patch, id: current.id, createdAt: current.createdAt, updatedAt: new Date().toISOString() };
  return storeKnowledge(next);
}

export async function findKnowledgeConflicts(domain?: string): Promise<Array<{ groupId: string; items: KnowledgeItem[] }>> {
  const items = currentKnowledge(await knowledgeRepository.getAll()).filter((item) => Boolean(item.conflictGroupId) && (!domain || item.primaryDomain === domain));
  const groups = new Map<string, KnowledgeItem[]>();
  for (const item of items) groups.set(item.conflictGroupId!, [...(groups.get(item.conflictGroupId!) || []), item]);
  return [...groups.entries()].map(([groupId, grouped]) => ({ groupId, items: grouped }));
}

export async function revokeKnowledge(id: string): Promise<KnowledgeItem> {
  const current = await knowledgeRepository.getById(id);
  if (!current) throw new Error("[KNOWLEDGE_NOT_FOUND] Item inexistente.");
  const revoked = { ...current, invalidatedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  invalidateKnowledgeQueryCache();
  const stored = await knowledgeRepository.save(revoked);
  const { knowledgeRelationshipRepository } = await import("../persistence/repositories");
  const derivationGraph = await knowledgeRelationshipRepository.getAll((relation) => relation.type === "DERIVED_FROM");
  const invalidatedIds = new Set([id]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const relation of derivationGraph) {
      if (invalidatedIds.has(relation.toId) && !invalidatedIds.has(relation.fromId)) {
        invalidatedIds.add(relation.fromId);
        changed = true;
      }
    }
  }
  invalidatedIds.delete(id);
  if (invalidatedIds.size) {
    const derivedItems = await knowledgeRepository.getAll((item) => invalidatedIds.has(item.id) && !item.invalidatedAt);
    const invalidatedAt = new Date().toISOString();
    await knowledgeRepository.saveBatch(derivedItems.map((item) => ({ ...item, freshness: "UNKNOWN" as const, invalidatedAt, updatedAt: invalidatedAt })));
    invalidateKnowledgeQueryCache();
  }
  return stored;
}

export async function publishKnowledge(id: string, requester: string, visibility: KnowledgeItem["visibility"] = "PUBLIC_TO_AGENTS"): Promise<KnowledgeItem> {
  const current = await knowledgeRepository.getById(id);
  if (!current) throw new Error("[KNOWLEDGE_NOT_FOUND] Item inexistente.");
  if (requester !== "system" && requester !== current.ownerAgent) throw new Error("[KNOWLEDGE_PUBLISH_DENIED] Somente o owner ou sistema pode publicar conhecimento.");
  if (!["PUBLIC_TO_AGENTS", "DOMAIN", "CROSS_DOMAIN"].includes(visibility)) throw new Error("[KNOWLEDGE_PUBLISH_VISIBILITY_INVALID] Visibilidade de publicação inválida.");
  if (current.sensitivity === "PRIVATE") throw new Error("[KNOWLEDGE_PUBLISH_PRIVATE] Conhecimento PRIVATE não pode ser publicado entre agentes.");
  if (current.sensitivity === "SENSITIVE" && visibility !== "DOMAIN") throw new Error("[KNOWLEDGE_PUBLISH_SENSITIVE] Conhecimento SENSITIVE só pode ser compartilhado dentro do domínio.");
  const published = { ...current, visibility, updatedAt: new Date().toISOString(), provenance: { ...current.provenance, addedBy: requester === "system" ? "SYSTEM" as const : current.provenance.addedBy } };
  invalidateKnowledgeQueryCache();
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
  const index = await getKnowledgeRetrievalIndex();
  const candidates = selectKnowledgeCandidates(index, request).filter((item) => {
    const now = Date.now();
    if (item.validFrom && new Date(item.validFrom).getTime() > now) return false;
    if (item.validUntil && new Date(item.validUntil).getTime() < now) return false;
    return true;
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
  await knowledgeAccessLogRepository.save({ id: `access-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, requester: request.requester, provider: request.provider, domain: request.domain, purpose: request.purpose, knowledgeIds: result.map((item) => item.id), decision, operation: request.operation || "CAN_QUERY", createdAt: new Date().toISOString() });
  const now = Date.now();
  const nextValidityBoundary = nextKnowledgeValidityBoundary(index, now);
  if (revision === index.revision) queryCache.set(cacheKey, { revision: index.revision, expiresAt: Math.min(now + 30_000, nextValidityBoundary), items: result });
  return result;
}

export async function discoverKnowledge(request: KnowledgeQuery): Promise<KnowledgeDiscovery[]> {
  const items = currentKnowledge(await knowledgeRepository.getAll()).filter((item) => !request.domain || item.primaryDomain === request.domain || item.relatedDomains.includes(request.domain));
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
  const normalized = { ...relation, id: relation.id.trim(), fromId: relation.fromId.trim(), toId: relation.toId.trim() };
  if (normalized.fromId === normalized.toId) throw new Error("[KNOWLEDGE_RELATION_INVALID] Relação vazia, autorreferente ou com tipo inválido.");
  const { knowledgeRelationshipRepository } = await import("../persistence/repositories");
  const sameId = await knowledgeRelationshipRepository.getById(normalized.id);
  if (sameId) {
    if (sameId.fromId !== normalized.fromId || sameId.toId !== normalized.toId || sameId.type !== normalized.type) throw new Error("[KNOWLEDGE_RELATION_ID_CONFLICT] O identificador já pertence a outra relação.");
    return sameId;
  }
  if (normalized.type === "DERIVED_FROM") {
    const [derived, source] = await Promise.all([knowledgeRepository.getById(normalized.fromId), knowledgeRepository.getById(normalized.toId)]);
    if (!derived || !source) throw new Error("[KNOWLEDGE_RELATION_ENDPOINT_MISSING] Relação de derivação exige os dois itens Knowledge persistidos.");
    if (derived.invalidatedAt || source.invalidatedAt) throw new Error("[KNOWLEDGE_RELATION_ENDPOINT_REVOKED] Relação de derivação não pode usar itens revogados.");
  }
  const duplicate = await knowledgeRelationshipRepository.getAll((candidate) => candidate.fromId === normalized.fromId && candidate.toId === normalized.toId && candidate.type === normalized.type);
  if (duplicate.length) return duplicate[0];
  if (normalized.type === "DERIVED_FROM" || normalized.type === "DEPENDS_ON") {
    const existing = await knowledgeRelationshipRepository.getAll((candidate) => candidate.type === normalized.type);
    const outgoing = new Map<string, string[]>();
    for (const edge of existing) outgoing.set(edge.fromId, [...(outgoing.get(edge.fromId) || []), edge.toId]);
    const pending = [normalized.toId];
    const visited = new Set<string>();
    while (pending.length) {
      const current = pending.pop()!;
      if (current === normalized.fromId) throw new Error("[KNOWLEDGE_RELATION_CYCLE] Relações DERIVED_FROM e DEPENDS_ON devem ser acíclicas.");
      if (visited.has(current)) continue;
      visited.add(current);
      pending.push(...(outgoing.get(current) || []));
    }
  }
  const stored = { ...normalized, createdAt: new Date().toISOString() };
  return knowledgeRelationshipRepository.save(stored);
}

export async function listKnowledgeRelationships(id?: string): Promise<KnowledgeRelationship[]> {
  const { knowledgeRelationshipRepository } = await import("../persistence/repositories");
  const relationships = await knowledgeRelationshipRepository.getAll((relation) => !id || relation.fromId === id || relation.toId === id);
  const revokedIds = new Set((await knowledgeRepository.getAll((item) => Boolean(item.invalidatedAt))).map((item) => item.id));
  return relationships.filter((relation) => relation.fromId !== relation.toId && !revokedIds.has(relation.fromId) && !revokedIds.has(relation.toId));
}
