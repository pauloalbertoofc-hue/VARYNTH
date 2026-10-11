"use client";

import { useState, useMemo } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { StatePanel } from "@/components/ui/StatePanel";
import { Surface } from "@/components/ui/Surface";
import { useVarynthStore } from "@/lib/store/useVarynthStore";
import { ProjectCategory, ProjectStatus } from "@/lib/types";
import {
  FolderKanban,
  Plus,
  Search,
  Filter,
  Grid3x3,
  List,
  Flame,
  CheckCircle2,
  Clock,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORIES: { id: string; label: string }[] = [
  { id: "todas", label: "Todas as Categorias" },
  { id: "software", label: "Software" },
  { id: "pesquisa", label: "Pesquisa" },
  { id: "estudo", label: "Estudo" },
  { id: "academico", label: "Acadêmico" },
  { id: "negocio", label: "Negócio" },
  { id: "pessoal", label: "Pessoal" },
  { id: "experimento", label: "Experimento" },
];

const STATUS_FILTERS: { id: string; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "ativo", label: "Ativos" },
  { id: "planejamento", label: "Planejamento" },
  { id: "em_espera", label: "Em Espera" },
  { id: "concluido", label: "Concluídos" },
  { id: "arquivado", label: "Arquivados" },
];

export default function ProjectsPage() {
  const { projects, tasks, isLoaded } = useVarynthStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("todas");
  const [selectedStatus, setSelectedStatus] = useState("todos");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const matchesSearch =
        !searchQuery.trim() ||
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCat =
        selectedCategory === "todas" || p.category === selectedCategory;

      const matchesStat =
        selectedStatus === "todos" || p.status === selectedStatus;

      return matchesSearch && matchesCat && matchesStat;
    });
  }, [projects, searchQuery, selectedCategory, selectedStatus]);

  const handleOpenNewProject = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("open-quick-create", { detail: { tab: "project" } }));
    }
  };

  const activeCount = projects.filter((p) => p.status === "ativo").length;
  const urgentCount = projects.filter((p) => p.priority === "urgente").length;
  const completedCount = projects.filter((p) => p.status === "concluido").length;

  return (
    <PageLayout title="Projects" subtitle="Workspaces e gerenciamento de projetos">
      <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
        {/* Header & Metrics */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--vly-info)]/30 bg-[var(--vly-info)]/20 text-[var(--vly-info)]">
                <FolderKanban size={18} />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-[var(--vly-text-primary)] tracking-tight">
                Workspaces de Projetos
              </h1>
            </div>
            <p className="text-xs text-[var(--vly-text-secondary)] mt-1">
              Ambientes modulares dedicados com tarefas, notas, referências, timeline e IA.
            </p>
          </div>

          <button
            onClick={handleOpenNewProject}
            className="vly-interactive flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-[var(--vly-text-primary)] bg-[var(--vly-surface-raised)] hover:bg-[var(--vly-surface-hover)] border border-[var(--vly-border-accent)]"
          >
            <Plus size={16} />
            <span>Novo Projeto</span>
          </button>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Surface tone="raised" className="p-3.5 rounded-xl clip-corner-sm">
            <div className="flex items-center justify-between text-[var(--vly-text-secondary)] text-xs">
              <span>Total</span>
              <FolderKanban size={14} className="text-[var(--vly-accent)]" />
            </div>
            <p className="text-xl font-bold text-[var(--vly-text-primary)] mt-1">{projects.length}</p>
          </Surface>

          <Surface tone="raised" className="p-3.5 rounded-xl clip-corner-sm">
            <div className="flex items-center justify-between text-[var(--vly-text-secondary)] text-xs">
              <span>Em Andamento</span>
              <Clock size={14} className="text-[var(--vly-success)]" />
            </div>
            <p className="mt-1 text-xl font-bold text-[var(--vly-success)]">{activeCount}</p>
          </Surface>

          <Surface tone="raised" className="p-3.5 rounded-xl clip-corner-sm">
            <div className="flex items-center justify-between text-[var(--vly-text-secondary)] text-xs">
              <span>Urgentes</span>
              <Flame size={14} className="text-[var(--vly-danger)]" />
            </div>
            <p className="mt-1 text-xl font-bold text-[var(--vly-danger)]">{urgentCount}</p>
          </Surface>

          <Surface tone="raised" className="p-3.5 rounded-xl clip-corner-sm">
            <div className="flex items-center justify-between text-[var(--vly-text-secondary)] text-xs">
              <span>Concluídos</span>
              <CheckCircle2 size={14} className="text-[var(--vly-info)]" />
            </div>
            <p className="mt-1 text-xl font-bold text-[var(--vly-info)]">{completedCount}</p>
          </Surface>
        </div>

        {/* Filters and Controls */}
        <Surface tone="raised" className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 rounded-xl">
          {/* Search */}
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--vly-text-muted)]" />
            <input
              type="text"
              placeholder="Buscar por título, tag ou descrição..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="vly-field w-full rounded-lg py-1.5 pl-9 pr-3 text-xs text-[var(--vly-text-secondary)] placeholder:text-[var(--vly-text-muted)] focus:border-[var(--vly-accent)]/60 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Category Filter */}
            <select
              aria-label="Filtrar projetos por categoria"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="vly-field px-2.5 py-1.5 rounded-lg text-xs text-[var(--vly-text-secondary)] focus:outline-none"
            >
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              aria-label="Filtrar projetos por status"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="vly-field px-2.5 py-1.5 rounded-lg text-xs text-[var(--vly-text-secondary)] focus:outline-none"
            >
              {STATUS_FILTERS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </Surface>

        {/* Project List / Grid */}
        <div>
          {filteredProjects.length === 0 ? (
            <StatePanel
              tone="empty"
              className="min-h-52 bg-[var(--vly-surface)]"
              title="Nenhum projeto encontrado"
              description="Ajuste os filtros ou crie um novo projeto para começar a organizar seu Workspace."
              action={<button type="button" onClick={handleOpenNewProject} className="vly-interactive rounded-[var(--vly-radius-md)] bg-[var(--vly-accent)] px-3 py-2 text-xs font-bold text-[var(--vly-accent-contrast)]"><Plus size={13} className="mr-1 inline" />Novo projeto</button>}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProjects.map((project) => {
                const projTasks = tasks.filter((t) => t.projectId === project.id);
                const completedTasks = projTasks.filter((t) => t.status === "concluida");
                return (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    tasksCount={projTasks.length}
                    completedTasksCount={completedTasks.length}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
