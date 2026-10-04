import type { KnowledgeItem, KnowledgeLifecycleState } from "./contracts";

export const KNOWLEDGE_LIFECYCLE_STATES: readonly KnowledgeLifecycleState[] = [
  "ACTIVE", "DRAFT", "REVIEW", "STALE", "ARCHIVED", "DEPRECATED",
];

const transitions: Record<KnowledgeLifecycleState, ReadonlySet<KnowledgeLifecycleState>> = {
  ACTIVE: new Set(["STALE", "REVIEW", "ARCHIVED", "DEPRECATED"]),
  DRAFT: new Set(["REVIEW", "ACTIVE", "ARCHIVED"]),
  REVIEW: new Set(["ACTIVE", "STALE", "ARCHIVED", "DEPRECATED"]),
  STALE: new Set(["REVIEW", "ACTIVE", "ARCHIVED", "DEPRECATED"]),
  ARCHIVED: new Set(["REVIEW", "DEPRECATED"]),
  DEPRECATED: new Set(["REVIEW"]),
};

export function getKnowledgeLifecycleState(item: Pick<KnowledgeItem, "lifecycleState">): KnowledgeLifecycleState {
  return item.lifecycleState || "ACTIVE";
}

export function isKnowledgeLifecycleState(value: unknown): value is KnowledgeLifecycleState {
  return typeof value === "string" && KNOWLEDGE_LIFECYCLE_STATES.includes(value as KnowledgeLifecycleState);
}

export function assertKnowledgeLifecycleTransition(currentValue: unknown, nextValue: unknown): asserts nextValue is KnowledgeLifecycleState {
  if (!isKnowledgeLifecycleState(nextValue)) throw new Error("[KNOWLEDGE_LIFECYCLE_STATE_INVALID] Estado lifecycle inválido.");
  const current = isKnowledgeLifecycleState(currentValue) ? currentValue : "ACTIVE";
  if (current !== nextValue && !transitions[current].has(nextValue)) {
    throw new Error(`[KNOWLEDGE_LIFECYCLE_TRANSITION_INVALID] Transição ${current} → ${nextValue} não permitida.`);
  }
}

export function lifecycleAllowsRetrieval(item: Pick<KnowledgeItem, "lifecycleState">): boolean {
  const state = getKnowledgeLifecycleState(item);
  return state !== "ARCHIVED" && state !== "DEPRECATED";
}

export function lifecycleAllowsRequester(item: Pick<KnowledgeItem, "lifecycleState" | "ownerAgent">, requester: string): boolean {
  const state = getKnowledgeLifecycleState(item);
  return state !== "DRAFT" && state !== "REVIEW" || item.ownerAgent === requester;
}

export function availableKnowledgeLifecycleTransitions(currentValue: unknown): KnowledgeLifecycleState[] {
  const current = isKnowledgeLifecycleState(currentValue) ? currentValue : "ACTIVE";
  return [current, ...transitions[current]];
}
