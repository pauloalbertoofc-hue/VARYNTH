"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { PageLayout } from "@/components/layout/PageLayout";
import { useVarynthStore } from "@/lib/store/useVarynthStore";
import { ActorType, EntityType } from "@/lib/types";
import {
  Activity,
  Search,
  Filter,
  User,
  Bot,
  Cpu,
  Plus,
  Edit,
  Trash2,
  RotateCcw,
  CheckCircle2,
  Flame,
  Clock,
  Sparkles,
  ArrowRight,
  FolderKanban,
  FileText,
  BookOpen,
  Scale,
  GraduationCap,
  Trophy,
  Code2,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StatePanel } from "@/components/ui/StatePanel";
import { Surface } from "@/components/ui/Surface";

const ACTOR_CONFIG: Record<ActorType, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  user: { label: "Paulo (Usuário)", icon: User, color: "text-[var(--vly-info)]", bg: "bg-[color-mix(in_srgb,var(--vly-info)_10%,transparent)] border-[color-mix(in_srgb,var(--vly-info)_30%,transparent)] text-[var(--vly-info)]" },
  athena: { label: "Athena AI", icon: Bot, color: "text-[var(--vly-accent)]", bg: "bg-[color-mix(in_srgb,var(--vly-accent)_10%,transparent)] border-[color-mix(in_srgb,var(--vly-accent)_30%,transparent)] text-[var(--vly-accent)]" },
  system: { label: "Sistema", icon: Cpu, color: "text-[var(--vly-warning)]", bg: "bg-[color-mix(in_srgb,var(--vly-warning)_10%,transparent)] border-[color-mix(in_srgb,var(--vly-warning)_30%,transparent)] text-[var(--vly-warning)]" },
};

const ACTION_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  criou: { label: "Criou", icon: Plus, color: "text-[var(--vly-success)]" },
  atualizou: { label: "Atualizou", icon: Edit, color: "text-[var(--vly-info)]" },
  concluiu: { label: "Concluiu", icon: CheckCircle2, color: "text-[var(--vly-success)]" },
  moveu_lixeira: { label: "Moveu para a Lixeira", icon: Trash2, color: "text-[var(--vly-warning)]" },
  restaurou: { label: "Restaurou da Lixeira", icon: RotateCcw, color: "text-[var(--vly-info)]" },
  destruiu_permanentemente: { label: "Destruiu Permanentemente", icon: Flame, color: "text-[var(--vly-danger)]" },
  esvaziou_lixeira: { label: "Esvaziou a Lixeira", icon: Trash2, color: "text-[var(--vly-danger)]" },
  promoveu: { label: "Promoveu Ideia", icon: Sparkles, color: "text-[var(--vly-accent)]" },
  arquivou: { label: "Arquivou", icon: Clock, color: "text-[var(--vly-text-secondary)]" },
};

export default function ActivityPage() {
  const { activities, projects } = useVarynthStore();

  const [search, setSearch] = useState("");
  const [selectedActor, setSelectedActor] = useState<string>("todos");
  const [selectedAction, setSelectedAction] = useState<string>("todas");
  const [selectedEntity, setSelectedEntity] = useState<string>("todas");

  const filteredActivities = useMemo(() => {
    return activities.filter((act) => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (act.entityTitle && act.entityTitle.toLowerCase().includes(q)) ||
        act.action.toLowerCase().includes(q) ||
        (act.entityType && act.entityType.toLowerCase().includes(q));

      const matchesActor = selectedActor === "todos" || act.actorType === selectedActor;
      const matchesAction = selectedAction === "todas" || act.action === selectedAction;
      const matchesEntity = selectedEntity === "todas" || act.entityType === selectedEntity;

      return matchesSearch && matchesActor && matchesAction && matchesEntity;
    });
  }, [activities, search, selectedActor, selectedAction, selectedEntity]);

  const availableActions = useMemo(
    () => Array.from(new Set(activities.map((activity) => activity.action))).sort(),
    [activities]
  );
  const availableEntities = useMemo(
    () => Array.from(new Set(activities.map((activity) => activity.entityType).filter((entity): entity is string => Boolean(entity)))).sort(),
    [activities]
  );

  return (
    <PageLayout title="Histórico & Auditoria" subtitle="Registro cronológico de todas as ações no VARYNTH OS">
      <div className="vly-enter mx-auto max-w-5xl space-y-6 pb-12">
        {/* Header */}
        <div className="rounded-[var(--vly-radius-xl)] border border-[var(--vly-border-accent)] bg-[var(--vly-surface)] p-6">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-[color-mix(in_srgb,var(--vly-accent)_16%,transparent)] border border-[color-mix(in_srgb,var(--vly-accent)_30%,transparent)] flex items-center justify-center text-[var(--vly-accent)] glow-accent flex-shrink-0">
              <Activity size={24} />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-black text-[var(--vly-text-primary)] flex items-center gap-2">
                Audit Trail / Linha do Tempo
                <span className="text-xs px-2 py-0.5 rounded bg-[color-mix(in_srgb,var(--vly-accent)_10%,transparent)] text-[var(--vly-accent)] border border-[color-mix(in_srgb,var(--vly-accent)_20%,transparent)] font-bold font-mono">
                  {activities.length} eventos
                </span>
              </h1>
              <p className="text-xs text-[var(--vly-text-secondary)] mt-0.5">
                Rastreamento centralizado de mutações executadas pelo Usuário, Athena AI e rotinas do Sistema.
              </p>
            </div>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="space-y-3 rounded-[var(--vly-radius-lg)] border border-[var(--vly-border-default)] bg-[var(--vly-surface)] p-4" role="region" aria-label="Filtros do histórico">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--vly-text-muted)]" />
              <input
                aria-label="Pesquisar no histórico"
                type="text"
                placeholder="Pesquisar por título do item, ação ou entidade..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="vly-field w-full pl-9 pr-3 py-2 text-xs"
              />
            </div>

            {/* Actor Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                type="button"
                aria-pressed={selectedActor === "todos"}
                onClick={() => setSelectedActor("todos")}
                className={cn(
                  "vly-interactive whitespace-nowrap rounded-[var(--vly-radius-md)] px-3 py-1.5 text-xs font-bold",
                  selectedActor === "todos"
                    ? "bg-[var(--vly-accent)] text-[var(--vly-accent-contrast)] shadow-sm glow-accent"
                    : "bg-[var(--vly-surface)] text-[var(--vly-text-secondary)] hover:text-[var(--vly-text-primary)] border border-[var(--vly-border-subtle)]"
                )}
              >
                Todos Atores
              </button>

              <button
                type="button"
                aria-pressed={selectedActor === "user"}
                onClick={() => setSelectedActor("user")}
                className={cn(
                  "vly-interactive flex items-center gap-1.5 whitespace-nowrap rounded-[var(--vly-radius-md)] border px-3 py-1.5 text-xs font-semibold",
                  selectedActor === "user"
                    ? "bg-[color-mix(in_srgb,var(--vly-info)_20%,transparent)] text-[var(--vly-info)] border-[color-mix(in_srgb,var(--vly-info)_50%,transparent)]"
                    : "bg-[var(--vly-surface)] text-[var(--vly-text-secondary)] border-[var(--vly-border-subtle)]"
                )}
              >
                <User size={12} className="text-[var(--vly-info)]" />
                <span>Paulo</span>
              </button>

              <button
                type="button"
                aria-pressed={selectedActor === "athena"}
                onClick={() => setSelectedActor("athena")}
                className={cn(
                  "vly-interactive flex items-center gap-1.5 whitespace-nowrap rounded-[var(--vly-radius-md)] border px-3 py-1.5 text-xs font-semibold",
                  selectedActor === "athena"
                    ? "bg-[color-mix(in_srgb,var(--vly-accent)_20%,transparent)] text-[var(--vly-accent)] border-[color-mix(in_srgb,var(--vly-accent)_50%,transparent)]"
                    : "bg-[var(--vly-surface)] text-[var(--vly-text-secondary)] border-[var(--vly-border-subtle)]"
                )}
              >
                <Bot size={12} className="text-[var(--vly-accent)]" />
                <span>Athena AI</span>
              </button>

              <button
                type="button"
                aria-pressed={selectedActor === "system"}
                onClick={() => setSelectedActor("system")}
                className={cn(
                  "vly-interactive flex items-center gap-1.5 whitespace-nowrap rounded-[var(--vly-radius-md)] border px-3 py-1.5 text-xs font-semibold",
                  selectedActor === "system"
                    ? "bg-[color-mix(in_srgb,var(--vly-warning)_20%,transparent)] text-[var(--vly-warning)] border-[color-mix(in_srgb,var(--vly-warning)_50%,transparent)]"
                    : "bg-[var(--vly-surface)] text-[var(--vly-text-secondary)] border-[var(--vly-border-subtle)]"
                )}
              >
                <Cpu size={12} className="text-[var(--vly-warning)]" />
                <span>Sistema</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 border-t border-[var(--vly-border-subtle)] pt-3">
            <label className="flex min-w-0 flex-1 items-center gap-2 text-[11px] font-semibold text-[var(--vly-text-secondary)]">
              <Filter size={13} aria-hidden="true" />
              <span className="sr-only">Filtrar por ação</span>
              <select
                aria-label="Filtrar por ação"
                value={selectedAction}
                onChange={(event) => setSelectedAction(event.target.value)}
                className="vly-field min-h-0 w-full py-2 text-xs"
              >
                <option value="todas">Todas as ações</option>
                {availableActions.map((action) => (
                  <option key={action} value={action}>{ACTION_CONFIG[action]?.label || action}</option>
                ))}
              </select>
            </label>

            <label className="min-w-0 flex-1 text-[11px] font-semibold text-[var(--vly-text-secondary)]">
              <span className="sr-only">Filtrar por entidade</span>
              <select
                aria-label="Filtrar por entidade"
                value={selectedEntity}
                onChange={(event) => setSelectedEntity(event.target.value)}
                className="vly-field min-h-0 w-full py-2 text-xs"
              >
                <option value="todas">Todas as entidades</option>
                {availableEntities.map((entity) => <option key={entity} value={entity}>{entity}</option>)}
              </select>
            </label>
          </div>
        </div>

        {/* Timeline Stream */}
        {filteredActivities.length === 0 ? (
          <StatePanel tone="empty" title="Nenhuma atividade registrada" description="As ações realizadas no VARYNTH OS serão auditadas aqui em tempo real." />
        ) : (
          <div className="relative pl-6 sm:pl-8 space-y-4 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-[var(--vly-border-subtle)]" role="list" aria-label="Eventos auditados">
            {filteredActivities.map((act) => {
              const actor = ACTOR_CONFIG[act.actorType] || ACTOR_CONFIG.user;
              const ActorIcon = actor.icon;
              const actionConf = ACTION_CONFIG[act.action] || { label: act.action, icon: Sparkles, color: "text-[var(--vly-text-secondary)]" };
              const ActionIcon = actionConf.icon;

              const date = new Date(act.createdAt);
              const timeStr = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
              const dateStr = date.toLocaleDateString("pt-BR");

              return (
                <div key={act.id} className="relative group" role="listitem">
                  {/* Timeline Dot */}
                  <div
                    className={cn(
                      "absolute -left-[27px] sm:-left-[31px] top-3.5 w-3.5 h-3.5 rounded-full border-2 border-[var(--vly-world)] ring-2 flex items-center justify-center transition-transform group-hover:scale-125",
                      act.actorType === "athena"
                        ? "bg-[var(--vly-accent)] ring-[color-mix(in_srgb,var(--vly-accent)_30%,transparent)]"
                        : act.actorType === "system"
                        ? "bg-[var(--vly-warning)] ring-[color-mix(in_srgb,var(--vly-warning)_30%,transparent)]"
                        : "bg-[var(--vly-info)] ring-[color-mix(in_srgb,var(--vly-info)_30%,transparent)]"
                    )}
                  />

                  {/* Activity Card */}
                  <Surface tone="panel" className="p-4 hover:border-[color-mix(in_srgb,var(--vly-accent)_40%,transparent)] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 clip-corner-sm">
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Actor Badge */}
                        <span className={cn("inline-flex items-center gap-1 text-[10px] px-2 py-0.2 rounded border font-bold uppercase", actor.bg)}>
                          <ActorIcon size={10} />
                          <span>{actor.label}</span>
                        </span>

                        {/* Action Badge */}
                        <span className={cn("inline-flex items-center gap-1 text-[11px] font-semibold", actionConf.color)}>
                          <ActionIcon size={12} />
                          <span>{actionConf.label}</span>
                        </span>

                        {/* Entity Type Badge */}
                        {act.entityType && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-[var(--vly-surface-raised)] text-[var(--vly-text-secondary)] border border-[var(--vly-border-subtle)] uppercase font-mono">
                            {act.entityType}
                          </span>
                        )}
                      </div>

                      {/* Main Title */}
                      <p className="text-xs sm:text-sm font-semibold text-[var(--vly-text-primary)] truncate">
                        {act.entityTitle || "Operação sem título"}
                      </p>

                      {/* Metadata if any */}
                      {Boolean(act.metadata?.hasConflict) && (
                        <p className="text-[11px] text-[var(--vly-warning)] font-mono">
                          ⚠️ Conflito de ID detectado: novo identificador gerado automaticamente.
                        </p>
                      )}
                    </div>

                    {/* Timestamp */}
                    <div className="text-right font-mono text-[11px] text-[var(--vly-text-muted)] flex-shrink-0 flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-[var(--vly-border-subtle)]">
                      <span className="text-[var(--vly-text-secondary)] font-bold">{timeStr}</span>
                      <span className="text-[10px]">{dateStr}</span>
                    </div>
                  </Surface>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
