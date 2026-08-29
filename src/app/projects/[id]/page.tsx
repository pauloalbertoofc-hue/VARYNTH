"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageLayout } from "@/components/layout/PageLayout";
import { useVarynthStore } from "@/lib/store/useVarynthStore";
import { ProjectStatus, PriorityLevel } from "@/lib/types";
import { ProjectTasksTab } from "@/components/projects/ProjectTasksTab";
import { ProjectNotesTab } from "@/components/projects/ProjectNotesTab";
import { ProjectFilesTab } from "@/components/projects/ProjectFilesTab";
import { ProjectReferencesTab } from "@/components/projects/ProjectReferencesTab";
import { ProjectTimelineTab } from "@/components/projects/ProjectTimelineTab";
import { ProjectAthenaTab } from "@/components/projects/ProjectAthenaTab";
import {
  FolderKanban,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Flame,
  Tag,
  Users,
  CheckSquare,
  FileText,
  File,
  Link2,
  Bot,
  Trash2,
  Archive,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ProjectTab =
  | "visao_geral"
  | "tarefas"
  | "notas"
  | "arquivos"
  | "referencias"
  | "timeline"
  | "athena";

interface ProjectDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const unwrappedParams = use(params);
  const projectId = unwrappedParams.id;
  const router = useRouter();

  const { projects, tasks, notes, references, timelineEvents, updateProject, deleteProject } =
    useVarynthStore();

  const [activeTab, setActiveTab] = useState<ProjectTab>("visao_geral");

  const project = projects.find((p) => p.id === projectId);

  if (!project) {
    return (
      <PageLayout title="Projeto não encontrado">
        <div className="py-24 text-center space-y-4 max-w-md mx-auto">
          <FolderKanban size={40} className="mx-auto text-slate-600" />
          <h2 className="text-lg font-bold text-white">Projeto não localizado</h2>
          <p className="text-xs text-slate-400">
            O projeto solicitado não existe ou foi removido.
          </p>
          <Link
            href="/projects"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-600 text-xs font-semibold text-white"
          >
            <ArrowLeft size={14} />
            <span>Voltar para Projetos</span>
          </Link>
        </div>
      </PageLayout>
    );
  }

  const projectTasks = tasks.filter((t) => t.projectId === project.id);
  const completedTasks = projectTasks.filter((t) => t.status === "concluida");
  const progressPercent =
    projectTasks.length > 0
      ? Math.round((completedTasks.length / projectTasks.length) * 100)
      : (project.progress ?? 0);

  const handleStatusChange = (newStatus: ProjectStatus) => {
    updateProject(project.id, { status: newStatus });
  };

  const handlePriorityChange = (newPriority: PriorityLevel) => {
    updateProject(project.id, { priority: newPriority });
  };

  const handleDelete = () => {
    if (window.confirm(`Deseja realmente excluir o projeto "${project.title}"?`)) {
      deleteProject(project.id);
      router.push("/projects");
    }
  };

  const tabsConfig = [
    { id: "visao_geral", label: "Visão Geral", icon: BarChart3 },
    { id: "tarefas", label: `Tarefas (${projectTasks.length})`, icon: CheckSquare },
    { id: "notas", label: `Notas (${notes.filter((n) => n.projectId === project.id).length})`, icon: FileText },
    { id: "arquivos", label: "Arquivos", icon: File },
    { id: "referencias", label: `Referências (${references.filter((r) => r.projectId === project.id).length})`, icon: Link2 },
    { id: "timeline", label: `Timeline (${timelineEvents.filter((t) => t.projectId === project.id).length})`, icon: Clock },
    { id: "athena", label: "Athena AI", icon: Bot, highlight: true },
  ];

  return (
    <PageLayout title={project.title} subtitle={`Workspace · ${project.category.toUpperCase()}`}>
      <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
        {/* Back Link */}
        <div>
          <Link
            href="/projects"
            className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft size={13} />
            <span>Voltar para todos os projetos</span>
          </Link>
        </div>

        {/* Project Header Card */}
        <div className="p-6 rounded-2xl bg-[#0f0f1a] border border-[#1e1e30] clip-corner relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-4">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/30 font-bold uppercase tracking-wider">
                    {project.category}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    ID: {project.id}
                  </span>
                </div>

                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {project.title}
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
                  {project.description}
                </p>
              </div>

              {/* Status & Priority Selectors */}
              <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
                <div className="flex items-center gap-1.5 bg-[#14141f] px-2.5 py-1.5 rounded-lg border border-[#1e1e30]">
                  <span className="text-[11px] text-slate-400">Status:</span>
                  <select
                    value={project.status}
                    onChange={(e) => handleStatusChange(e.target.value as ProjectStatus)}
                    className="bg-transparent text-xs font-semibold text-slate-200 focus:outline-none cursor-pointer"
                  >
                    <option value="planejamento">Planejamento</option>
                    <option value="ativo">Ativo</option>
                    <option value="em_espera">Em Espera</option>
                    <option value="concluido">Concluído</option>
                    <option value="arquivado">Arquivado</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5 bg-[#14141f] px-2.5 py-1.5 rounded-lg border border-[#1e1e30]">
                  <span className="text-[11px] text-slate-400">Prioridade:</span>
                  <select
                    value={project.priority}
                    onChange={(e) => handlePriorityChange(e.target.value as PriorityLevel)}
                    className="bg-transparent text-xs font-semibold text-slate-200 focus:outline-none cursor-pointer"
                  >
                    <option value="baixa">Baixa</option>
                    <option value="media">Média</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente 🔥</option>
                  </select>
                </div>

                <button
                  onClick={handleDelete}
                  className="p-2 rounded-lg bg-[#14141f] border border-[#1e1e30] text-slate-400 hover:text-red-400 hover:border-red-500/30 transition-all"
                  title="Excluir projeto"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* Meta bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-[#1e1e30] text-xs">
              <div>
                <span className="text-[11px] text-slate-500 block mb-1">Progresso das Tarefas</span>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-[#14141f] h-2 rounded-full overflow-hidden border border-[#1e1e30]">
                    <div
                      className="h-full bg-gradient-to-r from-violet-600 to-cyan-400 transition-all"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <span className="font-mono text-slate-300 text-xs font-bold">
                    {progressPercent}%
                  </span>
                </div>
              </div>

              {project.deadline && (
                <div>
                  <span className="text-[11px] text-slate-500 block mb-1">Prazo Final</span>
                  <div className="flex items-center gap-1.5 text-slate-300 font-mono">
                    <Calendar size={13} className="text-violet-400" />
                    <span>{project.deadline}</span>
                  </div>
                </div>
              )}

              <div>
                <span className="text-[11px] text-slate-500 block mb-1">Tags</span>
                <div className="flex items-center gap-1 flex-wrap">
                  {project.tags.map((tag) => (
                    <span key={tag} className="text-[10px] px-2 py-0.5 rounded bg-[#14141f] text-slate-400 border border-[#1e1e30]">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="flex items-center gap-1.5 border-b border-[#1e1e30] overflow-x-auto pb-1">
          {tabsConfig.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ProjectTab)}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150",
                  isActive
                    ? "bg-violet-600/25 text-violet-300 border border-violet-500/40 shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5",
                  tab.highlight && !isActive && "text-violet-400 border border-violet-500/20 bg-violet-500/5"
                )}
              >
                <Icon size={14} className={isActive ? "text-violet-400" : ""} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="pt-2">
          {activeTab === "visao_geral" && (
            <div className="space-y-6">
              {/* Quick Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-xl bg-[#0f0f1a] border border-[#1e1e30]">
                  <p className="text-[11px] text-slate-500">Tarefas Pendentes</p>
                  <p className="text-2xl font-bold text-amber-400 mt-1">
                    {projectTasks.filter((t) => t.status !== "concluida").length}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-[#0f0f1a] border border-[#1e1e30]">
                  <p className="text-[11px] text-slate-500">Tarefas Concluídas</p>
                  <p className="text-2xl font-bold text-emerald-400 mt-1">{completedTasks.length}</p>
                </div>
                <div className="p-4 rounded-xl bg-[#0f0f1a] border border-[#1e1e30]">
                  <p className="text-[11px] text-slate-500">Notas Registradas</p>
                  <p className="text-2xl font-bold text-violet-400 mt-1">
                    {notes.filter((n) => n.projectId === project.id).length}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-[#0f0f1a] border border-[#1e1e30]">
                  <p className="text-[11px] text-slate-500">Fontes / Referências</p>
                  <p className="text-2xl font-bold text-cyan-400 mt-1">
                    {references.filter((r) => r.projectId === project.id).length}
                  </p>
                </div>
              </div>

              {/* 2-column details */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                  <div className="p-5 rounded-xl bg-[#0f0f1a] border border-[#1e1e30] space-y-3">
                    <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                      Resumo Operacional
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed whitespace-pre-wrap">
                      {project.description}
                    </p>
                  </div>

                  {/* Tasks Quick Peek */}
                  <div className="p-5 rounded-xl bg-[#0f0f1a] border border-[#1e1e30] space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                        Próximas Tarefas
                      </h3>
                      <button
                        onClick={() => setActiveTab("tarefas")}
                        className="text-xs text-violet-400 hover:text-violet-300"
                      >
                        Ver todas →
                      </button>
                    </div>

                    <div className="space-y-2">
                      {projectTasks.slice(0, 3).map((task) => (
                        <div
                          key={task.id}
                          className="flex items-center justify-between p-2.5 rounded-lg bg-[#14141f] border border-[#1e1e30] text-xs"
                        >
                          <span className="text-slate-200 truncate">{task.title}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-violet-500/10 text-violet-400 uppercase">
                            {task.priority}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Team & Context */}
                <div className="space-y-4">
                  <div className="p-5 rounded-xl bg-[#0f0f1a] border border-[#1e1e30] space-y-3">
                    <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                      <Users size={14} className="text-violet-400" />
                      <span>Colaboradores</span>
                    </h3>
                    <div className="space-y-2">
                      {(project.collaborators && project.collaborators.length > 0
                        ? project.collaborators
                        : ["Paulo (Dono)"]
                      ).map((member) => (
                        <div
                          key={member}
                          className="flex items-center gap-2.5 p-2 rounded-lg bg-[#14141f] text-xs text-slate-300"
                        >
                          <div className="w-6 h-6 rounded-full bg-violet-600/30 flex items-center justify-center text-[10px] font-bold text-violet-300">
                            {member[0]}
                          </div>
                          <span>{member}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-5 rounded-xl bg-[#0f0f1a] border border-[#1e1e30] space-y-3">
                    <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                      <Bot size={14} className="text-violet-400" />
                      <span>Athena Copilot</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Use a aba da Athena para gerar ideias, analisar tarefas ou resumir o estado deste projeto.
                    </p>
                    <button
                      onClick={() => setActiveTab("athena")}
                      className="w-full py-2 rounded-lg bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/30 text-xs font-semibold transition-colors"
                    >
                      Abrir Assistente no Projeto →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "tarefas" && <ProjectTasksTab projectId={project.id} />}
          {activeTab === "notas" && <ProjectNotesTab projectId={project.id} />}
          {activeTab === "arquivos" && <ProjectFilesTab projectId={project.id} />}
          {activeTab === "referencias" && <ProjectReferencesTab projectId={project.id} />}
          {activeTab === "timeline" && <ProjectTimelineTab projectId={project.id} />}
          {activeTab === "athena" && <ProjectAthenaTab project={project} />}
        </div>
      </div>
    </PageLayout>
  );
}

