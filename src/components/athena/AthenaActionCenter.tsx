"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarClock, CheckCircle2, CirclePlay, Clock3, Info, ListChecks, UserRoundCheck, X } from "lucide-react";
import { useVarynthStore } from "@/lib/store/useVarynthStore";
import { athenaActionCenter, type AthenaActionItem } from "@/lib/athena/insights/action-center";
import { athenaProjectPlanManager } from "@/lib/athena/planning/project-plan-manager";
import { athenaSuggestionCenter } from "@/lib/athena/insights/suggestion-center";
import { cn } from "@/lib/utils";
import { googleCalendarSync } from "@/lib/athena/integrations/google-calendar-sync";

interface Props { store: ReturnType<typeof useVarynthStore>; onPrompt: (prompt: string) => void; }

export function AthenaActionCenter({ store, onPrompt }: Props) {
  const [revision, setRevision] = useState(0);
  const [feedback, setFeedback] = useState<string>();
  const [assigneeFor, setAssigneeFor] = useState<string>();
  const [assignee, setAssignee] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const allItems = useMemo(() => athenaActionCenter.list(store, new Date(), true), [store, store.projects, store.tasks, revision]);
  const items = allItems.filter((item) => item.decision === "ativa");
  const displayedItems = showHistory ? allItems.filter((item) => item.decision !== "ativa") : items;
  const critical = items.filter((item) => item.severity === "critico").length;
  const attention = items.filter((item) => item.severity === "atencao").length;

  useEffect(() => {
    const refresh = () => setRevision((value) => value + 1);
    window.addEventListener("varynth_athena_actions_updated", refresh);
    window.addEventListener("varynth_project_plans_updated", refresh);
    return () => { window.removeEventListener("varynth_athena_actions_updated", refresh); window.removeEventListener("varynth_project_plans_updated", refresh); };
  }, []);

  const refresh = (message: string) => { setFeedback(message); setRevision((value) => value + 1); };
  const projectName = (id?: string) => id ? store.projects.find((project) => project.id === id)?.title || "Projeto removido" : "Geral";
  const createTask = (item: AthenaActionItem) => {
    const title = item.title === "Projeto sem próxima ação" ? `Definir próxima ação — ${item.detail}` : `Resolver alerta — ${item.detail}`;
    const duplicate = store.tasks.some((task) => task.projectId === item.projectId && task.title === title && task.status !== "concluida");
    if (!duplicate) store.addTask({ title, projectId: item.projectId, priority: item.severity === "critico" ? "urgente" : "alta", status: "a_fazer", tags: ["athena", "central-de-pendencias"] }, "athena");
    if (item.id.startsWith("finding:")) athenaSuggestionCenter.setStatus(item.id.slice(8), "aceita");
    athenaActionCenter.complete(item.id); refresh(duplicate ? "A tarefa já existia; o alerta foi encerrado." : "Alerta transformado em tarefa.");
  };
  const approvePlan = (item: AthenaActionItem) => { if (item.planId && athenaProjectPlanManager.approve(item.planId)) { athenaActionCenter.complete(item.id); refresh("Plano aprovado. A execução continua aguardando seu comando."); } };
  const executePlan = (item: AthenaActionItem) => { if (!item.planId) return; const result = athenaProjectPlanManager.execute(item.planId, store); if (result.success) { athenaActionCenter.complete(item.id); refresh("Plano executado por completo."); } else refresh(result.error || "Não foi possível executar o plano."); };
  const startTask = (item: AthenaActionItem) => { if (!item.taskId) return; store.updateTask(item.taskId, { status: "em_progresso" }, "athena"); athenaActionCenter.complete(item.id); refresh("Tarefa iniciada e removida desta fila de decisão."); };
  const delegateTask = (item: AthenaActionItem) => { const task = store.tasks.find((entry) => entry.id === item.taskId); if (task && athenaActionCenter.delegate(task, assignee, store)) { setAssigneeFor(undefined); setAssignee(""); refresh(`Tarefa delegada para ${assignee.trim()}.`); } };

  return <div className="p-4">
    <div className="mb-4 grid gap-2 sm:grid-cols-3">
      <div className="rounded-xl border border-[#292940] bg-[#11111b] p-3"><p className="text-[10px] uppercase tracking-wider text-slate-500">Exigem decisão</p><strong className="mt-1 block text-xl text-white">{items.length}</strong></div>
      <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3"><p className="text-[10px] uppercase tracking-wider text-rose-400/70">Críticos</p><strong className="mt-1 block text-xl text-rose-300">{critical}</strong></div>
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3"><p className="text-[10px] uppercase tracking-wider text-amber-400/70">Atenção</p><strong className="mt-1 block text-xl text-amber-300">{attention}</strong></div>
    </div>
    {feedback && <div className="mb-3 flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-[11px] text-emerald-300"><span>{feedback}</span><button onClick={() => setFeedback(undefined)} aria-label="Fechar aviso"><X size={13} /></button></div>}
    <div className="mb-3 flex items-center justify-between gap-3"><div><h3 className="flex items-center gap-2 text-xs font-bold text-slate-200"><ListChecks size={14} className="text-violet-400" /> {showHistory ? "Histórico de decisões" : "Ordem recomendada para hoje"}</h3><p className="mt-1 text-[10px] text-slate-600">{showHistory ? "Itens adiados, dispensados ou concluídos permanecem auditáveis." : "Urgência, prazo e impacto determinam a posição. A Athena não executa planos sem autorização."}</p></div><button onClick={() => setShowHistory((value) => !value)} className="shrink-0 rounded-lg border border-[#303048] px-2.5 py-1.5 text-[10px] text-slate-400">{showHistory ? "Ver pendências" : "Decisões anteriores"}</button></div>
    <div className="space-y-2">
      {displayedItems.slice(0, 12).map((item, index) => <article key={item.id} className={cn("rounded-xl border p-3", item.severity === "critico" ? "border-rose-500/20 bg-rose-500/[0.04]" : item.severity === "atencao" ? "border-amber-500/15 bg-amber-500/[0.03]" : "border-cyan-500/15 bg-cyan-500/[0.03]")}>
        <div className="flex items-start gap-3"><div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/5 text-[10px] font-bold text-slate-400">{index + 1}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h4 className="text-xs font-bold text-slate-100">{item.title}</h4><span className={cn("rounded px-1.5 py-0.5 text-[9px] font-bold uppercase", item.severity === "critico" ? "bg-rose-500/10 text-rose-300" : item.severity === "atencao" ? "bg-amber-500/10 text-amber-300" : "bg-cyan-500/10 text-cyan-300")}>{item.severity}</span></div><p className="mt-1 text-[11px] text-slate-400">{item.detail}</p><p className="mt-1 text-[9px] text-slate-600">{projectName(item.projectId)}</p><div className="mt-2 flex items-start gap-1.5 text-[10px] text-slate-500"><Info size={11} className="mt-0.5 shrink-0" /><span><strong className="text-slate-400">Por que agora:</strong> {item.reason}</span></div></div>{item.severity === "critico" ? <AlertTriangle size={16} className="shrink-0 text-rose-400" /> : <CalendarClock size={16} className="shrink-0 text-amber-400" />}</div>
        {!showHistory && <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {item.kind === "PLAN_APPROVAL" && <button onClick={() => approvePlan(item)} className="flex items-center gap-1 rounded-lg bg-violet-600 px-2.5 py-1.5 text-[10px] font-bold text-white"><CheckCircle2 size={11} /> Aprovar plano</button>}
          {item.kind === "PLAN_EXECUTION" && <button onClick={() => executePlan(item)} className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[10px] font-bold text-white"><CirclePlay size={11} /> Executar plano</button>}
          {(item.kind === "TASK_OVERDUE" || item.kind === "TASK_DUE_SOON") && <><button onClick={() => startTask(item)} className="rounded-lg bg-violet-600/20 px-2.5 py-1.5 text-[10px] font-bold text-violet-300">Iniciar tarefa</button><button onClick={() => { setAssigneeFor(item.id); setAssignee(""); }} className="flex items-center gap-1 rounded-lg border border-[#303048] px-2.5 py-1.5 text-[10px] text-slate-300"><UserRoundCheck size={11} /> Delegar</button></>}
          {item.kind === "FINDING" && <button onClick={() => createTask(item)} className="rounded-lg bg-violet-600/20 px-2.5 py-1.5 text-[10px] font-bold text-violet-300">Criar tarefa</button>}
          {item.kind === "MISSING_DATA" && <button onClick={() => onPrompt(`Ajude-me a completar os dados ausentes do plano: ${item.detail}`)} className="rounded-lg bg-cyan-600/20 px-2.5 py-1.5 text-[10px] font-bold text-cyan-300">Completar com Athena</button>}
          {item.kind === "CALENDAR_EVENT" && <button onClick={() => { const fingerprint = item.id.slice(9); const event = googleCalendarSync.inbox().find((entry) => entry.fingerprint === fingerprint); if (!event) return; const result = googleCalendarSync.importToChronos(event.id, event.suggestedProjectId, store.chronosEvents, store.addChronosEvent); if (result.success) { athenaActionCenter.complete(item.id); refresh("Evento externo importado para o Chronos."); } else refresh(result.error || "Não foi possível importar o evento."); }} className="rounded-lg bg-violet-600/20 px-2.5 py-1.5 text-[10px] font-bold text-violet-300">Importar para Chronos</button>}
          <button onClick={() => { athenaActionCenter.postpone(item.id); refresh("Item adiado por 24 horas."); }} className="flex items-center gap-1 rounded-lg border border-[#303048] px-2 py-1.5 text-[10px] text-slate-400"><Clock3 size={10} /> Adiar 24h</button>
          <button onClick={() => { athenaActionCenter.dismiss(item.id); refresh("Item dispensado e registrado no histórico de decisões."); }} className="rounded-lg px-2 py-1.5 text-[10px] text-slate-600 hover:text-slate-300">Dispensar</button>
        </div>}
        {showHistory && <div className="mt-3 text-[9px] font-bold uppercase tracking-wider text-slate-600">Decisão: {item.decision}{item.snoozedUntil ? ` até ${new Date(item.snoozedUntil).toLocaleString("pt-BR")}` : ""}</div>}
        {!showHistory && assigneeFor === item.id && <div className="mt-2 flex gap-2"><input autoFocus aria-label="Responsável pela tarefa" value={assignee} onChange={(event) => setAssignee(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") delegateTask(item); }} placeholder="Nome do responsável" className="min-w-0 flex-1 rounded-lg border border-violet-500/30 bg-[#09090f] px-2.5 py-1.5 text-[11px] text-white outline-none" /><button disabled={!assignee.trim()} onClick={() => delegateTask(item)} className="rounded-lg bg-violet-600 px-2.5 py-1.5 text-[10px] font-bold text-white disabled:opacity-40">Confirmar</button><button onClick={() => setAssigneeFor(undefined)} className="rounded-lg border border-[#303048] px-2 py-1.5 text-[10px] text-slate-500">Cancelar</button></div>}
      </article>)}
      {!displayedItems.length && <div className="rounded-xl border border-dashed border-[#2a2a40] py-10 text-center"><CheckCircle2 size={23} className="mx-auto mb-2 text-emerald-500" /><p className="text-xs font-bold text-slate-300">{showHistory ? "Nenhuma decisão anterior registrada." : "Tudo em ordem por enquanto."}</p><p className="mt-1 text-[10px] text-slate-600">{showHistory ? "As decisões tomadas nesta central aparecerão aqui." : "Nenhuma pendência exige sua decisão agora."}</p></div>}
    </div>
  </div>;
}
