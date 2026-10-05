import type { KnowledgeOwnershipHistoryEntry } from "./contracts";

export function appendKnowledgeOwnershipChange(
  history: KnowledgeOwnershipHistoryEntry[] | undefined,
  fromAgent: string | undefined,
  toAgent: string | undefined,
  changedBy: KnowledgeOwnershipHistoryEntry["changedBy"],
  actorId?: string,
  changedAt = new Date().toISOString(),
): KnowledgeOwnershipHistoryEntry[] {
  const from = fromAgent || undefined;
  const to = toAgent || undefined;
  if (from === to) return history ? [...history] : [];
  return [...(history || []), { fromAgent: from, toAgent: to, changedAt, changedBy, ...(actorId ? { actorId } : {}) }];
}

/** Reconcile source handoffs from the persisted Vault version; ignore client-supplied history. */
export function reconcileVaultOwnerHistory<T extends { knowledgeOwnerAgent?: string; knowledgeOwnerHistory?: KnowledgeOwnershipHistoryEntry[] }>(
  current: T | undefined,
  incoming: T,
  actorId: string,
  changedAt = new Date().toISOString(),
): T {
  if (!current) return { ...incoming, knowledgeOwnerHistory: [] };
  const history = appendKnowledgeOwnershipChange(
    current.knowledgeOwnerHistory,
    current.knowledgeOwnerAgent,
    incoming.knowledgeOwnerAgent,
    "USER",
    actorId,
    changedAt,
  );
  return { ...incoming, knowledgeOwnerHistory: history };
}
