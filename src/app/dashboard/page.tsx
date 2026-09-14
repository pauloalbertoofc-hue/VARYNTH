"use client";

import Link from "next/link";
import { PageLayout } from "@/components/layout/PageLayout";
import { AppCard } from "@/components/ui/AppCard";
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
  const { projects, tasks, notes, activities, toggleTask, isLoaded } = useVarynthStore();
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
        <div className="relative rounded-2xl border border-[#1e1e30] bg-gradient-to-br from-violet-950/40 via-[#0f0f1a] to-cyan-950/20 p-6 sm:p-8 overflow-hidden clip-corner">
          <div className="absolute top-0 right-0 w-96 h-96 bg-violet-600/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-32 w-48 h-48 bg-cyan-600/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-semibold uppercase tracking-widest">
                <Sparkles size={12} />
                <span>{preferences.appName} OS · Universo Digital Pessoal</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white text-glow-accent tracking-tight">
                {greeting}, {preferences.displayName}.
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 max-w-xl leading-relaxed">
                Central de controle ativa. Você tem{" "}
                <span className="text-violet-300 font-semibold">{pendingTasks.length} {pendingTasks.length === 1 ? "tarefa pendente" : "tarefas pendentes"}</span>{" "}
                ({urgentTasks.length} {urgentTasks.length === 1 ? "prioritária" : "prioritárias"}) distribuídas em{" "}
                <span className="text-cyan-300 font-semibold">{activeProjects.length} {activeProjects.length === 1 ? "projeto ativo" : "projetos ativos"}</span>.
              </p>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => handleOpenQuickCreate("task")}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-violet-600 hover:bg-violet-500 text-white glow-accent transition-all duration-200"
              >
                <Plus size={14} />
                <span>+ Nova Tarefa</span>
              </button>

              <button
                onClick={() => handleOpenQuickCreate("note")}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#14141f] hover:bg-[#1a1a2e] text-slate-200 border border-[#1e1e30] hover:border-violet-500/40 transition-all"
              >
                <FileText size={14} className="text-violet-400" />
                <span>+ Nova Nota</span>
              </button>

              <button
                onClick={() => handleOpenQuickCreate("project")}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#14141f] hover:bg-[#1a1a2e] text-slate-200 border border-[#1e1e30] hover:border-cyan-500/40 transition-all"
              >
                <FolderKanban size={14} className="text-cyan-400" />
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
            className="p-4 rounded-xl bg-[#0f0f1a] border border-[#1e1e30] clip-corner-sm hover:border-violet-500/40 transition-all group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
          >
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Projetos Ativos</span>
              <FolderKanban size={16} className="text-violet-400 group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-2xl font-bold text-white mt-1">{activeProjects.length}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{projects.length} no total</p>
          </Link>}

          {preferences.dashboard.metricTasks && <Link
            href="/projects"
            aria-label={`Ver ${pendingTasks.length} tarefas pendentes nos projetos`}
            className="p-4 rounded-xl bg-[#0f0f1a] border border-[#1e1e30] clip-corner-sm hover:border-amber-500/40 transition-all group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Tarefas Pendentes</span>
              <CheckSquare size={16} className="text-amber-400 group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-2xl font-bold text-amber-400 mt-1">{pendingTasks.length}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{urgentTasks.length} urgentes / altas</p>
          </Link>}

          {preferences.dashboard.metricCompleted && <Link
            href="/modules/activity"
            aria-label={`Ver histórico de ${completedTasks.length} tarefas concluídas e audit trail`}
            className="p-4 rounded-xl bg-[#0f0f1a] border border-[#1e1e30] clip-corner-sm hover:border-emerald-500/40 transition-all group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Concluídas</span>
              <Zap size={16} className="text-emerald-400 group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-2xl font-bold text-emerald-400 mt-1">{completedTasks.length}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Histórico registrado</p>
          </Link>}

          {preferences.dashboard.metricVault && <Link
            href="/modules/vault"
            aria-label={`Acessar ${notes.length} notas e acervo de conhecimento do Vault`}
            className="p-4 rounded-xl bg-[#0f0f1a] border border-[#1e1e30] clip-corner-sm hover:border-cyan-500/40 transition-all group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
          >
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Notas & Vault</span>
              <FileText size={16} className="text-cyan-400 group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-2xl font-bold text-cyan-400 mt-1">{notes.length}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Fichamentos salvos</p>
          </Link>}
        </div>}

        {/* Main Cockpit Layout: 2 Columns */}
        {(preferences.dashboard.priorityTasks || preferences.dashboard.deadlines || preferences.dashboard.activeProjects || preferences.dashboard.clock || preferences.dashboard.focusTimer || preferences.dashboard.scratchpad || preferences.dashboard.activity) && <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column (7 cols): Tasks, Deadlines, Active Projects */}
          <div className="lg:col-span-7 space-y-6">
            {preferences.dashboard.priorityTasks && <>
            {/* Priority Tasks Widget */}
            <div className="p-5 rounded-2xl bg-[#0f0f1a] border border-[#1e1e30] space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-200 uppercase tracking-wider">
                  <Flame size={15} className="text-red-400" />
                  <span>Tarefas Prioritárias do Dia</span>
                </div>
                <button
                  onClick={() => handleOpenQuickCreate("task")}
                  className="text-xs text-violet-400 hover:text-violet-300 font-semibold"
                >
                  + Adicionar
                </button>
              </div>

              <div className="space-y-2">
                {pendingTasks.length === 0 ? (
                  <p className="text-xs text-slate-500 py-6 text-center">
                    Tudo em dia! Nenhuma tarefa pendente no momento.
                  </p>
                ) : (
                  pendingTasks.slice(0, 5).map((task) => {
                    const linkedProj = projects.find((p) => p.id === task.projectId);
                    return (
                      <div
                        key={task.id}
                        className="group flex items-center justify-between gap-3 p-3 rounded-xl bg-[#14141f] border border-[#1e1e30] hover:border-violet-500/40 transition-all"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <button
                            onClick={() => toggleTask(task.id)}
                            className="text-violet-400 hover:text-violet-300 transition-colors flex-shrink-0"
                            title="Concluir tarefa"
                          >
                            <Square size={16} />
                          </button>
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-slate-200 truncate">
                              {task.title}
                            </p>
                            {linkedProj && (
                              <Link
                                href={`/projects/${linkedProj.id}`}
                                className="text-[10px] text-violet-400 hover:underline block truncate mt-0.5"
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
                              task.priority === "urgente" && "text-red-400 border-red-500/30 bg-red-500/10",
                              task.priority === "alta" && "text-amber-400 border-amber-500/30 bg-amber-500/10",
                              task.priority === "media" && "text-blue-400 border-blue-500/30 bg-blue-500/10",
                              task.priority === "baixa" && "text-slate-400 border-slate-700 bg-slate-800/30"
                            )}
                          >
                            {task.priority}
                          </span>
                          {task.dueDate && (
                            <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
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
            <div className="p-5 rounded-2xl bg-[#0f0f1a] border border-[#1e1e30] space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-200 uppercase tracking-wider">
                  <Calendar size={15} className="text-violet-400" />
                  <span>Prazos & Deadlines Próximos</span>
                </div>
                <Link href="/modules/chronos" className="text-xs text-violet-400 hover:text-violet-300">
                  Chronos →
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {upcomingDeadlines.map((proj) => (
                  <Link
                    key={proj.id}
                    href={`/projects/${proj.id}`}
                    className="p-3.5 rounded-xl bg-[#14141f] border border-[#1e1e30] hover:border-cyan-500/40 transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-1">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-semibold uppercase">
                        {proj.category}
                      </span>
                      <h4 className="text-xs font-bold text-slate-200 truncate mt-1">{proj.title}</h4>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-3 pt-2 border-t border-[#1e1e30]">
                      <span className="flex items-center gap-1 font-mono text-slate-300">
                        <Clock size={11} className="text-violet-400" />
                        {proj.deadline}
                      </span>
                      <span className="text-violet-400 font-semibold">{proj.progress || 0}%</span>
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
                      className="p-4 rounded-xl bg-[#0f0f1a] border border-[#1e1e30] hover:border-violet-500/40 transition-all flex flex-col justify-between group"
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

                      <div className="mt-4 pt-2 border-t border-[#1e1e30] flex items-center justify-between text-xs text-violet-400 font-medium">
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
            <div className="p-5 rounded-2xl bg-[#0f0f1a] border border-[#1e1e30] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-200 uppercase tracking-wider">
                  <ActivityIcon size={14} className="text-violet-400" />
                  <span>Histórico de Atividade</span>
                </div>
                <span className="text-[10px] text-slate-500">Tempo real</span>
              </div>

              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {activities.slice(0, 6).map((act) => (
                  <div key={act.id} className="flex items-start gap-2.5 text-xs text-slate-300">
                    <div className="w-1.5 h-1.5 rounded-full bg-violet-400 mt-1.5 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="truncate text-xs">
                        <span className="text-slate-400 font-semibold">{act.user || "Paulo"}</span>{" "}
                        <span className="text-violet-300">{act.action}</span>{" "}
                        <span className="text-slate-200 font-medium">{act.entityTitle}</span>
                      </p>
                      <p className="text-[10px] text-slate-500">
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
        {preferences.dashboard.modules && <div className="space-y-4 pt-4 border-t border-[#1e1e30]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers size={16} className="text-violet-400" />
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Ecossistema de Módulos VARYNTH (3 Camadas)
              </h3>
            </div>
            <Link href="/modules" className="text-xs text-violet-400 hover:text-violet-300">
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
