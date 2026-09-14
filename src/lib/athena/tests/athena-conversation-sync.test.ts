import assert from "node:assert/strict";
import { mergeAthenaConversationPayload } from "../conversation/conversation-sync";

const conversation = (id: string, updatedAt: string, title = id) => ({ id, title, createdAt: updatedAt, updatedAt, lastMessageAt: updatedAt, scope: "geral" as const, status: "ACTIVE" as const, messageCount: 0, preview: "Sem mensagens", messages: [] });

const remote = { schemaVersion: 1 as const, conversations: [conversation("remote", "2026-09-06T10:00:00.000Z")], tombstones: {} };
const device = { schemaVersion: 1 as const, conversations: [conversation("phone", "2026-09-06T11:00:00.000Z")], tombstones: {} };
const merged = mergeAthenaConversationPayload(remote, device);
assert.deepEqual(merged.conversations.map((item) => item.id).sort(), ["phone", "remote"], "Conversations created on separate devices must both survive");

const newer = mergeAthenaConversationPayload({ schemaVersion: 1, conversations: [conversation("same", "2026-09-06T10:00:00.000Z", "Antiga")] }, { schemaVersion: 1, conversations: [conversation("same", "2026-09-06T12:00:00.000Z", "Nova")] });
assert.equal(newer.conversations[0].title, "Nova", "The newest edit must win for the same conversation");

const deleted = mergeAthenaConversationPayload({ schemaVersion: 1, conversations: [conversation("removed", "2026-09-06T10:00:00.000Z")] }, { schemaVersion: 1, conversations: [conversation("removed", "2026-09-06T10:00:00.000Z")], tombstones: { removed: "2026-09-06T12:00:00.000Z" } });
assert.equal(deleted.conversations.length, 0, "A deletion must not be undone by an older device");
assert.ok(deleted.tombstones?.removed, "Deletion marker must be retained for later device sync");
console.log("✓ Athena conversation sync merges devices and preserves permanent deletions");
