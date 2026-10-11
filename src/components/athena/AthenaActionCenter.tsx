"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  CirclePlay,
  Clock3,
  Info,
  ListChecks,
  UserRoundCheck,
  X,
} from "lucide-react";
import { useVarynthStore } from "@/lib/store/useVarynthStore";
import {
  athenaActionCenter,
  type AthenaActionItem,
} from "@/lib/athena/insights/action-center";
import { athenaProjectPlanManager } from "@/lib/athena/planning/project-plan-manager";
import { athenaSuggestionCenter } from "@/lib/athena/insights/suggestion-center";
import { cn } from "@/lib/utils";
import { googleCalendarSync } from "@/lib/athena/integrations/google-calendar-sync";
import { Surface } from "@/components/ui/Surface";

interface Props {
  store: ReturnType<typeof useVarynthStore>;
  onPrompt: (prompt: string) => void;
}

export function AthenaActionCenter({ store, onPrompt }: Props) {
  const [revision, setRevision] = useState(0);
  const [feedback, setFeedback] = useState<string>();
  const [assigneeFor, setAssigneeFor] = useState<string>();
  const [assignee, setAssignee] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const allItems = athenaActionCenter.list(store, new Date(), true);
  const items = allItems.filter((item) => item.decision === "ativa");
  const displayedItems = showHistory
    ? allItems.filter((item) => item.decision !== "ativa")
    : items;
  const critical = items.filter((item) => item.severity === "critico").length;
  const attention = items.filter((item) => item.severity === "atencao").length;

  useEffect(() => {
    const refresh = () => setRevision((value) => value + 1);
    window.addEventListener("varynth_athena_actions_updated", refresh);
    window.addEventListener("varynth_project_plans_updated", refresh);
    return () => {
      window.removeEventListener("varynth_athena_actions_updated", refresh);
      window.removeEventListener("varynth_project_plans_updated", refresh);
    };
  }, []);

  const refresh = (message: string) => {
    setFeedback(message);
    setRevision((value) => value + 1);
  };
  const projectName = (id?: string) =>
    id
      ? store.projects.find((project) => project.id === id)?.title ||
        "Projeto removido"
      : "Geral";
  const createTask = (item: AthenaActionItem) => {
    const title =
      item.title === "Projeto sem próxima ação"
        ? `Definir próxima ação — ${item.detail}`
        : `Resolver alerta — ${item.detail}`;
    const duplicate = store.tasks.some(
      (task) =>
        task.projectId === item.projectId &&
        task.title === title &&
        task.status !== "concluida",
    );
    if (!duplicate)
      store.addTask(
        {
          title,
          projectId: item.projectId,
          priority: item.severity === "critico" ? "urgente" : "alta",
          status: "a_fazer",
          tags: ["athena", "central-de-pendencias"],
        },
        "athena",
      );
    if (item.id.startsWith("finding:"))
      athenaSuggestionCenter.setStatus(item.id.slice(8), "aceita");
    athenaActionCenter.complete(item.id);
    refresh(
      duplicate
        ? "A tarefa já existia; o alerta foi encerrado."
        : "Alerta transformado em tarefa.",
    );
  };
  const approvePlan = (item: AthenaActionItem) => {
    if (item.planId && athenaProjectPlanManager.approve(item.planId)) {
      athenaActionCenter.complete(item.id);
      refresh("Plano aprovado. A execução continua aguardando seu comando.");
    }
  };
  const executePlan = (item: AthenaActionItem) => {
    if (!item.planId) return;
    const result = athenaProjectPlanManager.execute(item.planId, store);
    if (result.success) {
      athenaActionCenter.complete(item.id);
      refresh("Plano executado por completo.");
    } else refresh(result.error || "Não foi possível executar o plano.");
  };
  const startTask = (item: AthenaActionItem) => {
    if (!item.taskId) return;
    store.updateTask(item.taskId, { status: "em_progresso" }, "athena");
    athenaActionCenter.complete(item.id);
    refresh("Tarefa iniciada e removida desta fila de decisão.");
  };
  const delegateTask = (item: AthenaActionItem) => {
    const task = store.tasks.find((entry) => entry.id === item.taskId);
    if (task && athenaActionCenter.delegate(task, assignee, store)) {
      setAssigneeFor(undefined);
      setAssignee("");
      refresh(`Tarefa delegada para ${assignee.trim()}.`);
    }
  };

  return (
    <Surface tone="raised" role="region" aria-labelledby="athena-action-center-title" className="p-4">
      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        <div className="rounded-xl border border-[var(--vly-border-default)] bg-[var(--vly-surface)] p-3">
          <p className="text-[10px] uppercase tracking-wider text-[var(--vly-text-muted)]">
            Exigem decisão
          </p>
          <strong className="mt-1 block text-xl text-[var(--vly-text-primary)]">
            {items.length}
          </strong>
        </div>
        <div className="rounded-xl border border-[var(--vly-border-danger)] bg-[color-mix(in_srgb,var(--vly-danger)_8%,var(--vly-surface))] p-3">
          <p className="text-[10px] uppercase tracking-wider text-[var(--vly-danger)]">
            Críticos
          </p>
          <strong className="mt-1 block text-xl text-[var(--vly-danger)]">
            {critical}
          </strong>
        </div>
        <div className="rounded-xl border border-[var(--vly-border-warning)] bg-[var(--vly-surface-warning)] p-3">
          <p className="text-[10px] uppercase tracking-wider text-[var(--vly-warning)]">
            Atenção
          </p>
          <strong className="mt-1 block text-xl text-[var(--vly-warning)]">
            {attention}
          </strong>
        </div>
      </div>
      {feedback && (
        <div role="status" className="mb-3 flex items-center justify-between rounded-lg border border-[var(--vly-border-success)] bg-[color-mix(in_srgb,var(--vly-success)_12%,var(--vly-surface))] px-3 py-2 text-[11px] text-[var(--vly-success)]">
          <span>{feedback}</span>
          <button
            type="button"
            className="vly-interactive"
            onClick={() => setFeedback(undefined)}
            aria-label="Fechar aviso"
          >
            <X size={13} />
          </button>
        </div>
      )}
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 id="athena-action-center-title" className="flex items-center gap-2 text-xs font-bold text-[var(--vly-text-secondary)]">
            <ListChecks size={14} className="text-[var(--vly-accent)]" />{" "}
            {showHistory
              ? "Histórico de decisões"
              : "Ordem recomendada para hoje"}
          </h3>
          <p className="mt-1 text-[10px] text-[var(--vly-text-muted)]">
            {showHistory
              ? "Itens adiados, dispensados ou concluídos permanecem auditáveis."
              : "Urgência, prazo e impacto determinam a posição. A Athena não executa planos sem autorização."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowHistory((value) => !value)}
          className="vly-interactive shrink-0 rounded-lg border border-[var(--vly-border-default)] px-2.5 py-1.5 text-[10px] text-[var(--vly-text-muted)]"
        >
          {showHistory ? "Ver pendências" : "Decisões anteriores"}
        </button>
      </div>
      <div className="space-y-2">
        {displayedItems.slice(0, 12).map((item, index) => (
          <article
            key={item.id}
            className={cn(
              "rounded-xl border p-3",
              item.severity === "critico"
                ? "border-[var(--vly-border-danger)] bg-[color-mix(in_srgb,var(--vly-danger)_6%,var(--vly-surface))]"
                : item.severity === "atencao"
                  ? "border-[var(--vly-border-warning)] bg-[var(--vly-surface-warning)]"
                  : "border-[var(--vly-border-info)] bg-[color-mix(in_srgb,var(--vly-info)_6%,var(--vly-surface))]",
            )}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--vly-surface-hover)] text-[10px] font-bold text-[var(--vly-text-muted)]">
                {index + 1}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-xs font-bold text-[var(--vly-text-primary)]">
                    {item.title}
                  </h4>
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[9px] font-bold uppercase",
                      item.severity === "critico"
                        ? "bg-[color-mix(in_srgb,var(--vly-danger)_12%,var(--vly-surface))] text-[var(--vly-danger)]"
                        : item.severity === "atencao"
                          ? "bg-[var(--vly-surface-warning)] text-[var(--vly-warning)]"
                          : "bg-[color-mix(in_srgb,var(--vly-info)_12%,var(--vly-surface))] text-[var(--vly-info)]",
                    )}
                  >
                    {item.severity}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-[var(--vly-text-secondary)]">
                  {item.detail}
                </p>
                <p className="mt-1 text-[9px] text-[var(--vly-text-disabled)]">
                  {projectName(item.projectId)}
                </p>
                <div className="mt-2 flex items-start gap-1.5 text-[10px] text-[var(--vly-text-muted)]">
                  <Info size={11} className="mt-0.5 shrink-0" />
                  <span>
                    <strong className="text-[var(--vly-text-secondary)]">
                      Por que agora:
                    </strong>{" "}
                    {item.reason}
                  </span>
                </div>
              </div>
              {item.severity === "critico" ? (
                <AlertTriangle
                  size={16}
                  className="shrink-0 text-[var(--vly-danger)]"
                />
              ) : (
                <CalendarClock
                  size={16}
                  className="shrink-0 text-[var(--vly-warning)]"
                />
              )}
            </div>
            {!showHistory && (
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {item.kind === "PLAN_APPROVAL" && (
                  <button
                    type="button"
                    onClick={() => approvePlan(item)}
                    className="vly-interactive flex items-center gap-1 rounded-lg bg-[var(--vly-accent)] px-2.5 py-1.5 text-[10px] font-bold text-[var(--vly-accent-contrast)]"
                  >
                    <CheckCircle2 size={11} /> Aprovar plano
                  </button>
                )}
                {item.kind === "PLAN_EXECUTION" && (
                  <button
                    type="button"
                    onClick={() => executePlan(item)}
                    className="vly-interactive flex items-center gap-1 rounded-lg bg-[var(--vly-success)] px-2.5 py-1.5 text-[10px] font-bold text-[var(--vly-accent-contrast)]"
                  >
                    <CirclePlay size={11} /> Executar plano
                  </button>
                )}
                {(item.kind === "TASK_OVERDUE" ||
                  item.kind === "TASK_DUE_SOON") && (
                  <>
                    <button
                      type="button"
                      onClick={() => startTask(item)}
                      className="vly-interactive rounded-lg bg-[var(--vly-surface-active)] px-2.5 py-1.5 text-[10px] font-bold text-[var(--vly-accent-hover)]"
                    >
                      Iniciar tarefa
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAssigneeFor(item.id);
                        setAssignee("");
                      }}
                      className="vly-interactive flex items-center gap-1 rounded-lg border border-[var(--vly-border-default)] px-2.5 py-1.5 text-[10px] text-[var(--vly-text-secondary)]"
                    >
                      <UserRoundCheck size={11} /> Delegar
                    </button>
                  </>
                )}
                {item.kind === "FINDING" && (
                  <button
                    type="button"
                    onClick={() => createTask(item)}
                    className="vly-interactive rounded-lg bg-[var(--vly-surface-active)] px-2.5 py-1.5 text-[10px] font-bold text-[var(--vly-accent-hover)]"
                  >
                    Criar tarefa
                  </button>
                )}
                {item.kind === "MISSING_DATA" && (
                  <button
                    type="button"
                    onClick={() =>
                      onPrompt(
                        `Ajude-me a completar os dados ausentes do plano: ${item.detail}`,
                      )
                    }
                    className="vly-interactive rounded-lg bg-[color-mix(in_srgb,var(--vly-info)_12%,var(--vly-surface))] px-2.5 py-1.5 text-[10px] font-bold text-[var(--vly-info)]"
                  >
                    Completar com Athena
                  </button>
                )}
                {item.kind === "CALENDAR_EVENT" && (
                  <button
                    type="button"
                    onClick={() => {
                      const fingerprint = item.id.slice(9);
                      const event = googleCalendarSync
                        .inbox()
                        .find((entry) => entry.fingerprint === fingerprint);
                      if (!event) return;
                      const result = googleCalendarSync.importToChronos(
                        event.id,
                        event.suggestedProjectId,
                        store.chronosEvents,
                        store.addChronosEvent,
                      );
                      if (result.success) {
                        athenaActionCenter.complete(item.id);
                        refresh("Evento externo importado para o Chronos.");
                      } else
                        refresh(
                          result.error || "Não foi possível importar o evento.",
                        );
                    }}
                    className="vly-interactive rounded-lg bg-[var(--vly-surface-active)] px-2.5 py-1.5 text-[10px] font-bold text-[var(--vly-accent-hover)]"
                  >
                    Importar para Chronos
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    athenaActionCenter.postpone(item.id);
                    refresh("Item adiado por 24 horas.");
                  }}
                  className="vly-interactive flex items-center gap-1 rounded-lg border border-[var(--vly-border-default)] px-2 py-1.5 text-[10px] text-[var(--vly-text-muted)]"
                >
                  <Clock3 size={10} /> Adiar 24h
                </button>
                <button
                  type="button"
                  onClick={() => {
                    athenaActionCenter.dismiss(item.id);
                    refresh(
                      "Item dispensado e registrado no histórico de decisões.",
                    );
                  }}
                  className="vly-interactive rounded-lg px-2 py-1.5 text-[10px] text-[var(--vly-text-disabled)] hover:text-[var(--vly-text-secondary)]"
                >
                  Dispensar
                </button>
              </div>
            )}
            {showHistory && (
              <div className="mt-3 text-[9px] font-bold uppercase tracking-wider text-[var(--vly-text-disabled)]">
                Decisão: {item.decision}
                {item.snoozedUntil
                  ? ` até ${new Date(item.snoozedUntil).toLocaleString("pt-BR")}`
                  : ""}
              </div>
            )}
            {!showHistory && assigneeFor === item.id && (
              <div className="mt-2 flex gap-2">
                <input
                  autoFocus
                  aria-label="Responsável pela tarefa"
                  value={assignee}
                  onChange={(event) => setAssignee(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") delegateTask(item);
                  }}
                  placeholder="Nome do responsável"
                  className="vly-field min-w-0 flex-1 rounded-lg border border-[var(--vly-border-accent)] bg-[var(--vly-surface)] px-2.5 py-1.5 text-[11px] text-[var(--vly-text-primary)] outline-none"
                />
                <button
                  type="button"
                  disabled={!assignee.trim()}
                  onClick={() => delegateTask(item)}
                  className="vly-interactive rounded-lg bg-[var(--vly-accent)] px-2.5 py-1.5 text-[10px] font-bold text-[var(--vly-accent-contrast)] disabled:opacity-40"
                >
                  Confirmar
                </button>
                <button
                  type="button"
                  onClick={() => setAssigneeFor(undefined)}
                  className="vly-interactive rounded-lg border border-[var(--vly-border-default)] px-2 py-1.5 text-[10px] text-[var(--vly-text-muted)]"
                >
                  Cancelar
                </button>
              </div>
            )}
          </article>
        ))}
        {!displayedItems.length && (
          <div className="rounded-xl border border-dashed border-[var(--vly-border-default)] py-10 text-center">
            <CheckCircle2
              size={23}
              className="mx-auto mb-2 text-[var(--vly-success)]"
            />
            <p className="text-xs font-bold text-[var(--vly-text-secondary)]">
              {showHistory
                ? "Nenhuma decisão anterior registrada."
                : "Tudo em ordem por enquanto."}
            </p>
            <p className="mt-1 text-[10px] text-[var(--vly-text-muted)]">
              {showHistory
                ? "As decisões tomadas nesta central aparecerão aqui."
                : "Nenhuma pendência exige sua decisão agora."}
            </p>
          </div>
        )}
      </div>
    </Surface>
  );
}
