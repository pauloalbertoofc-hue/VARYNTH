import type { ChronosEvent, Project } from "@/lib/types";

export interface GoogleCalendarEventSnapshot { id: string; summary: string; start: string; end: string; url?: string; location?: string; description?: string; calendarId?: string; updatedAt?: string; }
export interface CalendarInboxItem extends GoogleCalendarEventSnapshot { fingerprint: string; receivedAt: string; suggestedProjectId?: string; conflictIds: string[]; importedChronosId?: string; }
export interface CalendarSyncSettings { enabled: boolean; intervalMinutes: 15 | 30 | 60 | 180; windowDays: number; }
export interface CalendarSyncStatus { state: "aguardando_ponte" | "atualizada" | "desatualizada" | "falhou"; lastAttemptAt?: string; lastSuccessAt?: string; error?: string; }

const INBOX_KEY = "varynth_athena_google_calendar_inbox_v1";
const SETTINGS_KEY = "varynth_athena_google_calendar_sync_settings_v1";
const STATUS_KEY = "varynth_athena_google_calendar_sync_status_v1";
const EVENT = "varynth_google_calendar_sync_updated";
let fallbackInbox: CalendarInboxItem[] = [];
let fallbackSettings: CalendarSyncSettings = { enabled: true, intervalMinutes: 30, windowDays: 45 };
let fallbackStatus: CalendarSyncStatus = { state: "aguardando_ponte" };
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
function get<T>(key: string, fallback: T): T { if (typeof window === "undefined" || !window.localStorage) return clone(fallback); try { return JSON.parse(localStorage.getItem(key) || "null") || clone(fallback); } catch { return clone(fallback); } }
function set<T>(key: string, value: T) { if (key === INBOX_KEY) fallbackInbox = clone(value as CalendarInboxItem[]); if (key === SETTINGS_KEY) fallbackSettings = clone(value as CalendarSyncSettings); if (key === STATUS_KEY) fallbackStatus = clone(value as CalendarSyncStatus); if (typeof window !== "undefined" && window.localStorage) { localStorage.setItem(key, JSON.stringify(value)); window.dispatchEvent(new CustomEvent(EVENT)); } }
function fingerprint(item: GoogleCalendarEventSnapshot) { return `${item.calendarId || "primary"}:${item.id}:${item.start}:${item.end}`; }
function words(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().split(/\W+/).filter((word) => word.length > 3); }
function suggestedProject(event: GoogleCalendarEventSnapshot, projects: Project[]) { const eventWords = new Set(words(`${event.summary} ${event.description || ""}`)); return projects.map((project) => ({ id: project.id, score: words(`${project.title} ${project.description} ${project.tags.join(" ")}`).filter((word) => eventWords.has(word)).length })).sort((a, b) => b.score - a.score)[0]?.score ? projects.map((project) => ({ id: project.id, score: words(`${project.title} ${project.description} ${project.tags.join(" ")}`).filter((word) => eventWords.has(word)).length })).sort((a, b) => b.score - a.score)[0].id : undefined; }
function overlaps(a: CalendarInboxItem, b: CalendarInboxItem) { return a.id !== b.id && new Date(a.start).getTime() < new Date(b.end).getTime() && new Date(b.start).getTime() < new Date(a.end).getTime(); }

export class GoogleCalendarSyncEngine {
  inbox() { return get(INBOX_KEY, fallbackInbox).sort((a, b) => a.start.localeCompare(b.start)); }
  settings() { return get(SETTINGS_KEY, fallbackSettings); }
  status(now = new Date()): CalendarSyncStatus { const status = get(STATUS_KEY, fallbackStatus); const settings = this.settings(); if (status.state === "atualizada" && status.lastSuccessAt && now.getTime() - new Date(status.lastSuccessAt).getTime() > settings.intervalMinutes * 120_000) return { ...status, state: "desatualizada" }; return status; }
  saveSettings(settings: CalendarSyncSettings) { set(SETTINGS_KEY, settings); }
  ingest(events: GoogleCalendarEventSnapshot[], projects: Project[], now = new Date()) {
    const existing = this.inbox(); const byId = new Map(existing.map((item) => [`${item.calendarId || "primary"}:${item.id}`, item]));
    for (const event of events) { const key = `${event.calendarId || "primary"}:${event.id}`; const previous = byId.get(key); byId.set(key, { ...event, fingerprint: fingerprint(event), receivedAt: now.toISOString(), suggestedProjectId: previous?.suggestedProjectId || suggestedProject(event, projects), conflictIds: [], importedChronosId: previous?.importedChronosId }); }
    const items = [...byId.values()]; items.forEach((item) => { item.conflictIds = items.filter((other) => overlaps(item, other)).map((other) => other.id); });
    set(INBOX_KEY, items); set(STATUS_KEY, { state: "atualizada", lastAttemptAt: now.toISOString(), lastSuccessAt: now.toISOString() }); return { total: items.length, received: events.length, conflicts: items.filter((item) => item.conflictIds.length).length };
  }
  recordFailure(message: string) { const previous = this.status(); set(STATUS_KEY, { ...previous, state: "falhou", lastAttemptAt: new Date().toISOString(), error: message }); }
  importToChronos(id: string, projectId: string | undefined, existing: ChronosEvent[], add: (event: Omit<ChronosEvent, "id" | "createdAt">, actor?: "athena") => ChronosEvent) {
    const items = this.inbox(); const item = items.find((entry) => entry.id === id); if (!item) return { success: false, error: "Evento externo não encontrado." }; const marker = `Google Calendar: ${item.calendarId || "primary"}/${item.id}`; const duplicate = existing.find((entry) => entry.notes?.includes(marker)); if (duplicate) return { success: false, error: "Este evento já foi importado para o Chronos." };
    const start = new Date(item.start); const end = new Date(item.end); const created = add({ title: item.summary, date: item.start.slice(0, 10), startTime: item.start.includes("T") ? `${String(start.getHours()).padStart(2,"0")}:${String(start.getMinutes()).padStart(2,"0")}` : undefined, endTime: item.end.includes("T") ? `${String(end.getHours()).padStart(2,"0")}:${String(end.getMinutes()).padStart(2,"0")}` : undefined, type: "evento", projectId: projectId || item.suggestedProjectId, notes: `${item.description || ""}\n${marker}`.trim(), completed: false }, "athena"); item.importedChronosId = created.id; set(INBOX_KEY, items); return { success: true, event: created };
  }
  removeImportedData() { set(INBOX_KEY, []); set(STATUS_KEY, { state: "aguardando_ponte" }); }
  clearForTests() { fallbackInbox = []; fallbackSettings = { enabled: true, intervalMinutes: 30, windowDays: 45 }; fallbackStatus = { state: "aguardando_ponte" }; if (typeof window !== "undefined" && window.localStorage) [INBOX_KEY, SETTINGS_KEY, STATUS_KEY].forEach((key) => localStorage.removeItem(key)); }
}
export const googleCalendarSync = new GoogleCalendarSyncEngine();
export const GOOGLE_CALENDAR_SYNC_EVENT = EVENT;
