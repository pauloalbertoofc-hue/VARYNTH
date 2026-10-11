"use client";

import Link from "next/link";
import { PageLayout } from "@/components/layout/PageLayout";
import { AppCard } from "@/components/ui/AppCard";
import { StatePanel } from "@/components/ui/StatePanel";
import { modules } from "@/lib/modules";
import { useVarynthStore } from "@/lib/store/useVarynthStore";
import { ClockWidget } from "@/components/widgets/ClockWidget";
import { FocusTimerWidget } from "@/components/widgets/FocusTimerWidget";
import { ScratchpadWidget } from "@/components/widgets/ScratchpadWidget";
import {
  Zap,
  FolderKanban,
  CheckSquare,
  Square,
  Calendar,
  FileText,
  Clock,
  Plus,
  ArrowRight,
  Flame,
  Activity as ActivityIcon,
  Layers,
  Sparkles,
  Bot,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePlatformPreferences } from "@/components/customization/CustomizationProvider";

export default function DashboardPage() {
  const { projects, tasks, notes, activities, toggleTask, isLoaded, accountName } = useVarynthStore();
  const preferences = usePlatformPreferences();

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  const handleOpenQuickCreate = (tab?: string) => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("open-quick-create", { detail: { tab } }));
    }
  };

  const activeProjects = projects.filter((p) => p.status === "ativo");
  const pendingTasks = tasks.filter((t) => t.status !== "concluida");
  const urgentTasks = pendingTasks.filter((t) => t.priority === "urgente" || t.priority === "alta");
  const completedTasks = tasks.filter((t) => t.status === "concluida");

  const upcomingDeadlines = projects
    .filter((p) => p.deadline && p.status !== "concluido" && p.status !== "arquivado")
    .sort((a, b) => (a.deadline! > b.deadline! ? 1 : -1))
    .slice(0, 4);

  return (
    <PageLayout title="Início" subtitle="Cockpit Operacional VARYNTH OS">
      <div className="space-y-8 max-w-7xl mx-auto animate-fade-in">
        {preferences.dashboard.hero && <>{/* Hero Banner with Quick Actions */}
        <div className="relative rounded-[var(--vly-radius-xl)] border border-[var(--vly-border-default)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--vly-accent)_16%,var(--vly-surface)),var(--vly-surface),color-mix(in_srgb,var(--vly-info)_8%,var(--vly-surface)))] p-6 sm:p-8 overflow-hidden">
          <div className="pointer-events-none absolute right-0 top-0 h-96 w-96 rounded-full bg-[var(--vly-accent)]/15 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-32 h-48 w-48 rounded-full bg-[var(--vly-info)]/10 blur-2xl" />

          <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--vly-accent)]/20 bg-[var(--vly-accent)]/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-widest text-[var(--vly-accent)]">
                <Sparkles size={12} />
                <span>{preferences.appName} OS · Universo Digital Pessoal</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white text-glow-accent tracking-tight">
                {greeting}, {accountName}.
              </h1>
              <p className="max-w-xl text-xs leading-relaxed text-[var(--vly-text-secondary)] sm:text-sm">
                Central de controle ativa. Você tem{" "}
                <span className="font-semibold text-[var(--vly-accent)]">{pendingTasks.length} {pendingTasks.length === 1 ? "tarefa pendente" : "tarefas pendentes"}</span>{" "}
                ({urgentTasks.length} {urgentTasks.length === 1 ? "prioritária" : "prioritárias"}) distribuídas em{" "}
                <span className="font-semibold text-[var(--vly-info)]">{activeProjects.length} {activeProjects.length === 1 ? "projeto ativo" : "projetos ativos"}</span>.
              </p>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => handleOpenQuickCreate("task")}
                className="vly-interactive flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[var(--vly-surface-raised)] hover:bg-[var(--vly-surface-hover)] text-[var(--vly-text-primary)] border border-[var(--vly-border-accent)]"
              >
                <Plus size={14} />
                <span>+ Nova Tarefa</span>
              </button>

              <button
                onClick={() => handleOpenQuickCreate("note")}
                className="vly-interactive flex items-center gap-1.5 px-3.5 py-2 rounded-[var(--vly-radius-md)] text-xs font-semibold bg-[var(--vly-surface-raised)] hover:bg-[var(--vly-surface-hover)] text-[var(--vly-text-primary)] border border-[var(--vly-border-default)] hover:border-[var(--vly-border-strong)]"
              >
                <FileText size={14} className="text-[var(--vly-accent)]" />
                <span>+ Nova Nota</span>
              </button>

              <button
                onClick={() => handleOpenQuickCreate("project")}
                className="vly-interactive flex items-center gap-1.5 px-3.5 py-2 rounded-[var(--vly-radius-md)] text-xs font-semibold bg-[var(--vly-surface-raised)] hover:bg-[var(--vly-surface-hover)] text-[var(--vly-text-primary)] border border-[var(--vly-border-default)] hover:border-[var(--vly-border-strong)]"
              >
                <FolderKanban size={14} className="text-[var(--vly-info)]" />
                <span>+ Novo Projeto</span>
              </button>
            </div>
          </div>
        </div></>}

        {/* Real-time OS KPIs */}
        {(preferences.dashboard.metricProjects || preferences.dashboard.metricTasks || preferences.dashboard.metricCompleted || preferences.dashboard.metricVault) && <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {preferences.dashboard.metricProjects && <Link
            href="/projects"
            aria-label="Acessar painel de projetos ativos"
            className="group clip-corner-sm rounded-xl border border-[var(--vly-border-default)] bg-[var(--vly-surface)] p-4 transition-all hover:border-[var(--vly-accent)]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vly-accent)]"
          >
            <div className="flex items-center justify-between text-[var(--vly-text-primary)] text-xs">
              <span>Projetos Ativos</span>
              <FolderKanban size={16} className="text-[var(--vly-accent)] transition-transform group-hover:scale-110" />
            </div>
            <p className="mt-1 text-2xl font-bold text-[var(--vly-text-primary)]">{activeProjects.length}</p>
            <p className="mt-0.5 text-[10px] text-[var(--vly-text-muted)]">{projects.length} no total</p>
          </Link>}

          {preferences.dashboard.metricTasks && <Link
            href="/projects"
            aria-label={`Ver ${pendingTasks.length} tarefas pendentes nos projetos`}
            className="group clip-corner-sm rounded-xl border border-[var(--vly-border-default)] bg-[var(--vly-surface)] p-4 transition-all hover:border-[var(--vly-warning)]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vly-warning)]"
          >
            <div className="flex items-center justify-between text-xs text-[var(--vly-text-primary)]">
              <span>Tarefas Pendentes</span>
              <CheckSquare size={16} className="text-[var(--vly-warning)] transition-transform group-hover:scale-110" />
            </div>
            <p className="mt-1 text-2xl font-bold text-[var(--vly-warning)]">{pendingTasks.length}</p>
            <p className="mt-0.5 text-[10px] text-[var(--vly-text-muted)]">{urgentTasks.length} urgentes / altas</p>
          </Link>}

          {preferences.dashboard.metricCompleted && <Link
            href="/modules/activity"
            aria-label={`Ver histórico de ${completedTasks.length} tarefas concluídas e audit trail`}
            className="group clip-corner-sm rounded-xl border border-[var(--vly-border-default)] bg-[var(--vly-surface)] p-4 transition-all hover:border-[var(--vly-success)]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vly-success)]"
          >
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Concluídas</span>
              <Zap size={16} className="text-[var(--vly-success)] transition-transform group-hover:scale-110" />
            </div>
            <p className="mt-1 text-2xl font-bold text-[var(--vly-success)]">{completedTasks.length}</p>
            <p className="mt-0.5 text-[10px] text-[var(--vly-text-muted)]">Histórico registrado</p>
          </Link>}

          {preferences.dashboard.metricVault && <Link
            href="/modules/vault"
            aria-label={`Acessar ${notes.length} notas e acervo de conhecimento do Vault`}
            className="group clip-corner-sm rounded-xl border border-[var(--vly-border-default)] bg-[var(--vly-surface)] p-4 transition-all hover:border-[var(--vly-info)]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vly-info)]"
          >
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Notas & Vault</span>
              <FileText size={16} className="text-[var(--vly-info)] transition-transform group-hover:scale-110" />
            </div>
            <p className="mt-1 text-2xl font-bold text-[var(--vly-info)]">{notes.length}</p>
            <p className="mt-0.5 text-[10px] text-[var(--vly-text-muted)]">Fichamentos salvos</p>
          </Link>}
        </div>}

        {/* Main Cockpit Layout: 2 Columns */}
        {(preferences.dashboard.priorityTasks || preferences.dashboard.deadlines || preferences.dashboard.activeProjects || preferences.dashboard.clock || preferences.dashboard.focusTimer || preferences.dashboard.scratchpad || preferences.dashboard.activity) && <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column (7 cols): Tasks, Deadlines, Active Projects */}
          <div className="lg:col-span-7 space-y-6">
            {preferences.dashboard.priorityTasks && <>
            {/* Priority Tasks Widget */}
            <div className="p-5 rounded-2xl bg-[var(--vly-surface)] border border-[var(--vly-border-default)] space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--vly-text-primary)]">
                  <Flame size={15} className="text-[var(--vly-danger)]" />
                  <span>Tarefas Prioritárias do Dia</span>
                </div>
                <button
                  onClick={() => handleOpenQuickCreate("task")}
                  className="text-xs font-semibold text-[var(--vly-accent)] hover:opacity-80"
                >
                  + Adicionar
                </button>
              </div>

              <div className="space-y-2">
                {pendingTasks.length === 0 ? (
                  <StatePanel tone="success" title="Tudo em dia" description="Nenhuma tarefa pendente no momento." />
                ) : (
                  pendingTasks.slice(0, 5).map((task) => {
                    const linkedProj = projects.find((p) => p.id === task.projectId);
                    return (
                      <div
                        key={task.id}
                        className="group flex items-center justify-between gap-3 rounded-xl border border-[var(--vly-border-default)] bg-[var(--vly-surface-raised)] p-3 transition-all hover:border-[var(--vly-accent)]/40"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <button
                            onClick={() => toggleTask(task.id)}
                            className="shrink-0 text-[var(--vly-accent)] transition-colors hover:opacity-80"
                            title="Concluir tarefa"
                          >
                            <Square size={16} />
                          </button>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-medium text-[var(--vly-text-primary)]">
                              {task.title}
                            </p>
                            {linkedProj && (
                              <Link
                                href={`/projects/${linkedProj.id}`}
                                className="mt-0.5 block truncate text-[10px] text-[var(--vly-accent)] hover:underline"
                              >
                                {linkedProj.title}
                              </Link>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span
                            className={cn(
                              "text-[10px] px-2 py-0.5 rounded border uppercase font-medium",
                              task.priority === "urgente" && "text-[var(--vly-danger)] border-[var(--vly-danger)]/30 bg-[var(--vly-danger)]/10",
                              task.priority === "alta" && "text-[var(--vly-warning)] border-[var(--vly-warning)]/30 bg-[var(--vly-warning)]/10",
                              task.priority === "media" && "text-[var(--vly-info)] border-[var(--vly-info)]/30 bg-[var(--vly-info)]/10",
                              task.priority === "baixa" && "text-[var(--vly-text-muted)] border-[var(--vly-border-subtle)] bg-[var(--vly-surface-raised)]"
                            )}
                          >
                            {task.priority}
                          </span>
                          {task.dueDate && (
                            <span className="hidden text-[10px] font-mono text-[var(--vly-text-secondary)] sm:inline">
                              {task.dueDate}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            </>}
            {preferences.dashboard.deadlines && <>
            {/* Upcoming Deadlines (Chronos Peek) */}
            <div className="p-5 rounded-2xl bg-[var(--vly-surface)] border border-[var(--vly-border-default)] space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--vly-text-primary)]">
                  <Calendar size={15} className="text-[var(--vly-accent)]" />
                  <span>Prazos & Deadlines Próximos</span>
                </div>
                <Link href="/modules/chronos" className="text-xs text-[var(--vly-accent)] hover:opacity-80">
                  Chronos →
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {upcomingDeadlines.map((proj) => (
                  <Link
                    key={proj.id}
                    href={`/projects/${proj.id}`}
                    className="flex flex-col justify-between rounded-xl border border-[var(--vly-border-default)] bg-[var(--vly-surface-raised)] p-3.5 transition-all hover:border-[var(--vly-info)]/40"
                  >
                    <div className="space-y-1">
                      <span className="rounded border border-[var(--vly-info)]/20 bg-[var(--vly-info)]/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-[var(--vly-info)]">
                        {proj.category}
                      </span>
                      <h4 className="mt-1 truncate text-xs font-bold text-[var(--vly-text-primary)]">{proj.title}</h4>
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-[var(--vly-border-default)] pt-2 text-[11px] text-[var(--vly-text-secondary)]">
                      <span className="flex items-center gap-1 font-mono text-[var(--vly-text-secondary)]">
                        <Clock size={11} className="text-[var(--vly-accent)]" />
                        {proj.deadline}
                      </span>
                      <span className="font-semibold text-[var(--vly-accent)]">{proj.progress || 0}%</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            </>}
            {preferences.dashboard.activeProjects && <>
            {/* Active Projects Grid */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-200 uppercase tracking-wider">
                  <FolderKanban size={15} className="text-cyan-400" />
                  <span>Workspaces em Andamento</span>
                </div>
                <Link href="/projects" className="text-xs text-cyan-400 hover:text-cyan-300">
                  Ver todos ({projects.length}) →
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {activeProjects.slice(0, 2).map((proj) => {
                  const projTasks = tasks.filter((t) => t.projectId === proj.id);
                  const done = projTasks.filter((t) => t.status === "concluida");
                  return (
                    <Link
                      key={proj.id}
                      href={`/projects/${proj.id}`}
                      className="p-4 rounded-xl bg-[var(--vly-surface)] border border-[var(--vly-border-default)] hover:border-violet-500/40 transition-all flex flex-col justify-between group"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] px-2 py-0.5 rounded bg-violet-500/10 text-violet-400 font-semibold uppercase">
                            {proj.category}
                          </span>
                          <span className="text-[10px] text-slate-500">{projTasks.length} {projTasks.length === 1 ? "tarefa" : "tarefas"}</span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-100 group-hover:text-violet-300 transition-colors truncate">
                          {proj.title}
                        </h4>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                          {proj.description}
                        </p>
                      </div>

                      <div className="mt-4 pt-2 border-t border-[var(--vly-border-default)] flex items-center justify-between text-xs text-violet-400 font-medium">
                        <span>Acessar Workspace</span>
                        <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div></>}
          </div>

          {/* Right Column (5 cols): Clock, Pomodoro, Scratchpad, Audit Log */}
          <div className="lg:col-span-5 space-y-6">
            {preferences.dashboard.clock && <ClockWidget />}
            {preferences.dashboard.focusTimer && <FocusTimerWidget />}
            {preferences.dashboard.scratchpad && <ScratchpadWidget />}

            {preferences.dashboard.activity && <>
            {/* Live Activity Feed */}
            <div className="p-5 rounded-2xl bg-[var(--vly-surface)] border border-[var(--vly-border-default)] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--vly-text-primary)]">
                  <ActivityIcon size={14} className="text-[var(--vly-accent)]" />
                  <span>Histórico de Atividade</span>
                </div>
                <span className="text-[10px] text-[var(--vly-text-muted)]">Tempo real</span>
              </div>

              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {activities.slice(0, 6).map((act) => (
                  <div key={act.id} className="flex items-start gap-2.5 text-xs text-[var(--vly-text-secondary)]">
                    <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--vly-accent)]" />
                    <div className="min-w-0">
                      <p className="truncate text-xs">
                        <span className="font-semibold text-[var(--vly-text-secondary)]">{act.user || "Paulo"}</span>{" "}
                        <span className="text-[var(--vly-accent)]">{act.action}</span>{" "}
                        <span className="font-medium text-[var(--vly-text-primary)]">{act.entityTitle}</span>
                      </p>
                      <p className="text-[10px] text-[var(--vly-text-muted)]">
                        {new Date(act.createdAt || act.timestamp || Date.now()).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div></>}
          </div>
        </div>}

        {/* Ecosystem Módulos & Apps Grid */}
        {preferences.dashboard.modules && <div className="space-y-4 pt-4 border-t border-[var(--vly-border-default)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers size={16} className="text-[var(--vly-accent)]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--vly-text-primary)]">
                Ecossistema de Módulos VARYNTH (3 Camadas)
              </h3>
            </div>
            <Link href="/modules" className="text-xs text-[var(--vly-accent)] hover:opacity-80">
              Ver catálogo completo →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {modules.slice(0, 4).map((mod) => (
              <AppCard key={mod.id} module={mod} />
            ))}
          </div>
        </div>}
      </div>
    </PageLayout>
  );
}
