import type { AthenaConversation } from "./conversation-store";

export interface AthenaConversationPayload {
  schemaVersion: 1;
  activeConversationId?: string;
  conversations: AthenaConversation[];
  /** Permanent-deletion markers prevent an older device from restoring a removed conversation. */
  tombstones?: Record<string, string>;
}

const MAX_CONVERSATIONS = 200;
const MAX_TOMBSTONES = 500;

function timestamp(value?: string) {
  const parsed = value ? Date.parse(value) : NaN;
  return Number.isFinite(parsed) ? parsed : 0;
}

function cleanTombstones(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.entries(value as Record<string, unknown>)
    .filter(([id, deletedAt]) => id.length <= 160 && typeof deletedAt === "string" && timestamp(deletedAt) > 0)
    .sort(([, a], [, b]) => timestamp(b as string) - timestamp(a as string))
    .slice(0, MAX_TOMBSTONES)
    .reduce<Record<string, string>>((result, [id, deletedAt]) => ({ ...result, [id]: deletedAt as string }), {});
}

export function mergeAthenaConversationPayload(
  stored: AthenaConversationPayload,
  incoming: AthenaConversationPayload,
): AthenaConversationPayload {
  const tombstones = cleanTombstones({ ...cleanTombstones(stored.tombstones), ...cleanTombstones(incoming.tombstones) });
  const conversations = new Map<string, AthenaConversation>();

  for (const conversation of [...stored.conversations, ...incoming.conversations]) {
    const deletedAt = tombstones[conversation.id];
    if (deletedAt && timestamp(deletedAt) >= timestamp(conversation.updatedAt)) continue;
    const current = conversations.get(conversation.id);
    if (!current || timestamp(conversation.updatedAt) > timestamp(current.updatedAt)) conversations.set(conversation.id, conversation);
  }

  const result = [...conversations.values()]
    .sort((a, b) => timestamp(b.updatedAt) - timestamp(a.updatedAt))
    .slice(0, MAX_CONVERSATIONS);
  const preferredActive = incoming.activeConversationId || stored.activeConversationId;
  const activeConversationId = result.some((conversation) => conversation.id === preferredActive && conversation.status !== "TRASHED")
    ? preferredActive
    : result.find((conversation) => conversation.status === "ACTIVE")?.id;

  return { schemaVersion: 1, activeConversationId, conversations: result, tombstones };
}

export function isAthenaConversationPayload(value: unknown): value is AthenaConversationPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<AthenaConversationPayload>;
  return payload.schemaVersion === 1 && Array.isArray(payload.conversations) && payload.conversations.length <= MAX_CONVERSATIONS;
}
