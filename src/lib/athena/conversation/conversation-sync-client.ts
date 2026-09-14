import { athenaConversationStore, type AthenaConversationPayload } from "./conversation-store";

export type AthenaConversationSyncStatus = "idle" | "syncing" | "synced" | "offline" | "login_required" | "unavailable" | "error";

export async function syncAthenaConversations(): Promise<AthenaConversationSyncStatus> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return "offline";
  try {
    const response = await fetch("/api/athena/conversations/sync", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ payload: athenaConversationStore.getSyncPayload() }),
    });
    if (response.status === 401) return "login_required";
    if (response.status === 503) return "unavailable";
    if (!response.ok) return "error";
    const body = await response.json() as { payload?: AthenaConversationPayload };
    if (body.payload) athenaConversationStore.replaceFromRemote(body.payload);
    return "synced";
  } catch {
    return "offline";
  }
}
