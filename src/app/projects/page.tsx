"use client";

import { useState, useMemo } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { ProjectCard } from "@/components/projects/ProjectCard";
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
              <div className="w-8 h-8 rounded-lg bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <FolderKanban size={18} />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Workspaces de Projetos
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Ambientes modulares dedicados com tarefas, notas, referências, timeline e IA.
            </p>
          </div>

          <button
            onClick={handleOpenNewProject}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-violet-600 hover:bg-violet-500 glow-accent transition-all duration-200"
          >
            <Plus size={16} />
            <span>Novo Projeto</span>
          </button>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-[#0f0f1a] border border-[#1e1e30] clip-corner-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Total</span>
              <FolderKanban size={14} className="text-violet-400" />
            </div>
            <p className="text-xl font-bold text-white mt-1">{projects.length}</p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#0f0f1a] border border-[#1e1e30] clip-corner-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Em Andamento</span>
              <Clock size={14} className="text-emerald-400" />
            </div>
            <p className="text-xl font-bold text-emerald-400 mt-1">{activeCount}</p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#0f0f1a] border border-[#1e1e30] clip-corner-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Urgentes</span>
              <Flame size={14} className="text-red-400" />
            </div>
            <p className="text-xl font-bold text-red-400 mt-1">{urgentCount}</p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#0f0f1a] border border-[#1e1e30] clip-corner-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Concluídos</span>
              <CheckCircle2 size={14} className="text-cyan-400" />
            </div>
            <p className="text-xl font-bold text-cyan-400 mt-1">{completedCount}</p>
          </div>
        </div>

        {/* Filters and Controls */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 bg-[#0f0f1a] rounded-xl border border-[#1e1e30]">
          {/* Search */}
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por título, tag ou descrição..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#0a0a0f] border border-[#1e1e30] text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500/60"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-[#0a0a0f] border border-[#1e1e30] text-xs text-slate-200 focus:outline-none"
            >
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-[#0a0a0f] border border-[#1e1e30] text-xs text-slate-200 focus:outline-none"
            >
              {STATUS_FILTERS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Project List / Grid */}
        <div>
          {filteredProjects.length === 0 ? (
            <div className="py-16 text-center rounded-xl bg-[#0f0f1a] border border-[#1e1e30] space-y-3">
              <FolderKanban size={32} className="mx-auto text-slate-600" />
              <p className="text-sm font-semibold text-slate-300">Nenhum projeto encontrado</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Tente ajustar seus filtros ou crie um novo projeto clicando no botão acima.
              </p>
            </div>
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

