import type { AthenaScope } from "../domain/context";
import type { AthenaMessage } from "../domain/response";
import { mergeAthenaConversationPayload, type AthenaConversationPayload } from "./conversation-sync";

export type AthenaConversationStatus = "ACTIVE" | "ARCHIVED" | "TRASHED";

export interface AthenaConversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
  scope: AthenaScope;
  projectId?: string;
  status: AthenaConversationStatus;
  messageCount: number;
  preview: string;
  messages: AthenaMessage[];
  pinned?: boolean;
  trashedAt?: string;
}

export type { AthenaConversationPayload } from "./conversation-sync";

const STORAGE_KEY = "varynth_athena_conversations_v1";
const LEGACY_MESSAGES_KEY = "varynth_athena_messages";
const MIGRATION_KEY = "varynth_athena_conversations_migrated_v1";
export const ATHENA_CONVERSATIONS_EVENT = "varynth_athena_conversations_updated";
const MAX_CONVERSATIONS = 200;
const MAX_MESSAGES_PER_CONVERSATION = 300;
const TRASH_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

let memoryPayload: AthenaConversationPayload = { schemaVersion: 1, conversations: [] };

function now() { return new Date().toISOString(); }
function id() { return `ath-conv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }
function cleanPreview(text: string) { return text.replace(/\s+/g, " ").trim().slice(0, 110); }

function defaultTitle(messages: AthenaMessage[]) {
  const firstUser = messages.find((message) => message.sender === "user")?.text.trim();
  if (!firstUser) return "Nova conversa";
  return cleanPreview(firstUser).replace(/[.?!]+$/, "").slice(0, 56) || "Nova conversa";
}

function normalizeConversation(input: Partial<AthenaConversation>): AthenaConversation | undefined {
  if (!input.id || !Array.isArray(input.messages)) return undefined;
  const timestamp = input.updatedAt || input.createdAt || now();
  const messages = input.messages.slice(-MAX_MESSAGES_PER_CONVERSATION);
  return {
    id: input.id,
    title: input.title?.trim() || defaultTitle(messages),
    createdAt: input.createdAt || timestamp,
    updatedAt: timestamp,
    lastMessageAt: input.lastMessageAt || timestamp,
    scope: input.scope || "geral",
    projectId: input.projectId,
    status: input.status === "ARCHIVED" || input.status === "TRASHED" ? input.status : "ACTIVE",
    messageCount: messages.length,
    preview: input.preview || cleanPreview(messages.at(-1)?.text || "Sem mensagens"),
    messages,
    pinned: Boolean(input.pinned),
    trashedAt: input.trashedAt,
  };
}

function read(): AthenaConversationPayload {
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : undefined;
    if (!raw) return { ...memoryPayload, conversations: [...memoryPayload.conversations] };
    const parsed = JSON.parse(raw) as Partial<AthenaConversationPayload>;
    if (parsed.schemaVersion !== 1 || !Array.isArray(parsed.conversations)) return { schemaVersion: 1, conversations: [] };
    const conversations = parsed.conversations.map(normalizeConversation).filter((value): value is AthenaConversation => Boolean(value));
    const cutoff = Date.now() - TRASH_RETENTION_MS;
    return {
      schemaVersion: 1,
      activeConversationId: parsed.activeConversationId,
      conversations: conversations.filter((conversation) => conversation.status !== "TRASHED" || !conversation.trashedAt || new Date(conversation.trashedAt).getTime() >= cutoff),
      tombstones: parsed.tombstones && typeof parsed.tombstones === "object" ? parsed.tombstones : {},
    };
  } catch {
    return { ...memoryPayload, conversations: [...memoryPayload.conversations] };
  }
}

function write(payload: AthenaConversationPayload, source: "local" | "remote" = "local") {
  memoryPayload = { ...payload, conversations: [...payload.conversations] };
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      window.dispatchEvent(new CustomEvent(ATHENA_CONVERSATIONS_EVENT, { detail: { source } }));
    }
  } catch {
    // Local storage is best-effort; the in-memory copy remains usable in this session.
  }
}

function migrateLegacy(payload: AthenaConversationPayload): AthenaConversationPayload {
  if (typeof window === "undefined" || window.localStorage.getItem(MIGRATION_KEY)) return payload;
  try {
    const legacy = JSON.parse(window.localStorage.getItem(LEGACY_MESSAGES_KEY) || "[]") as AthenaMessage[];
    if (Array.isArray(legacy) && legacy.length > 0 && payload.conversations.length === 0) {
      const timestamp = now();
      const conversation = normalizeConversation({ id: id(), title: "Conversa anterior", createdAt: timestamp, updatedAt: timestamp, lastMessageAt: timestamp, scope: "geral", status: "ACTIVE", messages: legacy });
      if (conversation) payload = { ...payload, activeConversationId: conversation.id, conversations: [conversation] };
      write(payload);
    }
    window.localStorage.setItem(MIGRATION_KEY, "true");
  } catch {
    // Keep legacy data untouched if it cannot be migrated.
  }
  return payload;
}

export const athenaConversationStore = {
  load(): AthenaConversationPayload { return migrateLegacy(read()); },
  getSyncPayload(): AthenaConversationPayload { return this.load(); },
  replaceFromRemote(payload: AthenaConversationPayload): void {
    write(mergeAthenaConversationPayload(this.load(), payload), "remote");
  },
  list(includeTrashed = false): AthenaConversation[] {
    return this.load().conversations
      .filter((conversation) => includeTrashed || conversation.status !== "TRASHED")
      .sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || b.updatedAt.localeCompare(a.updatedAt));
  },
  getActive(): AthenaConversation | undefined {
    const payload = this.load();
    return payload.conversations.find((conversation) => conversation.id === payload.activeConversationId && conversation.status !== "TRASHED") || this.list().find((conversation) => conversation.status === "ACTIVE");
  },
  create(scope: AthenaScope = "geral", projectId?: string): AthenaConversation {
    const payload = this.load();
    const timestamp = now();
    const conversation: AthenaConversation = { id: id(), title: "Nova conversa", createdAt: timestamp, updatedAt: timestamp, lastMessageAt: timestamp, scope, projectId, status: "ACTIVE", messageCount: 0, preview: "Sem mensagens", messages: [] };
    const conversations = [conversation, ...payload.conversations.filter((item) => item.status === "TRASHED" || item.id !== conversation.id)].slice(0, MAX_CONVERSATIONS + payload.conversations.filter((item) => item.status === "TRASHED").length);
    write({ ...payload, activeConversationId: conversation.id, conversations });
    return conversation;
  },
  activate(conversationId: string): AthenaConversation | undefined {
    const payload = this.load();
    const target = payload.conversations.find((conversation) => conversation.id === conversationId && conversation.status !== "TRASHED");
    if (!target) return undefined;
    write({ ...payload, activeConversationId: target.id });
    return target;
  },
  saveMessages(conversationId: string, messages: AthenaMessage[], scope?: AthenaScope): AthenaConversation | undefined {
    const payload = this.load();
    let saved: AthenaConversation | undefined;
    const timestamp = now();
    const conversations = payload.conversations.map((conversation) => {
      if (conversation.id !== conversationId) return conversation;
      saved = normalizeConversation({ ...conversation, messages, scope: scope || conversation.scope, title: conversation.title === "Nova conversa" ? defaultTitle(messages) : conversation.title, updatedAt: timestamp, lastMessageAt: timestamp });
      return saved!;
    });
    if (!saved) return undefined;
    write({ ...payload, activeConversationId: conversationId, conversations });
    return saved;
  },
  rename(conversationId: string, title: string): void {
    const payload = this.load();
    write({ ...payload, conversations: payload.conversations.map((conversation) => conversation.id === conversationId ? { ...conversation, title: title.trim().slice(0, 80) || conversation.title, updatedAt: now() } : conversation) });
  },
  setPinned(conversationId: string, pinned: boolean): void {
    const payload = this.load();
    write({ ...payload, conversations: payload.conversations.map((conversation) => conversation.id === conversationId ? { ...conversation, pinned, updatedAt: now() } : conversation) });
  },
  archive(conversationId: string): void {
    const payload = this.load();
    const nextActive = payload.activeConversationId === conversationId ? payload.conversations.find((conversation) => conversation.id !== conversationId && conversation.status === "ACTIVE")?.id : payload.activeConversationId;
    write({ ...payload, activeConversationId: nextActive, conversations: payload.conversations.map((conversation) => conversation.id === conversationId ? { ...conversation, status: "ARCHIVED", updatedAt: now() } : conversation) });
  },
  trash(conversationId: string): void {
    const payload = this.load();
    const nextActive = payload.activeConversationId === conversationId ? payload.conversations.find((conversation) => conversation.id !== conversationId && conversation.status === "ACTIVE")?.id : payload.activeConversationId;
    write({ ...payload, activeConversationId: nextActive, conversations: payload.conversations.map((conversation) => conversation.id === conversationId ? { ...conversation, status: "TRASHED", trashedAt: now(), updatedAt: now() } : conversation) });
  },
  restore(conversationId: string): void {
    const payload = this.load();
    write({ ...payload, activeConversationId: conversationId, conversations: payload.conversations.map((conversation) => conversation.id === conversationId ? { ...conversation, status: "ACTIVE", trashedAt: undefined, updatedAt: now() } : conversation) });
  },
  permanentlyDelete(conversationId: string): void {
    const payload = this.load();
    write({ ...payload, tombstones: { ...payload.tombstones, [conversationId]: now() }, conversations: payload.conversations.filter((conversation) => conversation.id !== conversationId), activeConversationId: payload.activeConversationId === conversationId ? undefined : payload.activeConversationId });
  },
  search(query: string): AthenaConversation[] {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return this.list();
    return this.list().filter((conversation) => `${conversation.title} ${conversation.preview} ${conversation.messages.map((message) => message.text).join(" ")}`.toLowerCase().includes(normalized));
  },
};
