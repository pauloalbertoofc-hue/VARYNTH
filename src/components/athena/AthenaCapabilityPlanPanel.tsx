"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  ChevronDown,
  CircleDashed,
  Clock3,
  History,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Workflow,
} from "lucide-react";
import type { CapabilityExecutionPlan, CapabilityPlanStatus } from "@/lib/athena/domain/capability-plan";
import { athenaContextBuilder } from "@/lib/athena/memory/context-builder";
import { capabilityPlanBuilder } from "@/lib/athena/runtime/capability-plan-builder";
import { capabilityPlanRuntime } from "@/lib/athena/runtime/capability-plan-runtime";
import { capabilityPlanStore } from "@/lib/athena/runtime/capability-plan-store";
import type { AthenaScope } from "@/lib/types";
import { useVarynthStore } from "@/lib/store/useVarynthStore";
import { cn } from "@/lib/utils";

interface Props {
  store: ReturnType<typeof useVarynthStore>;
  compact?: boolean;
  planId?: string;
}

const STATUS_STYLE: Record<CapabilityPlanStatus, string> = {
  UNDERSTOOD: "border-slate-500/30 bg-slate-500/10 text-slate-300",
  PLANNED: "border-cyan-500/30 bg-cyan-500/10 text-cyan-300",
  APPROVED: "border-violet-500/30 bg-violet-500/10 text-violet-300",
  EXECUTING: "border-blue-500/30 bg-blue-500/10 text-blue-300",
  PAUSED: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  INTERRUPTED: "border-orange-500/30 bg-orange-500/10 text-orange-300",
  PARTIAL: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  COMPLETED: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  BLOCKED: "border-rose-500/30 bg-rose-500/10 text-rose-300",
  FAILED: "border-rose-500/30 bg-rose-500/10 text-rose-300",
  CANCELLED: "border-slate-500/30 bg-slate-500/10 text-slate-400",
  REVERTED: "border-cyan-500/30 bg-cyan-500/10 text-cyan-300",
};

function statusLabel(status: CapabilityPlanStatus): string {
  const labels: Record<CapabilityPlanStatus, string> = {
    UNDERSTOOD: "Compreendido", PLANNED: "Proposto", APPROVED: "Aprovado",
    EXECUTING: "Executando", PAUSED: "Pausado", INTERRUPTED: "Interrompido",
    PARTIAL: "Parcial", COMPLETED: "Concluído", BLOCKED: "Bloqueado",
    FAILED: "Falhou", CANCELLED: "Cancelado", REVERTED: "Revertido",
  };
  return labels[status];
}

function progressOf(plan: CapabilityExecutionPlan): number {
  if (plan.steps.length === 0) return 100;
  return Math.round((plan.steps.filter((step) => step.status === "COMPLETED").length / plan.steps.length) * 100);
}

export function AthenaCapabilityPlanPanel({ store, compact = false, planId }: Props) {
  const [revision, setRevision] = useState(0);
  const [selectedId, setSelectedId] = useState<string>();
  const [feedback, setFeedback] = useState<string>();
  const [busy, setBusy] = useState(false);
  const plans = useMemo(() => capabilityPlanStore.list().filter((plan) => !planId || plan.id === planId), [revision, planId]);
  const selected = plans.find((plan) => plan.id === selectedId) || plans[0];

  useEffect(() => {
    const refresh = () => setRevision((value) => value + 1);
    window.addEventListener("varynth_capability_plans_updated", refresh);
    return () => window.removeEventListener("varynth_capability_plans_updated", refresh);
  }, []);

  const refresh = (message?: string) => {
    setFeedback(message);
    setRevision((value) => value + 1);
  };

  const execute = async (plan: CapabilityExecutionPlan) => {
    setBusy(true);
    setFeedback(undefined);
    try {
      const current = capabilityPlanStore.get(plan.id) || plan;
      const context = athenaContextBuilder.buildContext(
        current.sourceTask,
        current.sourceTask.scope as AthenaScope,
        store,
        current.sourceTask.targetProjectId
      );
      const result = await capabilityPlanRuntime.execute(current.id, context, store);
      refresh(result.summary.message);
    } catch (error) {
      refresh(error instanceof Error ? error.message : "Não foi possível executar o plano.");
    } finally {
      setBusy(false);
    }
  };

  const resumeAndExecute = async (plan: CapabilityExecutionPlan) => {
    try {
      capabilityPlanRuntime.resume(plan.id);
      await execute(capabilityPlanStore.get(plan.id) || plan);
    } catch (error) {
      refresh(error instanceof Error ? error.message : "O plano não pôde ser reconciliado.");
    }
  };

  const revert = async (plan: CapabilityExecutionPlan) => {
    setBusy(true);
    try {
      await capabilityPlanRuntime.revertWithRegisteredUndo(plan.id, store);
      refresh("Alterações reversíveis restauradas em ordem inversa.");
    } catch (error) {
      refresh(error instanceof Error ? error.message : "A reversão segura não pôde ser concluída.");
    } finally {
      setBusy(false);
    }
  };

  if (compact) {
    if (!plans.length) return null;
    const active = plans.filter((plan) => !["COMPLETED", "CANCELLED", "REVERTED"].includes(plan.status));
    return (
      <details className="border-b border-[#1e1e30] bg-[#0a0a0f]/80 px-3 py-2">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-[10px] font-bold text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">
          <span className="flex items-center gap-1.5"><Workflow size={12} className="text-violet-400" /> Planos locais</span>
          <span className="flex items-center gap-1 text-slate-500">{active.length} ativo(s) <ChevronDown size={11} /></span>
        </summary>
        <div className="mt-2 space-y-1.5">
          {plans.slice(0, 3).map((plan) => (
            <div key={plan.id} className="rounded-lg border border-[#25253a] bg-[#11111b] p-2">
              <div className="flex items-center justify-between gap-2"><span className="truncate text-[10px] text-slate-300">{plan.objective}</span><span className="shrink-0 text-[9px] text-slate-500">{progressOf(plan)}%</span></div>
              <div className="mt-1 h-1 overflow-hidden rounded bg-slate-800"><div className="h-full bg-violet-500" style={{ width: `${progressOf(plan)}%` }} /></div>
            </div>
          ))}
        </div>
      </details>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-[#1e1e30] bg-[#0f0f1a]" aria-labelledby="capability-plans-title">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#25253a] bg-[#0a0a0f] px-4 py-3">
        <div>
          <h2 id="capability-plans-title" className="flex items-center gap-2 text-sm font-bold text-white"><Workflow size={15} className="text-violet-400" /> Planos de execução</h2>
          <p className="mt-0.5 text-[10px] text-slate-500">Inspeção, checkpoints e controles locais — sem comunicação externa.</p>
        </div>
        <span className="rounded-full border border-[#303048] px-2.5 py-1 text-[10px] text-slate-400">{plans.length} persistido(s)</span>
      </header>

      {!plans.length ? (
        <div className="p-8 text-center"><CircleDashed className="mx-auto text-slate-700" size={24} /><p className="mt-2 text-xs text-slate-400">Nenhum plano composto criado.</p><p className="mt-1 text-[10px] text-slate-600">Pedidos operacionais aparecerão aqui quando forem planejados.</p></div>
      ) : (
        <div className="grid min-h-[440px] lg:grid-cols-[240px_1fr]">
          <aside className="border-b border-[#25253a] p-3 lg:border-b-0 lg:border-r" aria-label="Planos persistidos">
            <div className="flex gap-2 overflow-x-auto lg:block lg:space-y-2">
              {plans.map((plan) => (
                <button key={plan.id} onClick={() => { setSelectedId(plan.id); setFeedback(undefined); }} className={cn("min-w-[210px] rounded-xl border p-3 text-left transition-colors lg:min-w-0 lg:w-full", selected?.id === plan.id ? "border-violet-500/40 bg-violet-500/10" : "border-[#25253a] bg-[#11111b] hover:bg-white/[0.03]")} aria-pressed={selected?.id === plan.id}>
                  <span className="block truncate text-[11px] font-bold text-slate-200">{plan.objective}</span>
                  <span className="mt-2 flex items-center justify-between gap-2 text-[9px]"><span className={cn("rounded border px-1.5 py-0.5", STATUS_STYLE[plan.status])}>{statusLabel(plan.status)}</span><span className="text-slate-500">{progressOf(plan)}%</span></span>
                </button>
              ))}
            </div>
          </aside>

          {selected && (
            <div className="min-w-0 p-3 sm:p-5">
              {feedback && <div role="status" className="mb-3 rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-[11px] text-cyan-200">{feedback}</div>}
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1"><h3 className="text-sm font-bold text-white">{selected.objective}</h3><p className="mt-1 break-all font-mono text-[9px] text-slate-600">{selected.planHash} · revisão {selected.revision}</p></div>
                <span className={cn("rounded-lg border px-2 py-1 text-[10px] font-bold", STATUS_STYLE[selected.status])}>{statusLabel(selected.status)}</span>
              </div>

              <div className="mt-4" aria-label={`Progresso ${progressOf(selected)}%`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressOf(selected)}>
                <div className="flex justify-between text-[10px] text-slate-500"><span>{selected.steps.filter((step) => step.status === "COMPLETED").length} de {selected.steps.length} etapas</span><span>{progressOf(selected)}%</span></div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-violet-600 to-cyan-500 transition-all" style={{ width: `${progressOf(selected)}%` }} /></div>
              </div>

              <div className="mt-4 space-y-2" aria-label="Grafo de dependências do plano">
                {selected.steps.map((step, index) => (
                  <div key={step.id} className={cn("relative rounded-xl border p-3", step.status === "FAILED" || step.status === "BLOCKED" ? "border-rose-500/30 bg-rose-500/5" : "border-[#25253a] bg-[#11111b]")}>
                    <div className="flex items-start gap-3">
                      <div className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[9px] font-bold", step.status === "COMPLETED" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-violet-500/30 bg-violet-500/10 text-violet-300")}>{step.status === "COMPLETED" ? <CheckCircle2 size={12} /> : index + 1}</div>
                      <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-[11px] font-bold text-slate-200">{step.name}</p><span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[8px] text-slate-400">{step.capabilityId}</span></div><p className="mt-1 text-[9px] text-slate-500">{step.capabilityKind} · {step.authority} · risco {step.risk}{step.requiresConfirmation ? step.confirmation ? " · confirmado para esta revisão" : " · confirmação necessária" : ""}{step.supportsUndo ? " · undo disponível" : ""}</p>{step.dependsOn.length > 0 && <p className="mt-1 text-[9px] text-cyan-500/80">Depende de: {step.dependsOn.join(", ")}</p>}{step.error && <p className="mt-1 text-[10px] text-rose-300">{step.error}</p>}</div>
                      <span className="text-[8px] font-bold text-slate-600">{step.status}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap gap-2" aria-label="Controles do plano">
                {selected.status === "PLANNED" && <button onClick={() => { capabilityPlanRuntime.register(capabilityPlanBuilder.approve(selected, "HUMAN")); refresh("Plano aprovado e vinculado ao hash atual."); }} className="min-h-11 rounded-lg bg-violet-600 px-3 text-[11px] font-bold text-white hover:bg-violet-500"><ShieldCheck size={13} className="mr-1 inline" /> Aprovar</button>}
                {selected.status === "APPROVED" && selected.steps.filter((step) => step.requiresConfirmation && !step.confirmation).map((step) => <button key={`confirm-${step.id}`} onClick={() => { capabilityPlanRuntime.confirmStep(selected.id, step.id); refresh(`${step.name}: confirmação registrada para a revisão atual.`); }} className="min-h-11 rounded-lg bg-amber-600 px-3 text-[11px] font-bold text-white hover:bg-amber-500"><ShieldCheck size={13} className="mr-1 inline" /> Confirmar {step.name}</button>)}
                {selected.status === "APPROVED" && <button disabled={busy || selected.steps.some((step) => step.requiresConfirmation && !step.confirmation)} onClick={() => execute(selected)} className="min-h-11 rounded-lg bg-emerald-600 px-3 text-[11px] font-bold text-white hover:bg-emerald-500 disabled:opacity-50" title={selected.steps.some((step) => step.requiresConfirmation && !step.confirmation) ? "Confirme as mutações sensíveis antes de executar" : undefined}><Play size={13} className="mr-1 inline" /> Executar</button>}
                {selected.status === "EXECUTING" && <button onClick={() => { capabilityPlanRuntime.pause(selected.id); refresh("Pausa solicitada."); }} className="min-h-11 rounded-lg border border-amber-500/30 px-3 text-[11px] text-amber-300"><Pause size={13} className="mr-1 inline" /> Pausar</button>}
                {["PAUSED", "INTERRUPTED", "PARTIAL", "FAILED", "BLOCKED"].includes(selected.status) && <button disabled={busy} onClick={() => resumeAndExecute(selected)} className="min-h-11 rounded-lg bg-cyan-600 px-3 text-[11px] font-bold text-white disabled:opacity-50"><RefreshCw size={13} className="mr-1 inline" /> Reconciliar e retomar</button>}
                {["PLANNED", "APPROVED", "EXECUTING", "PAUSED", "INTERRUPTED", "PARTIAL", "BLOCKED", "FAILED"].includes(selected.status) && <button onClick={() => { capabilityPlanRuntime.cancel(selected.id); refresh("Plano cancelado; resultados concluídos foram preservados."); }} className="min-h-11 rounded-lg border border-rose-500/30 px-3 text-[11px] text-rose-300"><Ban size={13} className="mr-1 inline" /> Cancelar</button>}
                {selected.steps.filter((step) => ["FAILED", "BLOCKED", "SKIPPED"].includes(step.status)).map((step) => <button key={step.id} onClick={() => { capabilityPlanRuntime.retryStep(selected.id, step.id); refresh(`Etapa ${step.name} preparada para nova tentativa.`); }} className="min-h-11 rounded-lg border border-violet-500/30 px-3 text-[11px] text-violet-300"><RotateCcw size={13} className="mr-1 inline" /> Repetir {step.name}</button>)}
              </div>

              {selected.steps.some((step) => step.status === "COMPLETED" && step.authority === "MUTATE_GOVERNED") && <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5 text-[10px] text-amber-200"><AlertTriangle size={13} className="mt-0.5 shrink-0" /><span>{selected.steps.filter((step) => step.status === "COMPLETED" && step.authority === "MUTATE_GOVERNED").every((step) => step.supportsUndo && step.mutationRecord) ? "As alterações concluídas possuem registro anterior/posterior e operação concreta de restauração." : "Há mutações concluídas sem contrato concreto de undo; reversão automática está indisponível."}</span></div>}
              {selected.steps.some((step) => step.status === "COMPLETED" && step.authority === "MUTATE_GOVERNED") && (selected.steps.filter((step) => step.status === "COMPLETED" && step.authority === "MUTATE_GOVERNED").every((step) => step.supportsUndo && step.mutationRecord) ? <button disabled={busy} onClick={() => revert(selected)} className="mt-2 min-h-11 rounded-lg border border-cyan-500/30 px-3 text-[11px] text-cyan-300 disabled:opacity-50"><RotateCcw size={13} className="mr-1 inline" /> Reverter alterações</button> : <button disabled aria-disabled="true" title="Requer executor de undo concreto" className="mt-2 min-h-11 cursor-not-allowed rounded-lg border border-slate-700 px-3 text-[11px] text-slate-600"><RotateCcw size={13} className="mr-1 inline" /> Reverter indisponível com segurança</button>)}

              <details className="mt-4 rounded-xl border border-[#25253a] bg-[#0a0a0f] p-3"><summary className="flex cursor-pointer items-center gap-2 text-[10px] font-bold text-slate-400"><History size={12} /> Journal, checkpoints e métricas</summary><div className="mt-3 grid gap-3 sm:grid-cols-2"><div className="space-y-1.5">{selected.events.slice().reverse().map((event) => <div key={event.id} className="flex gap-2 text-[9px] text-slate-500"><Clock3 size={10} className="mt-0.5 shrink-0" /><span>{new Date(event.timestamp).toLocaleString("pt-BR")}: {event.message}</span></div>)}</div><div className="rounded-lg bg-[#11111b] p-2.5 text-[9px] text-slate-500"><p>Capacidades: {selected.metrics.selectedCapabilityIds.join(", ")}</p><p className="mt-1">Confirmações: {selected.metrics.confirmationCount}</p><p>Falhas: {selected.metrics.failureCount} · bloqueios: {selected.metrics.blockedCount}</p><p>Retries: {selected.metrics.retryCount} · reversões: {selected.metrics.reversalCount}</p><p>Duração: {selected.metrics.durationMs ?? 0} ms</p><p className="mt-1">Checkpoint: {selected.checkpoint?.completedStepIds.join(", ") || "ainda não criado"}</p></div></div></details>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
