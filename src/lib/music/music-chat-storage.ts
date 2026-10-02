export const LEGACY_MUSIC_CHAT_STORAGE_KEY = "varynth_music_curator_chat_v1";
export const LEGACY_ATHENA_SESSION_STORAGE_KEY = "varynth_music_curator_athena_session_v1";

export type MusicChatScope = { kind: "account"; userId: string } | { kind: "device" };

/** Resolves a private chat scope from the NextAuth session response. */
export function musicChatScopeFromSession(value: unknown): MusicChatScope | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const session = value as { user?: unknown };
  if (!session.user) return { kind: "device" };
  if (typeof session.user !== "object" || Array.isArray(session.user)) return null;
  const id = (session.user as { id?: unknown }).id;
  if (typeof id !== "string" || !id.trim() || id.length > 200) return null;
  return { kind: "account", userId: id.trim() };
}

export function musicChatStorageKeys(scope: MusicChatScope): { chat: string; athenaSession: string } {
  const identity = scope.kind === "account" ? `account:${encodeURIComponent(scope.userId)}` : "device:default";
  return {
    chat: `${LEGACY_MUSIC_CHAT_STORAGE_KEY}:${identity}`,
    athenaSession: `${LEGACY_ATHENA_SESSION_STORAGE_KEY}:${identity}`,
  };
}

