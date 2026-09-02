"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronRight, History, Pencil, Play, RotateCcw, ShieldCheck, XCircle } from "lucide-react";
import { useVarynthStore } from "@/lib/store/useVarynthStore";
import { athenaProjectPlanManager, type ProjectExecutionPlan, type ProjectPlanStep } from "@/lib/athena/planning/project-plan-manager";
import { cn } from "@/lib/utils";

interface Props { store: ReturnType<typeof useVarynthStore>; }

export function AthenaProjectPlanner({ store }: Props) {
  const [revision, setRevision] = useState(0);
  const plans = useMemo(() => athenaProjectPlanManager.list(), [revision]);
  const [selectedId, setSelectedId] = useState<string>();
  const selected = plans.find((plan) => plan.id === selectedId) || plans[0];
  const [editing, setEditing] = useState(false);
  const [objective, setObjective] = useState("");
  const [expectedResult, setExpectedResult] = useState("");
  const [steps, setSteps] = useState<ProjectPlanStep[]>([]);
  const [feedback, setFeedback] = useState<string>();

  useEffect(() => {
    const refresh = () => setRevision((value) => value + 1);
    window.addEventListener("varynth_project_plans_updated", refresh);
    return () => window.removeEventListener("varynth_project_plans_updated", refresh);
  }, []);

  const beginEdit = (plan: ProjectExecutionPlan) => { setObjective(plan.objective); setExpectedResult(plan.expectedResult); setSteps(plan.steps); setEditing(true); };
  const refresh = (message: string) => { setFeedback(message); setRevision((value) => value + 1); };

  if (!plans.length) return <div className="p-6 text-center"><ShieldCheck className="mx-auto mb-2 text-slate-600" size={22} /><p className="text-xs text-slate-400">Nenhum plano de projeto criado.</p><p className="mt-1 text-[11px] text-slate-600">Peça à Athena: “Organize o projeto [nome] para entrega em 10/09/2026”.</p></div>;

  return (
    <div className="grid min-h-[360px] md:grid-cols-[230px_1fr]">
      <aside className="border-b border-[#25253a] p-3 md:border-b-0 md:border-r">
        <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-wider text-slate-600">Planos recentes</p>
        <div className="space-y-1.5">{plans.map((plan) => <button key={plan.id} onClick={() => { setSelectedId(plan.id); setEditing(false); }} className={cn("w-full rounded-xl border p-2.5 text-left", selected?.id === plan.id ? "border-violet-500/30 bg-violet-500/10" : "border-[#25253a] bg-[#11111b] hover:bg-white/[0.03]")}><span className="block truncate text-[11px] font-bold text-slate-200">{plan.objective}</span><span className="mt-1 flex items-center justify-between text-[9px] text-slate-500"><span>{store.projects.find((project) => project.id === plan.projectId)?.title || "Projeto removido"}</span><span>{plan.status}</span></span></button>)}</div>
      </aside>
      {selected && <div className="p-4">
        {feedback && <div className="mb-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-[11px] text-emerald-300">{feedback}</div>}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">{editing ? <div className="space-y-2"><input aria-label="Objetivo do plano" value={objective} onChange={(event) => setObjective(event.target.value)} className="w-full rounded-lg border border-violet-500/30 bg-[#09090f] px-3 py-2 text-xs text-white" /><textarea aria-label="Resultado esperado" value={expectedResult} onChange={(event) => setExpectedResult(event.target.value)} rows={2} className="w-full rounded-lg border border-violet-500/30 bg-[#09090f] px-3 py-2 text-xs text-white" /></div> : <><h3 className="text-sm font-bold text-white">{selected.objective}</h3><p className="mt-1 text-[11px] text-slate-400">Resultado esperado: {selected.expectedResult}</p></>}</div>
          <span className={cn("rounded-md px-2 py-1 text-[9px] font-bold", selected.status === "CONCLUIDO" ? "bg-emerald-500/10 text-emerald-300" : selected.status === "FALHOU" ? "bg-rose-500/10 text-rose-300" : "bg-violet-500/10 text-violet-300")}>{selected.status} · revisão {selected.revision}</span>
        </div>
        {(selected.risks.length > 0 || selected.missingData.length > 0) && <div className="mt-3 grid gap-2 sm:grid-cols-2">{selected.risks.length > 0 && <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5"><strong className="text-[10px] text-amber-300">Riscos</strong>{selected.risks.map((risk) => <p key={risk} className="mt-1 text-[10px] text-slate-400">• {risk}</p>)}</div>}{selected.missingData.length > 0 && <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-2.5"><strong className="text-[10px] text-cyan-300">Dados ausentes</strong>{selected.missingData.map((item) => <p key={item} className="mt-1 text-[10px] text-slate-400">• {item}</p>)}</div>}</div>}
        <div className="mt-4 space-y-2">{(editing ? steps : selected.steps).map((step, index) => <div key={step.id} className="flex items-start gap-2 rounded-xl border border-[#25253a] bg-[#11111b] p-2.5"><div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-500/10 text-[9px] font-bold text-violet-300">{index + 1}</div><div className="min-w-0 flex-1">{editing ? <input aria-label={`Título da etapa ${index + 1}`} value={step.title} onChange={(event) => setSteps((current) => current.map((item) => item.id === step.id ? { ...item, title: event.target.value, changes: item.operation === "CREATE_TASK" ? { ...item.changes, title: event.target.value } : item.changes } : item))} className="w-full rounded-md border border-[#303048] bg-[#09090f] px-2 py-1 text-[11px] text-white" /> : <p className="text-[11px] font-bold text-slate-200">{step.title}</p>}<p className="mt-0.5 text-[10px] text-slate-500">{step.description}</p></div><span className="text-[9px] text-slate-600">{step.status}</span></div>)}</div>
        <div className="mt-4 flex flex-wrap gap-2">
          {selected.status === "RASCUNHO" && !editing && <><button onClick={() => beginEdit(selected)} className="flex items-center gap-1 rounded-lg border border-[#303048] px-2.5 py-1.5 text-[10px] text-slate-300"><Pencil size={11} /> Editar</button><button onClick={() => { athenaProjectPlanManager.approve(selected.id); refresh("Plano aprovado. A execução ainda aguarda seu comando."); }} className="flex items-center gap-1 rounded-lg bg-violet-600 px-2.5 py-1.5 text-[10px] font-bold text-white"><CheckCircle2 size={11} /> Aprovar</button><button onClick={() => { athenaProjectPlanManager.reject(selected.id); refresh("Plano rejeitado sem alterar o projeto."); }} className="flex items-center gap-1 rounded-lg border border-rose-500/30 px-2.5 py-1.5 text-[10px] text-rose-300"><XCircle size={11} /> Rejeitar</button></>}
          {editing && <><button onClick={() => { const revised = athenaProjectPlanManager.revise(selected.id, { objective, expectedResult, steps }); if (revised) { setEditing(false); refresh("Nova revisão salva; aprovação anterior invalidada."); } }} className="rounded-lg bg-violet-600 px-2.5 py-1.5 text-[10px] font-bold text-white">Salvar revisão</button><button onClick={() => setEditing(false)} className="rounded-lg border border-[#303048] px-2.5 py-1.5 text-[10px] text-slate-400">Cancelar</button></>}
          {selected.status === "APROVADO" && <button onClick={() => { const result = athenaProjectPlanManager.execute(selected.id, store); refresh(result.success ? "Plano executado por completo." : result.error || "Falha na execução."); }} className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[10px] font-bold text-white"><Play size={11} /> Executar plano</button>}
          {selected.status === "CONCLUIDO" && <button onClick={() => { const result = athenaProjectPlanManager.undo(selected.id, store); refresh(result.success ? "Plano inteiro desfeito." : result.error || "Não foi possível desfazer."); }} className="flex items-center gap-1 rounded-lg border border-amber-500/30 px-2.5 py-1.5 text-[10px] text-amber-300"><RotateCcw size={11} /> Desfazer plano inteiro</button>}
        </div>
        <details className="mt-4 rounded-xl border border-[#25253a] bg-[#0a0a0f] p-2.5"><summary className="flex cursor-pointer items-center gap-1.5 text-[10px] font-bold text-slate-400"><History size={11} /> Histórico e auditoria</summary><div className="mt-2 space-y-1.5">{selected.events.slice().reverse().map((item) => <div key={item.id} className="flex gap-2 text-[9px] text-slate-500"><ChevronRight size={10} className="shrink-0" /><span>{new Date(item.timestamp).toLocaleString("pt-BR")}: {item.message}</span></div>)}</div></details>
      </div>}
    </div>
  );
}
