"use client";

import { useEffect, useState } from "react";
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
import type {
  CapabilityExecutionPlan,
  CapabilityPlanStatus,
} from "@/lib/athena/domain/capability-plan";
import { athenaContextBuilder } from "@/lib/athena/memory/context-builder";
import { capabilityPlanBuilder } from "@/lib/athena/runtime/capability-plan-builder";
import { capabilityPlanRuntime } from "@/lib/athena/runtime/capability-plan-runtime";
import { capabilityPlanStore } from "@/lib/athena/runtime/capability-plan-store";
import type { AthenaScope } from "@/lib/types";
import { useVarynthStore } from "@/lib/store/useVarynthStore";
import { cn } from "@/lib/utils";
import { Surface } from "@/components/ui/Surface";

interface Props {
  store: ReturnType<typeof useVarynthStore>;
  compact?: boolean;
  planId?: string;
}

const STATUS_STYLE: Record<CapabilityPlanStatus, string> = {
  UNDERSTOOD:
    "border-[var(--vly-border-default)] bg-[var(--vly-surface-raised)] text-[var(--vly-text-secondary)]",
  PLANNED:
    "border-[var(--vly-border-info)] bg-[color-mix(in_srgb,var(--vly-info)_12%,var(--vly-surface))] text-[var(--vly-info)]",
  APPROVED:
    "border-[var(--vly-border-accent)] bg-[var(--vly-surface-active)] text-[var(--vly-accent-hover)]",
  EXECUTING:
    "border-[var(--vly-border-info)] bg-[color-mix(in_srgb,var(--vly-info)_12%,var(--vly-surface))] text-[var(--vly-info)]",
  PAUSED:
    "border-[var(--vly-border-warning)] bg-[var(--vly-surface-warning)] text-[var(--vly-warning)]",
  INTERRUPTED:
    "border-[var(--vly-border-warning)] bg-[var(--vly-surface-warning)] text-[var(--vly-warning)]",
  PARTIAL:
    "border-[var(--vly-border-warning)] bg-[var(--vly-surface-warning)] text-[var(--vly-warning)]",
  COMPLETED:
    "border-[var(--vly-border-success)] bg-[color-mix(in_srgb,var(--vly-success)_12%,var(--vly-surface))] text-[var(--vly-success)]",
  BLOCKED:
    "border-[var(--vly-border-danger)] bg-[color-mix(in_srgb,var(--vly-danger)_12%,var(--vly-surface))] text-[var(--vly-danger)]",
  FAILED:
    "border-[var(--vly-border-danger)] bg-[color-mix(in_srgb,var(--vly-danger)_12%,var(--vly-surface))] text-[var(--vly-danger)]",
  CANCELLED:
    "border-[var(--vly-border-default)] bg-[var(--vly-surface-raised)] text-[var(--vly-text-muted)]",
  REVERTED:
    "border-[var(--vly-border-info)] bg-[color-mix(in_srgb,var(--vly-info)_12%,var(--vly-surface))] text-[var(--vly-info)]",
};

function statusLabel(status: CapabilityPlanStatus): string {
  const labels: Record<CapabilityPlanStatus, string> = {
    UNDERSTOOD: "Compreendido",
    PLANNED: "Proposto",
    APPROVED: "Aprovado",
    EXECUTING: "Executando",
    PAUSED: "Pausado",
    INTERRUPTED: "Interrompido",
    PARTIAL: "Parcial",
    COMPLETED: "Concluído",
    BLOCKED: "Bloqueado",
    FAILED: "Falhou",
    CANCELLED: "Cancelado",
    REVERTED: "Revertido",
  };
  return labels[status];
}

function progressOf(plan: CapabilityExecutionPlan): number {
  if (plan.steps.length === 0) return 100;
  return Math.round(
    (plan.steps.filter((step) => step.status === "COMPLETED").length /
      plan.steps.length) *
      100,
  );
}

export function AthenaCapabilityPlanPanel({
  store,
  compact = false,
  planId,
}: Props) {
  const [revision, setRevision] = useState(0);
  const [selectedId, setSelectedId] = useState<string>();
  const [feedback, setFeedback] = useState<string>();
  const [busy, setBusy] = useState(false);
  const plans = capabilityPlanStore
    .list()
    .filter((plan) => !planId || plan.id === planId);
  const selected = plans.find((plan) => plan.id === selectedId) || plans[0];

  useEffect(() => {
    const refresh = () => setRevision((value) => value + 1);
    window.addEventListener("varynth_capability_plans_updated", refresh);
    return () =>
      window.removeEventListener("varynth_capability_plans_updated", refresh);
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
        current.sourceTask.targetProjectId,
      );
      const result = await capabilityPlanRuntime.execute(
        current.id,
        context,
        store,
      );
      refresh(result.summary.message);
    } catch (error) {
      refresh(
        error instanceof Error
          ? error.message
          : "Não foi possível executar o plano.",
      );
    } finally {
      setBusy(false);
    }
  };

  const resumeAndExecute = async (plan: CapabilityExecutionPlan) => {
    try {
      capabilityPlanRuntime.resume(plan.id);
      await execute(capabilityPlanStore.get(plan.id) || plan);
    } catch (error) {
      refresh(
        error instanceof Error
          ? error.message
          : "O plano não pôde ser reconciliado.",
      );
    }
  };

  const revert = async (plan: CapabilityExecutionPlan) => {
    setBusy(true);
    try {
      await capabilityPlanRuntime.revertWithRegisteredUndo(plan.id, store);
      refresh("Alterações reversíveis restauradas em ordem inversa.");
    } catch (error) {
      refresh(
        error instanceof Error
          ? error.message
          : "A reversão segura não pôde ser concluída.",
      );
    } finally {
      setBusy(false);
    }
  };

  if (compact) {
    if (!plans.length) return null;
    const active = plans.filter(
      (plan) => !["COMPLETED", "CANCELLED", "REVERTED"].includes(plan.status),
    );
    return (
      <details className="border-b border-[var(--vly-border-subtle)] bg-[var(--vly-world)]/80 px-3 py-2">
        <summary className="vly-interactive flex cursor-pointer list-none items-center justify-between gap-2 text-[10px] font-bold text-[var(--vly-text-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vly-accent)]">
          <span className="flex items-center gap-1.5">
            <Workflow size={12} className="text-[var(--vly-accent)]" /> Planos
            locais
          </span>
          <span className="flex items-center gap-1 text-[var(--vly-text-muted)]">
            {active.length} ativo(s) <ChevronDown size={11} />
          </span>
        </summary>
        <div className="mt-2 space-y-1.5">
          {plans.slice(0, 3).map((plan) => (
            <div
              key={plan.id}
              className="rounded-lg border border-[var(--vly-border-default)] bg-[var(--vly-surface-raised)] p-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-[10px] text-[var(--vly-text-secondary)]">
                  {plan.objective}
                </span>
                <span className="shrink-0 text-[9px] text-[var(--vly-text-muted)]">
                  {progressOf(plan)}%
                </span>
              </div>
              <div role="progressbar" aria-label={`Progresso de ${plan.objective}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressOf(plan)} className="mt-1 h-1 overflow-hidden rounded bg-[var(--vly-surface)]">
                <div
                  className="h-full bg-[var(--vly-accent)]"
                  style={{ width: `${progressOf(plan)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </details>
    );
  }

  return (
    <Surface
      tone="panel"
      role="region"
      className="overflow-hidden"
      aria-labelledby="capability-plans-title"
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--vly-border-subtle)] bg-[var(--vly-surface-raised)] px-4 py-3">
        <div>
          <h2
            id="capability-plans-title"
            className="flex items-center gap-2 text-sm font-bold text-[var(--vly-text-primary)]"
          >
            <Workflow size={15} className="text-[var(--vly-accent)]" /> Planos
            de execução
          </h2>
          <p className="mt-0.5 text-[10px] text-[var(--vly-text-muted)]">
            Inspeção, checkpoints e controles locais — sem comunicação externa.
          </p>
        </div>
        <span role="status" className="rounded-full border border-[var(--vly-border-default)] px-2.5 py-1 text-[10px] text-[var(--vly-text-muted)]">
          {plans.length} persistido(s)
        </span>
      </header>

      {!plans.length ? (
        <div className="p-8 text-center">
          <CircleDashed className="mx-auto text-slate-700" size={24} />
          <p className="mt-2 text-xs text-slate-400">
            Nenhum plano composto criado.
          </p>
          <p className="mt-1 text-[10px] text-slate-600">
            Pedidos operacionais aparecerão aqui quando forem planejados.
          </p>
        </div>
      ) : (
        <div className="grid min-h-[440px] lg:grid-cols-[240px_1fr]">
          <aside
            className="border-b border-[var(--vly-border-subtle)] p-3 lg:border-b-0 lg:border-r"
            aria-label="Planos persistidos"
          >
            <div className="flex gap-2 overflow-x-auto lg:block lg:space-y-2">
              {plans.map((plan) => (
                <button
                  key={plan.id}
                  onClick={() => {
                    setSelectedId(plan.id);
                    setFeedback(undefined);
                  }}
                  className={cn(
                    "vly-interactive min-w-[210px] rounded-xl border p-3 text-left transition-colors lg:min-w-0 lg:w-full",
                    selected?.id === plan.id
                      ? "border-[var(--vly-border-accent)] bg-[var(--vly-surface-active)]"
                      : "border-[var(--vly-border-default)] bg-[var(--vly-surface-raised)] hover:bg-[var(--vly-surface-hover)]",
                  )}
                  aria-pressed={selected?.id === plan.id}
                >
                  <span className="block truncate text-[11px] font-bold text-[var(--vly-text-secondary)]">
                    {plan.objective}
                  </span>
                  <span className="mt-2 flex items-center justify-between gap-2 text-[9px]">
                    <span
                      className={cn(
                        "rounded border px-1.5 py-0.5",
                        STATUS_STYLE[plan.status],
                      )}
                    >
                      {statusLabel(plan.status)}
                    </span>
                    <span className="text-[var(--vly-text-muted)]">
                      {progressOf(plan)}%
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </aside>

          {selected && (
            <div className="min-w-0 p-3 sm:p-5">
              {feedback && (
                <div
                  role="status"
                  className="mb-3 rounded-lg border border-[var(--vly-border-info)] bg-[color-mix(in_srgb,var(--vly-info)_12%,var(--vly-surface))] px-3 py-2 text-[11px] text-[var(--vly-info)]"
                >
                  {feedback}
                </div>
              )}
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-[var(--vly-text-primary)]">
                    {selected.objective}
                  </h3>
                  <p className="mt-1 break-all font-mono text-[9px] text-[var(--vly-text-disabled)]">
                    {selected.planHash} · revisão {selected.revision}
                  </p>
                </div>
                <span
                  className={cn(
                    "rounded-lg border px-2 py-1 text-[10px] font-bold",
                    STATUS_STYLE[selected.status],
                  )}
                >
                  {statusLabel(selected.status)}
                </span>
              </div>

              <div
                className="mt-4"
                aria-label={`Progresso ${progressOf(selected)}%`}
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progressOf(selected)}
              >
                <div className="flex justify-between text-[10px] text-[var(--vly-text-muted)]">
                  <span>
                    {
                      selected.steps.filter(
                        (step) => step.status === "COMPLETED",
                      ).length
                    }{" "}
                    de {selected.steps.length} etapas
                  </span>
                  <span>{progressOf(selected)}%</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[var(--vly-surface)]">
                  <div
                    className="h-full rounded-full bg-[var(--vly-accent)] transition-all"
                    style={{ width: `${progressOf(selected)}%` }}
                  />
                </div>
              </div>

              <div
                className="mt-4 space-y-2"
                aria-label="Grafo de dependências do plano"
              >
                {selected.steps.map((step, index) => (
                  <div
                    key={step.id}
                    className={cn(
                      "relative rounded-xl border p-3",
                      step.status === "FAILED" || step.status === "BLOCKED"
                        ? "border-[var(--vly-border-danger)] bg-[color-mix(in_srgb,var(--vly-danger)_8%,var(--vly-surface))]"
                        : "border-[var(--vly-border-default)] bg-[var(--vly-surface-raised)]",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[9px] font-bold",
                          step.status === "COMPLETED"
                            ? "border-[var(--vly-border-success)] bg-[color-mix(in_srgb,var(--vly-success)_12%,var(--vly-surface))] text-[var(--vly-success)]"
                            : "border-[var(--vly-border-accent)] bg-[var(--vly-surface-active)] text-[var(--vly-accent-hover)]",
                        )}
                      >
                        {step.status === "COMPLETED" ? (
                          <CheckCircle2 size={12} />
                        ) : (
                          index + 1
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-[11px] font-bold text-[var(--vly-text-secondary)]">
                            {step.name}
                          </p>
                          <span className="rounded bg-[var(--vly-surface)] px-1.5 py-0.5 font-mono text-[8px] text-[var(--vly-text-muted)]">
                            {step.capabilityId}
                          </span>
                        </div>
                        <p className="mt-1 text-[9px] text-[var(--vly-text-muted)]">
                          {step.capabilityKind} · {step.authority} · risco{" "}
                          {step.risk}
                          {step.requiresConfirmation
                            ? step.confirmation
                              ? " · confirmado para esta revisão"
                              : " · confirmação necessária"
                            : ""}
                          {step.supportsUndo ? " · undo disponível" : ""}
                        </p>
                        {step.dependsOn.length > 0 && (
                          <p className="mt-1 text-[9px] text-[var(--vly-info)]">
                            Depende de: {step.dependsOn.join(", ")}
                          </p>
                        )}
                        {step.error && (
                          <p className="mt-1 text-[10px] text-[var(--vly-danger)]">
                            {step.error}
                          </p>
                        )}
                      </div>
                      <span className="text-[8px] font-bold text-[var(--vly-text-disabled)]">
                        {step.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div
                className="mt-4 flex flex-wrap gap-2"
                aria-label="Controles do plano"
              >
                {selected.status === "PLANNED" && (
                  <button
                    onClick={() => {
                      capabilityPlanRuntime.register(
                        capabilityPlanBuilder.approve(selected, "HUMAN"),
                      );
                      refresh("Plano aprovado e vinculado ao hash atual.");
                    }}
                    className="vly-interactive min-h-11 rounded-lg bg-[var(--vly-accent)] px-3 text-[11px] font-bold text-[var(--vly-accent-contrast)]"
                  >
                    <ShieldCheck size={13} className="mr-1 inline" /> Aprovar
                  </button>
                )}
                {selected.status === "APPROVED" &&
                  selected.steps
                    .filter(
                      (step) => step.requiresConfirmation && !step.confirmation,
                    )
                    .map((step) => (
                      <button
                        key={`confirm-${step.id}`}
                        onClick={() => {
                          capabilityPlanRuntime.confirmStep(
                            selected.id,
                            step.id,
                          );
                          refresh(
                            `${step.name}: confirmação registrada para a revisão atual.`,
                          );
                        }}
                        className="vly-interactive min-h-11 rounded-lg bg-[var(--vly-warning)] px-3 text-[11px] font-bold text-[var(--vly-accent-contrast)]"
                      >
                        <ShieldCheck size={13} className="mr-1 inline" />{" "}
                        Confirmar {step.name}
                      </button>
                    ))}
                {selected.status === "APPROVED" && (
                  <button
                    type="button"
                    disabled={
                      busy ||
                      selected.steps.some(
                        (step) =>
                          step.requiresConfirmation && !step.confirmation,
                      )
                    }
                    aria-busy={busy}
                    onClick={() => execute(selected)}
                    className="vly-interactive min-h-11 rounded-lg bg-[var(--vly-success)] px-3 text-[11px] font-bold text-[var(--vly-accent-contrast)] hover:bg-[var(--vly-accent-hover)] disabled:opacity-50"
                    title={
                      selected.steps.some(
                        (step) =>
                          step.requiresConfirmation && !step.confirmation,
                      )
                        ? "Confirme as mutações sensíveis antes de executar"
                        : undefined
                    }
                  >
                    <Play size={13} className="mr-1 inline" /> Executar
                  </button>
                )}
                {selected.status === "EXECUTING" && (
                  <button
                    onClick={() => {
                      capabilityPlanRuntime.pause(selected.id);
                      refresh("Pausa solicitada.");
                    }}
                    className="vly-interactive min-h-11 rounded-lg border border-[var(--vly-border-warning)] px-3 text-[11px] text-[var(--vly-warning)]"
                  >
                    <Pause size={13} className="mr-1 inline" /> Pausar
                  </button>
                )}
                {[
                  "PAUSED",
                  "INTERRUPTED",
                  "PARTIAL",
                  "FAILED",
                  "BLOCKED",
                ].includes(selected.status) && (
                  <button
                    disabled={busy}
                    onClick={() => resumeAndExecute(selected)}
                    className="vly-interactive min-h-11 rounded-lg bg-[var(--vly-info)] px-3 text-[11px] font-bold text-[var(--vly-accent-contrast)] disabled:opacity-50"
                  >
                    <RefreshCw size={13} className="mr-1 inline" /> Reconciliar
                    e retomar
                  </button>
                )}
                {[
                  "PLANNED",
                  "APPROVED",
                  "EXECUTING",
                  "PAUSED",
                  "INTERRUPTED",
                  "PARTIAL",
                  "BLOCKED",
                  "FAILED",
                ].includes(selected.status) && (
                  <button
                    onClick={() => {
                      capabilityPlanRuntime.cancel(selected.id);
                      refresh(
                        "Plano cancelado; resultados concluídos foram preservados.",
                      );
                    }}
                    className="vly-interactive min-h-11 rounded-lg border border-[var(--vly-border-danger)] px-3 text-[11px] text-[var(--vly-danger)]"
                  >
                    <Ban size={13} className="mr-1 inline" /> Cancelar
                  </button>
                )}
                {selected.steps
                  .filter((step) =>
                    ["FAILED", "BLOCKED", "SKIPPED"].includes(step.status),
                  )
                  .map((step) => (
                    <button
                      key={step.id}
                      onClick={() => {
                        capabilityPlanRuntime.retryStep(selected.id, step.id);
                        refresh(
                          `Etapa ${step.name} preparada para nova tentativa.`,
                        );
                      }}
                      className="vly-interactive min-h-11 rounded-lg border border-[var(--vly-border-accent)] px-3 text-[11px] text-[var(--vly-accent-hover)]"
                    >
                      <RotateCcw size={13} className="mr-1 inline" /> Repetir{" "}
                      {step.name}
                    </button>
                  ))}
              </div>

              {selected.steps.some(
                (step) =>
                  step.status === "COMPLETED" &&
                  step.authority === "MUTATE_GOVERNED",
              ) && (
                <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5 text-[10px] text-amber-200">
                  <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                  <span>
                    {selected.steps
                      .filter(
                        (step) =>
                          step.status === "COMPLETED" &&
                          step.authority === "MUTATE_GOVERNED",
                      )
                      .every((step) => step.supportsUndo && step.mutationRecord)
                      ? "As alterações concluídas possuem registro anterior/posterior e operação concreta de restauração."
                      : "Há mutações concluídas sem contrato concreto de undo; reversão automática está indisponível."}
                  </span>
                </div>
              )}
              {selected.steps.some(
                (step) =>
                  step.status === "COMPLETED" &&
                  step.authority === "MUTATE_GOVERNED",
              ) &&
                (selected.steps
                  .filter(
                    (step) =>
                      step.status === "COMPLETED" &&
                      step.authority === "MUTATE_GOVERNED",
                  )
                  .every((step) => step.supportsUndo && step.mutationRecord) ? (
                  <button
                    disabled={busy}
                    onClick={() => revert(selected)}
                    className="mt-2 min-h-11 rounded-lg border border-cyan-500/30 px-3 text-[11px] text-cyan-300 disabled:opacity-50"
                  >
                    <RotateCcw size={13} className="mr-1 inline" /> Reverter
                    alterações
                  </button>
                ) : (
                  <button
                    disabled
                    aria-disabled="true"
                    title="Requer executor de undo concreto"
                    className="mt-2 min-h-11 cursor-not-allowed rounded-lg border border-slate-700 px-3 text-[11px] text-slate-600"
                  >
                    <RotateCcw size={13} className="mr-1 inline" /> Reverter
                    indisponível com segurança
                  </button>
                ))}

              <details className="mt-4 rounded-xl border border-[#25253a] bg-[#0a0a0f] p-3">
                <summary className="flex cursor-pointer items-center gap-2 text-[10px] font-bold text-slate-400">
                  <History size={12} /> Journal, checkpoints e métricas
                </summary>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    {selected.events
                      .slice()
                      .reverse()
                      .map((event) => (
                        <div
                          key={event.id}
                          className="flex gap-2 text-[9px] text-slate-500"
                        >
                          <Clock3 size={10} className="mt-0.5 shrink-0" />
                          <span>
                            {new Date(event.timestamp).toLocaleString("pt-BR")}:{" "}
                            {event.message}
                          </span>
                        </div>
                      ))}
                  </div>
                  <div className="rounded-lg bg-[#11111b] p-2.5 text-[9px] text-slate-500">
                    <p>
                      Capacidades:{" "}
                      {selected.metrics.selectedCapabilityIds.join(", ")}
                    </p>
                    <p className="mt-1">
                      Confirmações: {selected.metrics.confirmationCount}
                    </p>
                    <p>
                      Falhas: {selected.metrics.failureCount} · bloqueios:{" "}
                      {selected.metrics.blockedCount}
                    </p>
                    <p>
                      Retries: {selected.metrics.retryCount} · reversões:{" "}
                      {selected.metrics.reversalCount}
                    </p>
                    <p>Duração: {selected.metrics.durationMs ?? 0} ms</p>
                    <p className="mt-1">
                      Checkpoint:{" "}
                      {selected.checkpoint?.completedStepIds.join(", ") ||
                        "ainda não criado"}
                    </p>
                  </div>
                </div>
              </details>
            </div>
          )}
        </div>
      )}
    </Surface>
  );
}
