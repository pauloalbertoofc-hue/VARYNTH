import assert from "node:assert/strict";
import { athenaConversationStore } from "../conversation/conversation-store";

const values = new Map<string, string>();
Object.defineProperty(globalThis, "window", { configurable: true, value: {
  localStorage: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  },
  dispatchEvent: () => undefined,
  CustomEvent: class { constructor(_type: string) {} },
} });

values.set("varynth_athena_messages", JSON.stringify([{ id: "legacy-user", sender: "user", text: "Meu histórico antigo", timestamp: "10:00", scope: "geral" }]));
const migrated = athenaConversationStore.load();
assert.equal(migrated.conversations.length, 1, "Legacy messages must migrate into one conversation");
assert.equal(migrated.conversations[0].title, "Conversa anterior");
assert.equal(migrated.conversations[0].messages[0].text, "Meu histórico antigo");

const first = migrated.conversations[0];
const second = athenaConversationStore.create("pesquisa");
athenaConversationStore.saveMessages(second.id, [{ id: "m2", sender: "user", text: "Planejar artigo", timestamp: "11:00", scope: "pesquisa" }], "pesquisa");
assert.equal(athenaConversationStore.getActive()?.id, second.id, "New conversation must become active");
assert.equal(athenaConversationStore.list().length, 2);

athenaConversationStore.activate(first.id);
assert.equal(athenaConversationStore.getActive()?.messages[0].text, "Meu histórico antigo", "Conversation context must remain isolated");
assert.equal(athenaConversationStore.search("artigo")[0]?.id, second.id, "Search must include message content");

athenaConversationStore.archive(first.id);
assert.equal(athenaConversationStore.list().find((item) => item.id === first.id)?.status, "ARCHIVED");
athenaConversationStore.trash(second.id);
assert.equal(athenaConversationStore.list().some((item) => item.id === second.id), false, "Trashed conversation must leave active list");
assert.equal(athenaConversationStore.list(true).find((item) => item.id === second.id)?.status, "TRASHED");
athenaConversationStore.restore(second.id);
assert.equal(athenaConversationStore.getActive()?.id, second.id, "Restore must reactivate selected conversation");
athenaConversationStore.permanentlyDelete(second.id);
assert.equal(athenaConversationStore.list(true).some((item) => item.id === second.id), false, "Permanent deletion must remove only selected conversation");

console.log("✓ Athena conversation store migrates, isolates, searches, archives, trashes, restores and deletes safely");
