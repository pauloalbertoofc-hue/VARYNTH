export const ACCENT_COLORS = {
  violet: { label: "Violeta", values: ["#a78bfa", "#8b5cf6", "#7c3aed", "#6d28d9", "#5b21b6"] },
  cyan: { label: "Ciano", values: ["#67e8f9", "#22d3ee", "#06b6d4", "#0891b2", "#0e7490"] },
  emerald: { label: "Esmeralda", values: ["#6ee7b7", "#34d399", "#10b981", "#059669", "#047857"] },
  amber: { label: "Âmbar", values: ["#fcd34d", "#fbbf24", "#f59e0b", "#d97706", "#b45309"] },
  rose: { label: "Rosa", values: ["#fda4af", "#fb7185", "#f43f5e", "#e11d48", "#be123c"] },
  blue: { label: "Azul", values: ["#93c5fd", "#60a5fa", "#3b82f6", "#2563eb", "#1d4ed8"] },
} as const;
export const DASHBOARD_SECTIONS = ["hero", "metricProjects", "metricTasks", "metricCompleted", "metricVault", "priorityTasks", "deadlines", "activeProjects", "clock", "focusTimer", "scratchpad", "activity", "modules"] as const;
export type DashboardSection = typeof DASHBOARD_SECTIONS[number];
export const VAULT_SECTIONS = ["header", "metricTotal", "metricReading", "metricCompleted", "metricToRead", "athena", "categories", "sources", "compilation", "processing", "filters", "items"] as const;
export type VaultSection = typeof VAULT_SECTIONS[number];
export const NAVIGATION_ITEMS = [
  ["/projects", "Projetos"], ["/modules/technical-archive", "Technical Docs"], ["/modules/graph", "Graph Rede"],
  ["/modules/activity", "Histórico"], ["/modules/vault", "Vault"], ["/modules/knowledge", "Knowledge"], ["/modules/experience", "Experience Layer"], ["/modules/chronos", "Chronos"],
  ["/modules/people", "People"], ["/modules/labs", "Labs"], ["/modules/trash", "Lixeira"], ["/modules/music", "Música"],
  ["/modules/athena", "Athena AI"], ["/modules/codex", "Codex"], ["/modules/research", "Research"],
  ["/modules/opportunities", "Opportunities"], ["/modules/forge", "Forge"], ["/modules/studio", "Studios Criativos"],
] as const;
export type NavigationHref = typeof NAVIGATION_ITEMS[number][0];
export interface PlatformPreferences {
  accentColor: string;
  appName: string;
  displayName: string;
  dashboard: Record<DashboardSection, boolean>;
  vault: Record<VaultSection, boolean>;
  hiddenNavigation: NavigationHref[];
  backgroundImage: string | null;
}
export const DEFAULT_PREFERENCES: PlatformPreferences = {
  accentColor: "violet", appName: "VARYNTH", displayName: "Paulo",
  dashboard: { hero: true, metricProjects: true, metricTasks: true, metricCompleted: true, metricVault: true, priorityTasks: true, deadlines: true, activeProjects: true, clock: true, focusTimer: true, scratchpad: true, activity: true, modules: true },
  vault: { header: true, metricTotal: true, metricReading: true, metricCompleted: true, metricToRead: true, athena: true, categories: true, sources: true, compilation: true, processing: true, filters: true, items: true }, hiddenNavigation: [], backgroundImage: null,
};
export function parsePreferences(value: unknown): PlatformPreferences {
  const raw = value && typeof value === "object" ? value as Partial<PlatformPreferences> : {};
  const accentColor = typeof raw.accentColor === "string" && /^#[\da-fA-F]{6}$/.test(raw.accentColor) ? raw.accentColor : DEFAULT_PREFERENCES.accentColor;
  const cleanText = (value: unknown, fallback: string, max: number) => typeof value === "string" && value.trim() ? value.trim().slice(0, max) : fallback;
  const dashboard = {} as Record<DashboardSection, boolean>;
  for (const key of DASHBOARD_SECTIONS) dashboard[key] = raw.dashboard?.[key] !== false;
  const vault = {} as Record<VaultSection, boolean>;
  for (const key of VAULT_SECTIONS) vault[key] = raw.vault?.[key] !== false;
  const hiddenNavigation = Array.isArray(raw.hiddenNavigation)
    ? raw.hiddenNavigation.filter((href): href is NavigationHref => NAVIGATION_ITEMS.some(([itemHref]) => href === itemHref))
    : [];
  const backgroundImage = typeof raw.backgroundImage === "string" && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(raw.backgroundImage) && raw.backgroundImage.length <= 700_000 ? raw.backgroundImage : null;
  return { accentColor, appName: cleanText(raw.appName, DEFAULT_PREFERENCES.appName, 40), displayName: cleanText(raw.displayName, DEFAULT_PREFERENCES.displayName, 60), dashboard, vault, hiddenNavigation, backgroundImage };
}
