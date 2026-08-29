"use client";

import Link from "next/link";
import { Project } from "@/lib/types";
import {
  FolderKanban,
  Calendar,
  Tag,
  CheckCircle2,
  Clock,
  Flame,
  Layers,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ProjectCardProps {
  project: Project;
  tasksCount?: number;
  completedTasksCount?: number;
}

const CATEGORY_COLORS: Record<string, { label: string; bg: string; text: string; border: string }> = {
  software: { label: "Software", bg: "bg-cyan-500/10", text: "text-cyan-400", border: "border-cyan-500/20" },
  pesquisa: { label: "Pesquisa", bg: "bg-violet-500/10", text: "text-violet-400", border: "border-violet-500/20" },
  estudo: { label: "Estudo", bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20" },
  academico: { label: "Acadêmico", bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20" },
  negocio: { label: "Negócio", bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20" },
  pessoal: { label: "Pessoal", bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/20" },
  experimento: { label: "Experimento", bg: "bg-pink-500/10", text: "text-pink-400", border: "border-pink-500/20" },
};

const PRIORITY_CONFIG = {
  baixa: { label: "Baixa", color: "text-slate-400 border-slate-700 bg-slate-800/30" },
  media: { label: "Média", color: "text-blue-400 border-blue-500/20 bg-blue-500/10" },
  alta: { label: "Alta", color: "text-amber-400 border-amber-500/20 bg-amber-500/10" },
  urgente: { label: "Urgente", color: "text-red-400 border-red-500/20 bg-red-500/10" },
};

const STATUS_CONFIG = {
  planejamento: { label: "Planejamento", color: "text-slate-400 border-slate-700 bg-slate-800/30" },
  ativo: { label: "Ativo", color: "text-emerald-400 border-emerald-500/20 bg-emerald-500/10" },
  em_espera: { label: "Em Espera", color: "text-amber-400 border-amber-500/20 bg-amber-500/10" },
  concluido: { label: "Concluído", color: "text-blue-400 border-blue-500/20 bg-blue-500/10" },
  arquivado: { label: "Arquivado", color: "text-slate-500 border-slate-800 bg-slate-900/30" },
};

export function ProjectCard({ project, tasksCount = 0, completedTasksCount = 0 }: ProjectCardProps) {
  const cat = CATEGORY_COLORS[project.category] || CATEGORY_COLORS.software;
  const prio = PRIORITY_CONFIG[project.priority];
  const stat = STATUS_CONFIG[project.status];

  const calculatedProgress =
    tasksCount > 0 ? Math.round((completedTasksCount / tasksCount) * 100) : (project.progress ?? 0);

  return (
    <Link
      href={`/projects/${project.id}`}
      className={cn(
        "group relative flex flex-col justify-between p-5 rounded-xl bg-[#0f0f1a] border border-[#1e1e30]",
        "hover:border-violet-500/50 hover:shadow-[0_0_24px_rgba(124,58,237,0.2)]",
        "transition-all duration-300 clip-corner overflow-hidden"
      )}
    >
      {/* Top badges */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={cn("text-[10px] px-2 py-0.5 rounded border font-semibold", cat.bg, cat.text, cat.border)}>
              {cat.label}
            </span>
            <span className={cn("text-[10px] px-2 py-0.5 rounded border font-medium", stat.color)}>
              {stat.label}
            </span>
          </div>

          {project.priority === "urgente" && (
            <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border font-semibold text-red-400 bg-red-500/10 border-red-500/20 animate-pulse">
              <Flame size={11} />
              Urgente
            </span>
          )}
        </div>

        {/* Title & Desc */}
        <h3 className="text-sm font-bold text-slate-100 group-hover:text-violet-300 transition-colors line-clamp-1">
          {project.title}
        </h3>
        <p className="text-xs text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
          {project.description}
        </p>
      </div>

      {/* Footer Info */}
      <div className="mt-5 space-y-3 pt-3 border-t border-[#1e1e30]">
        {/* Progress */}
        <div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
            <span className="flex items-center gap-1">
              <CheckCircle2 size={12} className="text-violet-400" />
              <span>{completedTasksCount}/{tasksCount} tarefas</span>
            </span>
            <span className="font-mono text-slate-300">{calculatedProgress}%</span>
          </div>
          <div className="w-full bg-[#14141f] h-1.5 rounded-full overflow-hidden border border-[#1e1e30]">
            <div
              className="h-full bg-gradient-to-r from-violet-600 to-cyan-400 transition-all duration-300"
              style={{ width: `${calculatedProgress}%` }}
            />
          </div>
        </div>

        {/* Tags & Deadline */}
        <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
          <div className="flex items-center gap-1 truncate max-w-[60%]">
            <Tag size={11} className="flex-shrink-0" />
            <span className="truncate">{project.tags.slice(0, 3).map((t) => `#${t}`).join(" ")}</span>
          </div>

          {project.deadline && (
            <div className="flex items-center gap-1 text-slate-400 font-mono text-[10px]">
              <Calendar size={11} className="text-violet-400" />
              <span>{project.deadline}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

