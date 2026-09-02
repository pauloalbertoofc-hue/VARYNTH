import type { AthenaEngineContext } from "../engine";
import type { AthenaMessage, AthenaScope, Project, Task } from "@/lib/types";
import { googleCalendarSync } from "../integrations/google-calendar-sync";

export interface AthenaFinding {
  severity: "critico" | "atencao" | "oportunidade";
  label: string;
  detail: string;
  projectId?: string;
}

export interface AthenaStateAnalysis {
  overdueTasks: Task[];
  dueSoonTasks: Task[];
  overdueProjects: Project[];
  stalledProjects: Project[];
  inconsistentProjects: Project[];
  orphanTasks: Task[];
  findings: AthenaFinding[];
}

const ACTIVE_PROJECT_STATUSES = new Set(["planejamento", "ativo", "em_espera"]);

function normalize(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function startOfLocalDay(date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function parseLocalDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return undefined;
  const parsed = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function daysFromToday(value: string, now = new Date()): number | undefined {
  const date = parseLocalDate(value);
  if (!date) return undefined;
  return Math.round((date.getTime() - startOfLocalDay(now).getTime()) / 86_400_000);
}

export function analyzeAthenaState(ctx: AthenaEngineContext, targetProjectId?: string, now = new Date()): AthenaStateAnalysis {
  const projects = targetProjectId ? ctx.projects.filter((p) => p.id === targetProjectId) : ctx.projects;
  const projectIds = new Set(ctx.projects.map((p) => p.id));
  const tasks = targetProjectId ? ctx.tasks.filter((t) => t.projectId === targetProjectId) : ctx.tasks;
  const pending = tasks.filter((t) => t.status !== "concluida");
  const overdueTasks = pending.filter((t) => t.dueDate && (daysFromToday(t.dueDate, now) ?? 0) < 0);
  const dueSoonTasks = pending.filter((t) => {
    const days = t.dueDate ? daysFromToday(t.dueDate, now) : undefined;
    return days !== undefined && days >= 0 && days <= 7;
  });
  const overdueProjects = projects.filter((p) => {
    const days = p.deadline ? daysFromToday(p.deadline, now) : undefined;
    return ACTIVE_PROJECT_STATUSES.has(p.status) && days !== undefined && days < 0;
  });
  const stalledProjects = projects.filter((p) => ACTIVE_PROJECT_STATUSES.has(p.status) && !ctx.tasks.some((t) => t.projectId === p.id && t.status !== "concluida"));
  const inconsistentProjects = projects.filter((p) => p.status === "concluido" && ctx.tasks.some((t) => t.projectId === p.id && t.status !== "concluida"));
  const orphanTasks = targetProjectId ? [] : ctx.tasks.filter((t) => t.projectId && !projectIds.has(t.projectId));
  const findings: AthenaFinding[] = [
    ...overdueTasks.map((task) => ({ severity: "critico" as const, label: "Tarefa atrasada", detail: task.title, projectId: task.projectId })),
    ...overdueProjects.map((project) => ({ severity: "critico" as const, label: "Projeto com prazo vencido", detail: project.title, projectId: project.id })),
    ...dueSoonTasks.map((task) => ({ severity: "atencao" as const, label: "Prazo nos próximos 7 dias", detail: task.title, projectId: task.projectId })),
    ...inconsistentProjects.map((project) => ({ severity: "atencao" as const, label: "Projeto concluído com pendências", detail: project.title, projectId: project.id })),
    ...orphanTasks.map((task) => ({ severity: "atencao" as const, label: "Tarefa ligada a projeto inexistente", detail: task.title })),
    ...stalledProjects.map((project) => ({ severity: "oportunidade" as const, label: "Projeto sem próxima ação", detail: project.title, projectId: project.id })),
  ];
  return { overdueTasks, dueSoonTasks, overdueProjects, stalledProjects, inconsistentProjects, orphanTasks, findings };
}

function response(text: string, scope: AthenaScope): AthenaMessage {
  return { id: `ath-insight-${Date.now()}`, sender: "athena", text, timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), scope, metadata: { engine: "deterministic-global-intelligence" } };
}

function projectLabel(ctx: AthenaEngineContext, projectId?: string): string {
  if (!projectId) return "Geral";
  return ctx.projects.find((p) => p.id === projectId)?.title || "Projeto não encontrado";
}

function extractSearchTerm(prompt: string): string {
  return prompt.replace(/^(athena[, :]*)?/i, "").replace(/^(busque|buscar|procure|procurar|encontre|encontrar|pesquise(?: por)?|onde (?:esta|está|fica))\s*/i, "").replace(/^(por|o|a|os|as)\s+/i, "").replace(/[?.!]+$/, "").trim();
}

function globalSearch(prompt: string, ctx: AthenaEngineContext, scope: AthenaScope, targetProjectId?: string): AthenaMessage {
  const term = extractSearchTerm(prompt);
  if (term.length < 2) return response("Diga o termo que devo procurar em projetos, tarefas, notas, acervo e oportunidades.", scope);
  const needle = normalize(term);
  const allowedProject = (projectId?: string) => !targetProjectId || projectId === targetProjectId;
  const includes = (...values: Array<string | string[] | undefined>) => normalize(values.flat().filter(Boolean).join(" ")).includes(needle);
  const results: Array<{ type: string; title: string; context: string; rank: number }> = [];
  ctx.projects.filter((p) => allowedProject(p.id) && includes(p.title, p.description, p.tags)).forEach((p) => results.push({ type: "Projeto", title: p.title, context: `${p.status.replaceAll("_", " ")} · prioridade ${p.priority}`, rank: normalize(p.title).includes(needle) ? 0 : 2 }));
  ctx.tasks.filter((t) => allowedProject(t.projectId) && includes(t.title, t.description, t.tags)).forEach((t) => results.push({ type: "Tarefa", title: t.title, context: `${projectLabel(ctx, t.projectId)} · ${t.status.replaceAll("_", " ")}`, rank: normalize(t.title).includes(needle) ? 0 : 2 }));
  (ctx.notes || []).filter((n) => allowedProject(n.projectId) && includes(n.title, n.content, n.tags)).forEach((n) => results.push({ type: "Nota", title: n.title, context: projectLabel(ctx, n.projectId), rank: normalize(n.title).includes(needle) ? 0 : 3 }));
  ctx.vaultItems.filter((v) => (!targetProjectId || v.relatedProjectIds?.includes(targetProjectId)) && includes(v.title, v.content, v.notes, v.tags, v.author)).forEach((v) => results.push({ type: "Vault", title: v.title, context: `${v.type} · ${v.readingStatus.replaceAll("_", " ")}`, rank: normalize(v.title).includes(needle) ? 1 : 3 }));
  ctx.opportunities.filter((o) => allowedProject(o.relatedProjectId) && includes(o.title, o.institution, o.notes, o.requirements)).forEach((o) => results.push({ type: "Oportunidade", title: o.title, context: `${o.institution} · prazo ${o.deadline}`, rank: normalize(o.title).includes(needle) ? 1 : 3 }));
  results.sort((a, b) => a.rank - b.rank || a.title.localeCompare(b.title, "pt-BR"));
  if (!results.length) return response(`Não encontrei **“${term}”** ${targetProjectId ? "neste projeto" : "em projetos, tarefas, notas, Vault ou oportunidades"}. Nenhum dado foi inventado.`, scope);
  const visible = results.slice(0, 10);
  return response(`Encontrei **${results.length} ${results.length === 1 ? "resultado" : "resultados"}** para **“${term}”**:\n\n${visible.map((item, index) => `${index + 1}. **${item.type}: ${item.title}** — ${item.context}`).join("\n")}${results.length > visible.length ? `\n\nMostrei os 10 mais relevantes; há mais ${results.length - visible.length}.` : ""}`, scope);
}

function diagnosis(ctx: AthenaEngineContext, scope: AthenaScope, targetProjectId?: string): AthenaMessage {
  const analysis = analyzeAthenaState(ctx, targetProjectId);
  const target = targetProjectId ? `do projeto **${projectLabel(ctx, targetProjectId)}**` : "do ecossistema";
  if (!analysis.findings.length) return response(`Diagnóstico ${target}: **nenhum atraso ou inconsistência detectado**. Os dados atuais não exigem intervenção imediata.`, scope);
  const critical = analysis.findings.filter((f) => f.severity === "critico");
  const attention = analysis.findings.filter((f) => f.severity === "atencao");
  const opportunities = analysis.findings.filter((f) => f.severity === "oportunidade");
  const lines = analysis.findings.slice(0, 12).map((f) => `- **${f.label}:** ${f.detail}${f.projectId ? ` · ${projectLabel(ctx, f.projectId)}` : ""}`);
  return response(`Diagnóstico ${target}: **${critical.length} crítico(s)**, **${attention.length} ponto(s) de atenção** e **${opportunities.length} oportunidade(s)**.\n\n${lines.join("\n")}\n\nPosso transformar um desses pontos em tarefa ou organizar as próximas ações, sempre mostrando a proposta antes de alterações em lote.`, scope);
}

function briefing(ctx: AthenaEngineContext, scope: AthenaScope, targetProjectId?: string): AthenaMessage {
  const analysis = analyzeAthenaState(ctx, targetProjectId);
  const pending = ctx.tasks.filter((t) => t.status !== "concluida" && (!targetProjectId || t.projectId === targetProjectId));
  const priorityWeight = { urgente: 0, alta: 1, media: 2, baixa: 3 };
  const prioritized = [...pending].sort((a, b) => {
    const dateA = a.dueDate ? parseLocalDate(a.dueDate)?.getTime() ?? Infinity : Infinity;
    const dateB = b.dueDate ? parseLocalDate(b.dueDate)?.getTime() ?? Infinity : Infinity;
    return dateA - dateB || priorityWeight[a.priority] - priorityWeight[b.priority];
  }).slice(0, 5);
  const activeProjects = ctx.projects.filter((p) => ACTIVE_PROJECT_STATUSES.has(p.status) && (!targetProjectId || p.id === targetProjectId));
  const externalEvents = googleCalendarSync.inbox().filter((event) => !targetProjectId || event.suggestedProjectId === targetProjectId);
  const top = prioritized.length ? prioritized.map((t, i) => `${i + 1}. **${t.title}** — ${t.priority}${t.dueDate ? ` · ${t.dueDate}` : " · sem prazo"} · ${projectLabel(ctx, t.projectId)}`).join("\n") : "Nenhuma tarefa pendente cadastrada.";
  return response(`**Briefing de hoje${targetProjectId ? ` · ${projectLabel(ctx, targetProjectId)}` : ""}**\n\n- ${activeProjects.length} projeto(s) em acompanhamento\n- ${pending.length} tarefa(s) pendente(s)\n- ${analysis.overdueTasks.length} tarefa(s) atrasada(s)\n- ${analysis.dueSoonTasks.length} prazo(s) nos próximos 7 dias\n- ${externalEvents.length} evento(s) externo(s) na caixa do calendário\n\n**Ordem sugerida**\n${top}\n\nA ordem considera primeiro o prazo e depois a prioridade registrada.`, scope);
}

export class AthenaGlobalIntelligence {
  tryHandle(prompt: string, scope: AthenaScope, ctx: AthenaEngineContext, targetProjectId?: string): AthenaMessage | undefined {
    const clean = normalize(prompt);
    if (/^(athena[, :]*)?(busque|buscar|procure|procurar|encontre|encontrar|pesquise|onde esta|onde fica)\b/.test(clean)) return globalSearch(prompt, ctx, scope, targetProjectId);
    if (clean.includes("diagnost") || clean.includes("inconsistencia") || clean.includes("projetos parados") || clean.includes("tarefas atrasadas")) return diagnosis(ctx, scope, targetProjectId);
    if (clean.includes("briefing") || clean.includes("o que preciso cuidar hoje") || clean.includes("o que devo priorizar hoje") || clean.includes("quais tarefas devo priorizar hoje") || clean.includes("resumir pendencias e prazos")) return briefing(ctx, scope, targetProjectId);
    return undefined;
  }
}

export const athenaGlobalIntelligence = new AthenaGlobalIntelligence();
