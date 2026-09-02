import type { AthenaEngineContext } from "../engine";
import { notificationService } from "@/lib/notifications/notification-service";
import { athenaSuggestionCenter } from "./suggestion-center";

export type ProactivityMode = "silencioso" | "critico" | "equilibrado" | "proativo";

export interface AthenaMonitorSettings {
  mode: ProactivityMode;
  quietEnabled: boolean;
  quietStart: string;
  quietEnd: string;
  dailyBriefing: boolean;
  dailyTime: string;
  weeklyReview: boolean;
  weeklyDay: number;
  weeklyTime: string;
}

interface MonitorState { emitted: Record<string, string>; snoozedUntil?: Record<string, string>; }

const SETTINGS_KEY = "varynth_athena_monitor_settings_v1";
const STATE_KEY = "varynth_athena_monitor_state_v1";
const DEFAULTS: AthenaMonitorSettings = { mode: "equilibrado", quietEnabled: true, quietStart: "22:00", quietEnd: "08:00", dailyBriefing: true, dailyTime: "08:00", weeklyReview: true, weeklyDay: 1, weeklyTime: "09:00" };
let fallbackSettings = { ...DEFAULTS };
let fallbackState: MonitorState = { emitted: {} };

function storageRead<T>(key: string, fallback: T): T {
  if (typeof window === "undefined" || !window.localStorage) return JSON.parse(JSON.stringify(fallback));
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch { return JSON.parse(JSON.stringify(fallback)); }
}

function storageWrite(key: string, value: unknown): void {
  if (typeof window !== "undefined" && window.localStorage) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* armazenamento indisponível */ }
  }
}

function timeValue(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function inQuietHours(now: Date, settings: AthenaMonitorSettings): boolean {
  if (!settings.quietEnabled) return false;
  const current = now.getHours() * 60 + now.getMinutes();
  const start = timeValue(settings.quietStart);
  const end = timeValue(settings.quietEnd);
  return start <= end ? current >= start && current < end : current >= start || current < end;
}

function canEmit(severity: "critico" | "atencao" | "oportunidade", mode: ProactivityMode): boolean {
  if (mode === "silencioso") return false;
  if (mode === "critico") return severity === "critico";
  if (mode === "equilibrado") return severity !== "oportunidade";
  return true;
}

function recent(state: MonitorState, fingerprint: string, now: Date, hours = 24): boolean {
  const snoozedUntil = state.snoozedUntil?.[fingerprint];
  if (snoozedUntil && new Date(snoozedUntil).getTime() > now.getTime()) return true;
  if (snoozedUntil && state.snoozedUntil) delete state.snoozedUntil[fingerprint];
  const previous = state.emitted[fingerprint];
  return Boolean(previous && now.getTime() - new Date(previous).getTime() < hours * 3_600_000);
}

export class AthenaProactiveMonitor {
  getSettings(): AthenaMonitorSettings {
    const loaded = storageRead(SETTINGS_KEY, fallbackSettings);
    return { ...DEFAULTS, ...loaded };
  }

  saveSettings(settings: AthenaMonitorSettings): void {
    fallbackSettings = { ...settings };
    storageWrite(SETTINGS_KEY, settings);
  }

  scan(ctx: AthenaEngineContext, now = new Date()): number {
    const settings = this.getSettings();
    if (inQuietHours(now, settings) || settings.mode === "silencioso") return 0;
    const state = storageRead<MonitorState>(STATE_KEY, fallbackState);
    let created = 0;
    const suggestions = athenaSuggestionCenter.list(ctx, now).filter((item) => item.status === "ativa" && canEmit(item.severity, settings.mode));
    for (const item of suggestions) {
      const fingerprint = `athena:${item.id}`;
      if (recent(state, fingerprint, now)) continue;
      const task = ctx.tasks.find((candidate) => candidate.title === item.detail && (!item.projectId || candidate.projectId === item.projectId));
      notificationService.create({
        type: "ATHENA_PROACTIVE_ALERT",
        title: item.label,
        message: item.detail,
        severity: item.severity === "critico" ? "CRITICAL" : item.severity === "atencao" ? "WARNING" : "INFO",
        source: "ATHENA",
        entityId: task?.id || item.projectId,
        entityType: task ? "TASK" : item.projectId ? "PROJECT" : "INSIGHT",
        targetPath: item.projectId ? `/projects/${item.projectId}` : "/modules/athena",
        reason: `A Athena detectou este ponto durante o acompanhamento automático no modo ${settings.mode}.`,
        evidence: [item.label, item.detail, item.projectId ? `Projeto: ${ctx.projects.find((project) => project.id === item.projectId)?.title || item.projectId}` : "Contexto global"],
        fingerprint,
        actions: [
          ...(task && task.status !== "concluida" ? [{ id: "complete", label: "Concluir", type: "COMPLETE_TASK" as const, payload: { taskId: task.id } }] : []),
          { id: "task", label: "Criar tarefa", type: "CREATE_TASK", payload: { projectId: item.projectId, title: `Resolver alerta — ${item.detail}` } },
          { id: "snooze", label: "Adiar 24h", type: "SNOOZE", payload: { fingerprint } },
        ],
      });
      state.emitted[fingerprint] = now.toISOString();
      created += 1;
    }

    const today = now.toISOString().slice(0, 10);
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const emitRoutine = (fingerprint: string, title: string, message: string) => {
      if (state.emitted[fingerprint]) return;
      notificationService.create({ type: "ATHENA_ROUTINE", title, message, severity: "INFO", source: "ATHENA", targetPath: "/modules/athena", reason: "Rotina configurada pelo usuário nas preferências de proatividade.", fingerprint });
      state.emitted[fingerprint] = now.toISOString(); created += 1;
    };
    if (settings.dailyBriefing && currentMinutes >= timeValue(settings.dailyTime)) emitRoutine(`daily:${today}`, "Briefing diário disponível", "A Athena preparou a leitura atual de projetos, tarefas e prazos.");
    if (settings.weeklyReview && now.getDay() === settings.weeklyDay && currentMinutes >= timeValue(settings.weeklyTime)) emitRoutine(`weekly:${today}`, "Revisão semanal disponível", "Revise prioridades, projetos sem próxima ação e prazos da semana com a Athena.");

    fallbackState = state;
    storageWrite(STATE_KEY, state);
    return created;
  }

  snooze(fingerprint: string, until: Date): void {
    const state = storageRead<MonitorState>(STATE_KEY, fallbackState);
    state.snoozedUntil = { ...(state.snoozedUntil || {}), [fingerprint]: until.toISOString() };
    delete state.emitted[fingerprint];
    fallbackState = state;
    storageWrite(STATE_KEY, state);
  }

  clearForTests(): void {
    fallbackSettings = { ...DEFAULTS }; fallbackState = { emitted: {} };
    if (typeof window !== "undefined" && window.localStorage) { localStorage.removeItem(SETTINGS_KEY); localStorage.removeItem(STATE_KEY); }
  }
}

export const athenaProactiveMonitor = new AthenaProactiveMonitor();
