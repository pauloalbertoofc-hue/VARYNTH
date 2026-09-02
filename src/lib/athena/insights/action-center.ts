import type { AthenaEngineContext } from "../engine";
import type { PriorityLevel, Task } from "@/lib/types";
import { athenaProjectPlanManager } from "../planning/project-plan-manager";
import { athenaSuggestionCenter } from "./suggestion-center";
import { googleCalendarSync } from "../integrations/google-calendar-sync";

export type AthenaActionKind = "PLAN_APPROVAL" | "PLAN_EXECUTION" | "TASK_OVERDUE" | "TASK_DUE_SOON" | "FINDING" | "MISSING_DATA" | "CALENDAR_EVENT";
export type AthenaActionSeverity = "critico" | "atencao" | "oportunidade";
export type AthenaActionDecision = "ativa" | "adiada" | "dispensada" | "concluida";
export interface AthenaActionItem { id: string; kind: AthenaActionKind; severity: AthenaActionSeverity; title: string; detail: string; reason: string; projectId?: string; taskId?: string; planId?: string; score: number; decision: AthenaActionDecision; snoozedUntil?: string; }
interface StoredDecision { decision: AthenaActionDecision; updatedAt: string; snoozedUntil?: string; }
const STORAGE_KEY = "varynth_athena_action_center_v1";
let fallback: Record<string, StoredDecision> = {};

function read(): Record<string, StoredDecision> { if (typeof window === "undefined" || !window.localStorage) return { ...fallback }; try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; } }
function write(value: Record<string, StoredDecision>): void { fallback = { ...value }; if (typeof window !== "undefined" && window.localStorage) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(value)); window.dispatchEvent(new CustomEvent("varynth_athena_actions_updated")); } catch { /* armazenamento indisponível */ } } }
function localDay(value?: string): number | undefined { if (!value) return undefined; const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/); if (!match) return undefined; return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])).getTime(); }
function daysUntil(value: string, now: Date): number { const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime(); return Math.round(((localDay(value) ?? today) - today) / 86_400_000); }
function priorityBonus(priority: PriorityLevel): number { return ({ urgente: 18, alta: 12, media: 6, baixa: 0 })[priority]; }

export class AthenaActionCenter {
  list(ctx: AthenaEngineContext, now = new Date(), includeResolved = false): AthenaActionItem[] {
    const decisions = read();
    const raw: Omit<AthenaActionItem, "decision" | "snoozedUntil">[] = [];
    const pendingTasks = ctx.tasks.filter((task) => task.status !== "concluida");
    for (const calendarEvent of googleCalendarSync.inbox().filter((item) => !item.importedChronosId)) {
      const hours = Math.round((new Date(calendarEvent.start).getTime() - now.getTime()) / 3_600_000);
      if (hours >= 0 && hours <= 168) raw.push({ id: `calendar:${calendarEvent.fingerprint}`, kind: "CALENDAR_EVENT", severity: hours <= 24 || calendarEvent.conflictIds.length ? "critico" : "atencao", title: calendarEvent.summary, detail: `${new Date(calendarEvent.start).toLocaleString("pt-BR")}${calendarEvent.conflictIds.length ? ` · ${calendarEvent.conflictIds.length} conflito(s)` : ""}`, reason: calendarEvent.conflictIds.length ? "O evento externo possui conflito de horário." : "Compromisso externo previsto para os próximos sete dias.", projectId: calendarEvent.suggestedProjectId, score: calendarEvent.conflictIds.length ? 108 : 86 + Math.max(0, 24 - hours) });
    }
    for (const plan of athenaProjectPlanManager.list()) {
      if (plan.status === "RASCUNHO") raw.push({ id: `plan-approval:${plan.id}`, kind: "PLAN_APPROVAL", severity: "atencao", title: "Plano aguardando decisão", detail: plan.objective, reason: `A revisão ${plan.revision} está pronta, mas nenhuma alteração será aplicada sem sua aprovação.`, projectId: plan.projectId, planId: plan.id, score: 88 });
      if (plan.status === "APROVADO") raw.push({ id: `plan-execution:${plan.id}`, kind: "PLAN_EXECUTION", severity: "critico", title: "Plano aprovado aguardando execução", detail: plan.objective, reason: "Você já aprovou esta revisão; a execução continua pausada até um novo comando explícito.", projectId: plan.projectId, planId: plan.id, score: 96 });
      if (["RASCUNHO", "APROVADO"].includes(plan.status) && plan.missingData.length) raw.push({ id: `missing-data:${plan.id}`, kind: "MISSING_DATA", severity: "atencao", title: "Informação necessária para o plano", detail: plan.missingData.join(" "), reason: "Preencher estes dados reduz ambiguidade e risco antes da execução.", projectId: plan.projectId, planId: plan.id, score: 72 });
    }
    for (const task of pendingTasks) {
      if (!task.dueDate) continue;
      const days = daysUntil(task.dueDate, now);
      if (days < 0) raw.push({ id: `task-overdue:${task.id}`, kind: "TASK_OVERDUE", severity: "critico", title: task.title, detail: `${Math.abs(days)} dia(s) em atraso`, reason: `Prazo vencido e prioridade ${task.priority}; atrasos recebem precedência.`, projectId: task.projectId, taskId: task.id, score: 110 + Math.min(Math.abs(days), 20) + priorityBonus(task.priority) });
      else if (days <= 7) raw.push({ id: `task-due:${task.id}`, kind: "TASK_DUE_SOON", severity: "atencao", title: task.title, detail: days === 0 ? "Vence hoje" : `Vence em ${days} dia(s)`, reason: `Prazo próximo e prioridade ${task.priority}.`, projectId: task.projectId, taskId: task.id, score: 78 + (7 - days) * 2 + priorityBonus(task.priority) });
    }
    for (const suggestion of athenaSuggestionCenter.list(ctx, now).filter((item) => item.status === "ativa")) {
      if (raw.some((item) => item.projectId === suggestion.projectId && (item.title === suggestion.detail || item.detail.includes(suggestion.detail)))) continue;
      raw.push({ id: `finding:${suggestion.id}`, kind: "FINDING", severity: suggestion.severity, title: suggestion.label, detail: suggestion.detail, reason: suggestion.severity === "critico" ? "O diagnóstico marcou este ponto como crítico." : suggestion.severity === "atencao" ? "O diagnóstico encontrou risco de curto prazo ou inconsistência." : "Há uma oportunidade de manter o projeto em movimento.", projectId: suggestion.projectId, score: suggestion.severity === "critico" ? 100 : suggestion.severity === "atencao" ? 68 : 42 });
    }
    return raw.map((item) => { const saved = decisions[item.id]; const expired = saved?.decision === "adiada" && saved.snoozedUntil && new Date(saved.snoozedUntil).getTime() <= now.getTime(); return { ...item, decision: expired ? "ativa" as const : saved?.decision || "ativa", snoozedUntil: expired ? undefined : saved?.snoozedUntil }; }).filter((item) => includeResolved || item.decision === "ativa").sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, "pt-BR"));
  }
  setDecision(id: string, decision: AthenaActionDecision, snoozedUntil?: string): void { const decisions = read(); decisions[id] = { decision, snoozedUntil, updatedAt: new Date().toISOString() }; write(decisions); }
  postpone(id: string, hours = 24): void { this.setDecision(id, "adiada", new Date(Date.now() + hours * 3_600_000).toISOString()); }
  dismiss(id: string): void { this.setDecision(id, "dispensada"); }
  complete(id: string): void { this.setDecision(id, "concluida"); }
  delegate(task: Task, assignee: string, ctx: AthenaEngineContext): boolean { if (!assignee.trim() || !ctx.updateTask) return false; ctx.updateTask(task.id, { assignedTo: assignee.trim(), status: task.status === "a_fazer" ? "em_progresso" : task.status }, "athena"); this.complete(`task-overdue:${task.id}`); this.complete(`task-due:${task.id}`); return true; }
  clearForTests(): void { fallback = {}; if (typeof window !== "undefined" && window.localStorage) localStorage.removeItem(STORAGE_KEY); }
}
export const athenaActionCenter = new AthenaActionCenter();
