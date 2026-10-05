import { knowledgeAccessLogRepository, knowledgeRelationshipRepository, knowledgeRepository } from "../persistence/repositories";
import { KnowledgeDiscovery, KnowledgeItem, KnowledgeQuery, KnowledgeRelationship } from "./contracts";
import { decideKnowledgeAccess } from "./policy";
import { assertKnowledgeLifecycleTransition, getKnowledgeLifecycleState, isKnowledgeLifecycleState, lifecycleAllowsRequester } from "./lifecycle";
import { buildKnowledgeRetrievalIndex, nextKnowledgeValidityBoundary, scoreKnowledgeRelevance, selectKnowledgeCandidates, type KnowledgeRetrievalIndex } from "./retrieval-index";

const queryCache = new Map<string, { revision: number; expiresAt: number; items: KnowledgeItem[] }>();
const knowledgeWriteQueues = new Map<string, Promise<void>>();
let revision = 0;
let retrievalIndex: KnowledgeRetrievalIndex | undefined;
let retrievalIndexBuild: Promise<KnowledgeRetrievalIndex | null> | undefined;
let retrievalIndexBuildRevision = -1;

async function collectDependentIds(sourceId: string, relationTypes: ReadonlySet<KnowledgeRelationship["type"]>): Promise<Set<string>> {
  const relations = await knowledgeRelationshipRepository.getAll((relation) => relationTypes.has(relation.type));
  const dependentsBySource = new Map<string, string[]>();
  for (const relation of relations) dependentsBySource.set(relation.toId, [...(dependentsBySource.get(relation.toId) || []), relation.fromId]);
  const visited = new Set<string>([sourceId]);
  const pending = [sourceId];
  while (pending.length) {
    const current = pending.pop()!;
    for (const dependentId of dependentsBySource.get(current) || []) {
      if (visited.has(dependentId)) continue;
      visited.add(dependentId);
      pending.push(dependentId);
    }
  }
  visited.delete(sourceId);
  return visited;
}

async function markDependentsForReview(sourceId: string): Promise<void> {
  const dependentIds = await collectDependentIds(sourceId, new Set(["DERIVED_FROM", "DEPENDS_ON"]));
  if (!dependentIds.size) return;
  const affected = await knowledgeRepository.getAll((item) => dependentIds.has(item.id) && !item.invalidatedAt);
  const now = new Date().toISOString();
  const changed = affected.filter((item) => !["ARCHIVED", "DEPRECATED"].includes(getKnowledgeLifecycleState(item)) && (getKnowledgeLifecycleState(item) !== "REVIEW" || item.freshness === "CURRENT"));
  if (!changed.length) return;
  await knowledgeRepository.saveBatch(changed.map((item) => ({
    ...item,
    lifecycleState: "REVIEW" as const,
    freshness: item.freshness === "CURRENT" ? "POSSIBLY_STALE" as const : item.freshness,
    updatedAt: now,
  })));
}

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
  return items.filter((item) => !item.invalidatedAt && !supersededIds.has(item.id) && !["ARCHIVED", "DEPRECATED"].includes(getKnowledgeLifecycleState(item)));
}

async function persistKnowledge(item: KnowledgeItem): Promise<KnowledgeItem> {
  const write = async () => {
    const existing = await knowledgeRepository.getById(item.id);
    if (item.lifecycleState !== undefined) {
      if (!isKnowledgeLifecycleState(item.lifecycleState)) throw new Error("[KNOWLEDGE_LIFECYCLE_STATE_INVALID] Estado lifecycle inválido.");
      if (existing) assertKnowledgeLifecycleTransition(existing.lifecycleState, item.lifecycleState);
    }
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
      lifecycleState: item.lifecycleState || existing.lifecycleState || "ACTIVE",
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
    if (existing) await markDependentsForReview(item.id);
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

/** Persist an authoritative projection update without creating a content-history snapshot. */
export function storeKnowledgeProjection(item: KnowledgeItem, options: { cascadeReview?: boolean; resetLifecycleOnContentChange?: boolean } = {}): Promise<KnowledgeItem> {
  const previous = knowledgeWriteQueues.get(item.id) || Promise.resolve();
  const current = previous.catch(() => undefined).then(async () => {
    const existing = await knowledgeRepository.getById(item.id);
    if (!existing || existing.invalidatedAt || existing.content !== item.content) {
      const refreshed = options.resetLifecycleOnContentChange ? { ...item, lifecycleState: "ACTIVE" as const } : item;
      return persistKnowledge(refreshed);
    }
    if (item.lifecycleState !== undefined) assertKnowledgeLifecycleTransition(existing.lifecycleState, item.lifecycleState);
    const projected: KnowledgeItem = {
      ...item,
      lifecycleState: item.lifecycleState || existing.lifecycleState || "ACTIVE",
      createdAt: existing.createdAt,
      version: existing.version,
      supersedesId: existing.supersedesId,
      conflictGroupId: existing.conflictGroupId,
      provenance: {
        ...item.provenance,
        createdAt: existing.provenance.createdAt,
        derivedFromIds: item.provenance.derivedFromIds || existing.provenance.derivedFromIds,
      },
    };
    if (JSON.stringify(projected) === JSON.stringify(existing)) return existing;
    const stored = await knowledgeRepository.save(projected);
    invalidateKnowledgeQueryCache();
    if (options.cascadeReview !== false) await markDependentsForReview(item.id);
    invalidateKnowledgeQueryCache();
    return stored;
  });
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
  const visibilities = ["PRIVATE", "AGENT_PRIVATE", "PROJECT", "DOMAIN", "CROSS_DOMAIN", "PUBLIC_TO_AGENTS"];
  const sensitivities = ["PUBLIC", "INTERNAL", "SENSITIVE", "PRIVATE"];
  if (patch.visibility !== undefined && !visibilities.includes(patch.visibility)) throw new Error("[KNOWLEDGE_PATCH_INVALID] Visibilidade inválida.");
  if (patch.sensitivity !== undefined && !sensitivities.includes(patch.sensitivity)) throw new Error("[KNOWLEDGE_PATCH_INVALID] Sensibilidade inválida.");
  const nextVisibility = patch.visibility ?? current.visibility;
  const nextSensitivity = patch.sensitivity ?? current.sensitivity;
  if (patch.visibility === "PUBLIC_TO_AGENTS" && current.visibility !== "PUBLIC_TO_AGENTS") throw new Error("[KNOWLEDGE_PATCH_INVALID] Use o fluxo de publicação para compartilhar entre agentes.");
  if (nextSensitivity === "PRIVATE" && !["PRIVATE", "AGENT_PRIVATE"].includes(nextVisibility)) throw new Error("[KNOWLEDGE_PATCH_INVALID] Conhecimento privado não pode ser compartilhado.");
  if (nextSensitivity === "SENSITIVE" && !["PRIVATE", "AGENT_PRIVATE", "PROJECT", "DOMAIN"].includes(nextVisibility)) throw new Error("[KNOWLEDGE_PATCH_INVALID] Conhecimento sensível só pode ser privado, de projeto ou de domínio.");
  if (patch.ownerAgent !== undefined && (typeof patch.ownerAgent !== "string" || (patch.ownerAgent !== "" && !/^[a-z0-9][a-z0-9._-]{0,79}$/u.test(patch.ownerAgent)))) throw new Error("[KNOWLEDGE_PATCH_INVALID] Owner inválido.");
  for (const field of ["primaryDomain"] as const) {
    if (patch[field] !== undefined && (typeof patch[field] !== "string" || !/^[a-z0-9][a-z0-9.-]{0,119}$/u.test(patch[field]))) throw new Error("[KNOWLEDGE_PATCH_INVALID] Domínio inválido.");
  }
  for (const field of ["relatedDomains", "categories", "tags"] as const) {
    if (patch[field] !== undefined && (!Array.isArray(patch[field]) || !patch[field]!.every((value) => typeof value === "string"))) throw new Error("[KNOWLEDGE_PATCH_INVALID] Classificação inválida.");
  }
  if (patch.lifecycleState !== undefined) assertKnowledgeLifecycleTransition(current.lifecycleState, patch.lifecycleState);
  const next = { ...current, ...patch, id: current.id, createdAt: current.createdAt, updatedAt: new Date().toISOString() };
  return storeKnowledge(next);
}

export async function findKnowledgeConflicts(domain?: string): Promise<Array<{ groupId: string; items: KnowledgeItem[] }>> {
  const items = currentKnowledge(await knowledgeRepository.getAll()).filter((item) => Boolean(item.conflictGroupId) && (!domain || item.primaryDomain === domain));
  const groups = new Map<string, KnowledgeItem[]>();
  for (const item of items) groups.set(item.conflictGroupId!, [...(groups.get(item.conflictGroupId!) || []), item]);
  return [...groups.entries()].map(([groupId, grouped]) => ({ groupId, items: grouped }));
}

/** Owner-facing lifecycle inventory; visibility is enforced by the authenticated route. */
export async function listKnowledgeLifecycleItems(): Promise<KnowledgeItem[]> {
  const items = await knowledgeRepository.getAll((item) => !item.invalidatedAt);
  const supersededIds = new Set(items.flatMap((item) => item.supersedesId ? [item.supersedesId] : []));
  return items.filter((item) => !supersededIds.has(item.id)).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export async function revokeKnowledge(id: string): Promise<KnowledgeItem> {
  const current = await knowledgeRepository.getById(id);
  if (!current) throw new Error("[KNOWLEDGE_NOT_FOUND] Item inexistente.");
  const revoked = { ...current, invalidatedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  invalidateKnowledgeQueryCache();
  const stored = await knowledgeRepository.save(revoked);
  const invalidatedIds = await collectDependentIds(id, new Set(["DERIVED_FROM"]));
  const allDependentIds = await collectDependentIds(id, new Set(["DERIVED_FROM", "DEPENDS_ON"]));
  if (invalidatedIds.size) {
    const derivedItems = await knowledgeRepository.getAll((item) => invalidatedIds.has(item.id) && !item.invalidatedAt);
    const invalidatedAt = new Date().toISOString();
    await knowledgeRepository.saveBatch(derivedItems.map((item) => ({ ...item, freshness: "UNKNOWN" as const, invalidatedAt, updatedAt: invalidatedAt })));
    invalidateKnowledgeQueryCache();
  }
  const reviewIds = [...allDependentIds].filter((dependentId) => !invalidatedIds.has(dependentId));
  if (reviewIds.length) {
    const dependentItems = await knowledgeRepository.getAll((item) => reviewIds.includes(item.id) && !item.invalidatedAt);
    const reviewedAt = new Date().toISOString();
    const reviewable = dependentItems.filter((item) => !["ARCHIVED", "DEPRECATED"].includes(getKnowledgeLifecycleState(item)));
    if (reviewable.length) {
      await knowledgeRepository.saveBatch(reviewable.map((item) => ({
        ...item,
        lifecycleState: "REVIEW" as const,
        freshness: item.freshness === "CURRENT" ? "POSSIBLY_STALE" as const : item.freshness,
        updatedAt: reviewedAt,
      })));
      invalidateKnowledgeQueryCache();
    }
  }
  return stored;
}

export async function publishKnowledge(id: string, requester: string, visibility: KnowledgeItem["visibility"] = "PUBLIC_TO_AGENTS"): Promise<KnowledgeItem> {
  const current = await knowledgeRepository.getById(id);
  if (!current) throw new Error("[KNOWLEDGE_NOT_FOUND] Item inexistente.");
  if (requester !== "system" && requester !== current.ownerAgent) throw new Error("[KNOWLEDGE_PUBLISH_DENIED] Somente o owner ou sistema pode publicar conhecimento.");
  if (getKnowledgeLifecycleState(current) !== "ACTIVE") throw new Error("[KNOWLEDGE_PUBLISH_LIFECYCLE] Somente conhecimento ACTIVE pode ser publicado.");
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
    if (!lifecycleAllowsRequester(item, request.requester)) return false;
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
    const lifecycleScore = getKnowledgeLifecycleState(item) === "STALE" ? -2 : getKnowledgeLifecycleState(item) === "REVIEW" ? -1 : 0;
    const recencyScore = Math.max(0, 2 - Math.floor((Date.now() - new Date(item.updatedAt).getTime()) / 31536000000));
    const domainScore = request.domain && item.primaryDomain === request.domain ? 3 : 0;
    const relevanceScore = scoreKnowledgeRelevance(index, item.id, request.query);
    return { item, decision, score: authorityScore + freshnessScore + lifecycleScore + recencyScore + domainScore + relevanceScore };
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
  const items = currentKnowledge(await knowledgeRepository.getAll()).filter((item) => lifecycleAllowsRequester(item, request.requester) && !["ARCHIVED", "DEPRECATED"].includes(getKnowledgeLifecycleState(item)) && (!request.domain || item.primaryDomain === request.domain || item.relatedDomains.includes(request.domain)));
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
