export type IntegrationId = "google-calendar" | "gmail" | "google-drive" | "github" | "task-manager";
export type IntegrationStatus = "disponivel" | "conectada" | "desconectada";
export interface IntegrationPermissions { read: boolean; create: boolean; update: boolean; remove: boolean; }
export interface AthenaIntegration { id: IntegrationId; name: string; description: string; status: IntegrationStatus; permissions: IntegrationPermissions; lastSyncAt?: string; importedItems: number; accountLabel?: string; }
const STORAGE_KEY = "varynth_athena_integrations_v1";
const EVENT = "varynth_athena_integrations_updated";
const catalog: AthenaIntegration[] = [
  { id: "google-calendar", name: "Google Calendar", description: "Compromissos, reuniões e prazos do calendário.", status: "disponivel", permissions: { read: true, create: false, update: false, remove: false }, importedItems: 0 },
  { id: "gmail", name: "Gmail", description: "Mensagens que precisam de leitura ou resposta.", status: "disponivel", permissions: { read: true, create: false, update: false, remove: false }, importedItems: 0 },
  { id: "google-drive", name: "Google Drive", description: "Documentos e arquivos relacionados aos projetos.", status: "disponivel", permissions: { read: true, create: false, update: false, remove: false }, importedItems: 0 },
  { id: "github", name: "GitHub", description: "Repositórios, entregas técnicas e problemas abertos.", status: "disponivel", permissions: { read: true, create: false, update: false, remove: false }, importedItems: 0 },
  { id: "task-manager", name: "Gerenciador de tarefas", description: "Tarefas do Todoist, Trello ou Asana.", status: "disponivel", permissions: { read: true, create: false, update: false, remove: false }, importedItems: 0 },
];
let fallback: AthenaIntegration[] = structuredClone(catalog);
function read(): AthenaIntegration[] { if (typeof window === "undefined" || !window.localStorage) return structuredClone(fallback); try { const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); return Array.isArray(stored) ? stored : structuredClone(catalog); } catch { return structuredClone(catalog); } }
function write(items: AthenaIntegration[]) { fallback = structuredClone(items); if (typeof window !== "undefined" && window.localStorage) { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); window.dispatchEvent(new CustomEvent(EVENT)); } }
export class AthenaIntegrationCenter {
  list() { return read(); }
  verifyConnection(id: IntegrationId, accountLabel = "Conta verificada") { const items = read().map((item) => item.id === id ? { ...item, status: "conectada" as const, accountLabel, lastSyncAt: new Date().toISOString() } : item); write(items); return items.find((item) => item.id === id); }
  recordSync(id: IntegrationId, importedItems: number) { const items = read().map((item) => item.id === id ? { ...item, status: "conectada" as const, importedItems: Math.max(0, importedItems), lastSyncAt: new Date().toISOString() } : item); write(items); }
  setReadOnly(id: IntegrationId) { const items = read().map((item) => item.id === id ? { ...item, permissions: { read: true, create: false, update: false, remove: false } } : item); write(items); }
  disconnect(id: IntegrationId) { const items = read().map((item) => item.id === id ? { ...item, status: "desconectada" as const, accountLabel: undefined, lastSyncAt: undefined, importedItems: 0 } : item); write(items); }
  clearForTests() { fallback = structuredClone(catalog); if (typeof window !== "undefined" && window.localStorage) localStorage.removeItem(STORAGE_KEY); }
}
export const athenaIntegrationCenter = new AthenaIntegrationCenter();
export const ATHENA_INTEGRATION_EVENT = EVENT;
