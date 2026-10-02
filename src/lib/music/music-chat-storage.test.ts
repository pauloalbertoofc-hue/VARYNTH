import assert from "node:assert/strict";
import { LEGACY_ATHENA_SESSION_STORAGE_KEY, LEGACY_MUSIC_CHAT_STORAGE_KEY, musicChatScopeFromSession, musicChatStorageKeys } from "./music-chat-storage";

assert.deepEqual(musicChatScopeFromSession({}), { kind: "device" });
assert.deepEqual(musicChatScopeFromSession({ user: { id: "user-a" } }), { kind: "account", userId: "user-a" });
assert.equal(musicChatScopeFromSession({ user: { email: "account@example.test" } }), null);
assert.equal(musicChatScopeFromSession(null), null);

const accountA = musicChatStorageKeys({ kind: "account", userId: "user-a" });
const accountB = musicChatStorageKeys({ kind: "account", userId: "user-b" });
assert.notEqual(accountA.chat, accountB.chat);
assert.notEqual(accountA.athenaSession, accountB.athenaSession);
assert.ok(accountA.chat.startsWith(`${LEGACY_MUSIC_CHAT_STORAGE_KEY}:account:`));
assert.ok(accountA.athenaSession.startsWith(`${LEGACY_ATHENA_SESSION_STORAGE_KEY}:account:`));
assert.deepEqual(musicChatStorageKeys({ kind: "device" }), {
  chat: `${LEGACY_MUSIC_CHAT_STORAGE_KEY}:device:default`,
  athenaSession: `${LEGACY_ATHENA_SESSION_STORAGE_KEY}:device:default`,
});

console.log("Euterpe chat history and Athena session storage remain isolated by account identity.");
