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
import { ConfirmDeleteModal } from "@/components/ui/ConfirmDeleteModal";
import { Surface } from "@/components/ui/Surface";
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
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const project = projects.find((p) => p.id === projectId);

  if (!project) {
    return (
      <PageLayout title="Projeto não encontrado">
        <div className="py-24 text-center space-y-4 max-w-md mx-auto">
          <FolderKanban size={40} className="mx-auto text-[var(--vly-text-muted)]" />
          <h2 className="text-lg font-bold text-[var(--vly-text-primary)]">Projeto não localizado</h2>
          <p className="text-xs text-[var(--vly-text-secondary)]">
            O projeto solicitado não existe ou foi removido.
          </p>
          <Link
            href="/projects"
            className="vly-interactive inline-flex items-center gap-1.5 rounded-lg border border-[var(--vly-border-accent)] bg-[var(--vly-accent)] px-4 py-2 text-xs font-semibold text-[var(--vly-text-on-accent)]"
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

  const handleConfirmDelete = () => {
    deleteProject(project.id);
    router.push("/projects");
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
          <Surface tone="panel" className="relative overflow-hidden p-6">
          <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-[var(--vly-accent-soft)] blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-4">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="rounded-full border border-[var(--vly-border-accent)] bg-[var(--vly-accent-soft)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--vly-accent)]">
                    {project.category}
                  </span>
                  <span className="font-mono text-[10px] text-[var(--vly-text-muted)]">
                    ID: {project.id}
                  </span>
                </div>

                <h1 className="text-xl font-black tracking-tight text-[var(--vly-text-primary)] sm:text-2xl">
                  {project.title}
                </h1>
                <p className="max-w-2xl text-xs leading-relaxed text-[var(--vly-text-secondary)] sm:text-sm">
                  {project.description}
                </p>
              </div>

              {/* Status & Priority Selectors */}
              <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
                <div className="flex items-center gap-1.5 rounded-lg border border-[var(--vly-border-default)] bg-[var(--vly-surface-raised)] px-2.5 py-1.5">
                  <span className="text-[11px] text-[var(--vly-text-secondary)]">Status:</span>
                  <select
                    aria-label="Status do projeto"
                    value={project.status}
                    onChange={(e) => handleStatusChange(e.target.value as ProjectStatus)}
                    className="vly-field min-h-0 border-0 bg-transparent px-0 py-0 text-xs font-semibold"
                  >
                    <option value="planejamento">Planejamento</option>
                    <option value="ativo">Ativo</option>
                    <option value="em_espera">Em Espera</option>
                    <option value="concluido">Concluído</option>
                    <option value="arquivado">Arquivado</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5 rounded-lg border border-[var(--vly-border-default)] bg-[var(--vly-surface-raised)] px-2.5 py-1.5">
                  <span className="text-[11px] text-[var(--vly-text-secondary)]">Prioridade:</span>
                  <select
                    aria-label="Prioridade do projeto"
                    value={project.priority}
                    onChange={(e) => updateProject(project.id, { priority: e.target.value as PriorityLevel })}
                    className="vly-field min-h-0 border-0 bg-transparent px-0 py-0 text-xs font-semibold"
                  >
                    <option value="baixa">Baixa</option>
                    <option value="media">Média</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente 🔥</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5 rounded-lg border border-[var(--vly-border-default)] bg-[var(--vly-surface-raised)] px-2.5 py-1.5">
                  <Calendar size={13} className="text-[var(--vly-accent)]" />
                  <label htmlFor="project-deadline" className="text-[11px] text-[var(--vly-text-secondary)]">Prazo:</label>
                  <input
                    id="project-deadline"
                    type="date"
                    value={project.deadline || ""}
                    onInput={(e) => {
                      const value = (e.currentTarget as HTMLInputElement).value;
                      updateProject(project.id, { deadline: value || undefined });
                    }}
                    className="vly-field min-h-0 border-0 bg-transparent px-0 py-0 text-xs font-semibold"
                  />
                </div>

                <button
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="vly-interactive rounded-lg border border-[var(--vly-border-default)] bg-[var(--vly-surface-raised)] p-2 text-[var(--vly-text-secondary)] hover:text-[var(--vly-danger)]"
                  title="Mover projeto para a Lixeira (10 dias)"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* Modal de Confirmação de Exclusão */}
            <ConfirmDeleteModal
              isOpen={isDeleteModalOpen}
              onClose={() => setIsDeleteModalOpen(false)}
              onConfirm={handleConfirmDelete}
              itemTitle={project.title}
              itemType="Projeto"
            />

            {/* Meta bar */}
            <div className="grid grid-cols-1 gap-4 border-t border-[var(--vly-border-default)] pt-3 text-xs sm:grid-cols-3">
              <div>
                <span className="mb-1 block text-[11px] text-[var(--vly-text-muted)]">Progresso das Tarefas</span>
                <div className="flex items-center gap-2">
                  <div className="h-2 flex-1 overflow-hidden rounded-full border border-[var(--vly-border-default)] bg-[var(--vly-surface-raised)]">
                    <div
                      className="h-full bg-[var(--vly-accent)] transition-all"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <span className="font-mono text-xs font-bold text-[var(--vly-text-primary)]">
                    {progressPercent}%
                  </span>
                </div>
              </div>

              {project.deadline && (
                <div>
                  <span className="mb-1 block text-[11px] text-[var(--vly-text-muted)]">Prazo Final</span>
                  <div className="flex items-center gap-1.5 font-mono text-[var(--vly-text-primary)]">
                    <Calendar size={13} className="text-[var(--vly-accent)]" />
                    <span>{project.deadline}</span>
                  </div>
                </div>
              )}

              <div>
                <span className="mb-1 block text-[11px] text-[var(--vly-text-muted)]">Tags</span>
                <div className="flex items-center gap-1 flex-wrap">
                  {project.tags.map((tag) => (
                    <span key={tag} className="rounded border border-[var(--vly-border-default)] bg-[var(--vly-surface-raised)] px-2 py-0.5 text-[10px] text-[var(--vly-text-secondary)]">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
          </Surface>

        {/* Tabs Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto border-b border-[var(--vly-border-default)] pb-1">
          {tabsConfig.map((tab) => {
            const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ProjectTab)}
                className={cn(
                  "vly-interactive flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold whitespace-nowrap",
                  isActive
                    ? "border border-[var(--vly-border-accent)] bg-[var(--vly-surface-active)] text-[var(--vly-accent)] shadow-sm"
                    : "text-[var(--vly-text-secondary)] hover:bg-[var(--vly-surface-hover)] hover:text-[var(--vly-text-primary)]",
                  tab.highlight && !isActive && "text-[var(--vly-accent)] border border-[var(--vly-accent)]/20 bg-[var(--vly-accent)]/5"
                )}
              >
                <Icon size={14} className={isActive ? "text-[var(--vly-accent)]" : ""} />
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
                  <Surface tone="panel" className="rounded-xl p-4">
                  <p className="text-[11px] text-[var(--vly-text-muted)]">Tarefas Pendentes</p>
                  <p className="mt-1 text-2xl font-bold text-[var(--vly-warning)]">
                    {projectTasks.filter((t) => t.status !== "concluida").length}
                  </p>
                </Surface>
                <Surface tone="panel" className="rounded-xl p-4">
                  <p className="text-[11px] text-[var(--vly-text-muted)]">Tarefas Concluídas</p>
                  <p className="mt-1 text-2xl font-bold text-[var(--vly-success)]">{completedTasks.length}</p>
                </Surface>
                <Surface tone="panel" className="rounded-xl p-4">
                  <p className="text-[11px] text-[var(--vly-text-muted)]">Notas Registradas</p>
                  <p className="mt-1 text-2xl font-bold text-[var(--vly-accent)]">
                    {notes.filter((n) => n.projectId === project.id).length}
                  </p>
                </Surface>
                <Surface tone="panel" className="rounded-xl p-4">
                  <p className="text-[11px] text-[var(--vly-text-muted)]">Fontes / Referências</p>
                  <p className="mt-1 text-2xl font-bold text-[var(--vly-info)]">
                    {references.filter((r) => r.projectId === project.id).length}
                  </p>
                </Surface>
              </div>

              {/* 2-column details */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                  <div className="space-y-3 rounded-xl border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-raised)] p-5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--vly-text-primary)]">
                      Resumo Operacional
                    </h3>
                    <p className="whitespace-pre-wrap text-xs leading-relaxed text-[var(--vly-text-secondary)]">
                      {project.description}
                    </p>
                  </div>

                  {/* Tasks Quick Peek */}
                  <div className="space-y-3 rounded-xl border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-raised)] p-5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--vly-text-primary)]">
                        Próximas Tarefas
                      </h3>
                      <button
                        onClick={() => setActiveTab("tarefas")}
                        className="text-xs text-[var(--vly-accent)] hover:opacity-80"
                      >
                        Ver todas →
                      </button>
                    </div>

                    <div className="space-y-2">
                      {projectTasks.slice(0, 3).map((task) => (
                        <div
                          key={task.id}
                          className="flex items-center justify-between rounded-lg border border-[var(--vly-border-subtle)] bg-[var(--vly-surface)] p-2.5 text-xs"
                        >
                          <span className="truncate text-[var(--vly-text-primary)]">{task.title}</span>
                          <span className="rounded bg-[var(--vly-accent)]/10 px-2 py-0.5 text-[10px] uppercase text-[var(--vly-accent)]">
                            {task.priority}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Team & Context */}
                <div className="space-y-4">
                  <div className="space-y-3 rounded-xl border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-raised)] p-5">
                    <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--vly-text-primary)]">
                      <Users size={14} className="text-[var(--vly-accent)]" />
                      <span>Colaboradores</span>
                    </h3>
                    <div className="space-y-2">
                      {(project.collaborators && project.collaborators.length > 0
                        ? project.collaborators
                        : ["Paulo (Dono)"]
                      ).map((member) => (
                        <div
                          key={member}
                          className="flex items-center gap-2.5 rounded-lg bg-[var(--vly-surface)] p-2 text-xs text-[var(--vly-text-secondary)]"
                        >
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--vly-accent)]/30 text-[10px] font-bold text-[var(--vly-accent)]">
                            {member[0]}
                          </div>
                          <span>{member}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3 rounded-xl border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-raised)] p-5">
                    <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--vly-text-primary)]">
                      <Bot size={14} className="text-[var(--vly-accent)]" />
                      <span>Athena Copilot</span>
                    </h3>
                    <p className="text-xs text-[var(--vly-text-secondary)]">
                      Use a aba da Athena para gerar ideias, analisar tarefas ou resumir o estado deste projeto.
                    </p>
                    <button
                      onClick={() => setActiveTab("athena")}
                      className="w-full rounded-lg border border-[var(--vly-accent)]/30 bg-[var(--vly-accent)]/20 py-2 text-xs font-semibold text-[var(--vly-accent)] transition-colors hover:bg-[var(--vly-accent)]/30"
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
