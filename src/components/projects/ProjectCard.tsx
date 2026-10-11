"use client";

import Link from "next/link";
import { Project } from "@/lib/types";
import {
  Calendar,
  Tag,
  CheckCircle2,
  Flame,
} from "lucide-react";
import { Surface } from "@/components/ui/Surface";

interface ProjectCardProps {
  project: Project;
  tasksCount?: number;
  completedTasksCount?: number;
}

const CATEGORY_COLORS: Record<string, { label: string; bg: string; text: string; border: string }> = {
  software: { label: "Software", bg: "bg-[var(--vly-info)]/10", text: "text-[var(--vly-info)]", border: "border-[var(--vly-info)]/20" },
  pesquisa: { label: "Pesquisa", bg: "bg-[var(--vly-accent)]/10", text: "text-[var(--vly-accent)]", border: "border-[var(--vly-accent)]/20" },
  estudo: { label: "Estudo", bg: "bg-[var(--vly-success)]/10", text: "text-[var(--vly-success)]", border: "border-[var(--vly-success)]/20" },
  academico: { label: "Acadêmico", bg: "bg-[var(--vly-warning)]/10", text: "text-[var(--vly-warning)]", border: "border-[var(--vly-warning)]/20" },
  negocio: { label: "Negócio", bg: "bg-[var(--vly-info)]/10", text: "text-[var(--vly-info)]", border: "border-[var(--vly-info)]/20" },
  pessoal: { label: "Pessoal", bg: "bg-[var(--vly-accent)]/10", text: "text-[var(--vly-accent)]", border: "border-[var(--vly-accent)]/20" },
  experimento: { label: "Experimento", bg: "bg-[var(--vly-accent)]/10", text: "text-[var(--vly-accent)]", border: "border-[var(--vly-accent)]/20" },
};

const PRIORITY_CONFIG = {
  baixa: { label: "Baixa", color: "text-[var(--vly-text-muted)] border-[var(--vly-border-subtle)] bg-[var(--vly-surface-raised)]" },
  media: { label: "Média", color: "text-[var(--vly-info)] border-[var(--vly-info)]/20 bg-[var(--vly-info)]/10" },
  alta: { label: "Alta", color: "text-[var(--vly-warning)] border-[var(--vly-warning)]/20 bg-[var(--vly-warning)]/10" },
  urgente: { label: "Urgente", color: "text-[var(--vly-danger)] border-[var(--vly-danger)]/20 bg-[var(--vly-danger)]/10" },
};

const STATUS_CONFIG = {
  planejamento: { label: "Planejamento", color: "text-[var(--vly-text-muted)] border-[var(--vly-border-subtle)] bg-[var(--vly-surface-raised)]" },
  ativo: { label: "Ativo", color: "text-[var(--vly-success)] border-[var(--vly-success)]/20 bg-[var(--vly-success)]/10" },
  em_espera: { label: "Em Espera", color: "text-[var(--vly-warning)] border-[var(--vly-warning)]/20 bg-[var(--vly-warning)]/10" },
  concluido: { label: "Concluído", color: "text-[var(--vly-info)] border-[var(--vly-info)]/20 bg-[var(--vly-info)]/10" },
  arquivado: { label: "Arquivado", color: "text-[var(--vly-text-muted)] border-[var(--vly-border-subtle)] bg-[var(--vly-world)]" },
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
      className="group"
    >
      <Surface
        tone="raised"
        className="relative flex h-full flex-col justify-between overflow-hidden rounded-xl p-5 clip-corner transition-all duration-300 group-hover:border-[var(--vly-accent)]/50 group-hover:shadow-[0_0_24px_color-mix(in_srgb,var(--vly-accent)_20%,transparent)]"
      >
      {/* Top badges */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`${cat.bg} ${cat.text} ${cat.border} text-[10px] px-2 py-0.5 rounded border font-semibold`}>
              {cat.label}
            </span>
            <span className={`${stat.color} text-[10px] px-2 py-0.5 rounded border font-medium`}>
              {stat.label}
            </span>
          </div>

          {project.priority === "urgente" && (
            <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border font-semibold text-[var(--vly-danger)] bg-[var(--vly-danger)]/10 border-[var(--vly-danger)]/20 animate-pulse">
              <Flame size={11} />
              Urgente
            </span>
          )}
        </div>

        {/* Title & Desc */}
        <h3 className="text-sm font-bold text-[var(--vly-text-primary)] group-hover:text-[var(--vly-accent)] transition-colors line-clamp-1">
          {project.title}
        </h3>
        <p className="text-xs text-[var(--vly-text-secondary)] mt-1.5 line-clamp-2 leading-relaxed">
          {project.description}
        </p>
      </div>

      {/* Footer Info */}
      <div className="mt-5 space-y-3 pt-3 border-t border-[var(--vly-border-subtle)]">
        {/* Progress */}
        <div>
          <div className="flex items-center justify-between text-[11px] text-[var(--vly-text-secondary)] mb-1">
            <span className="flex items-center gap-1">
              <CheckCircle2 size={12} className="text-[var(--vly-accent)]" />
              <span>{completedTasksCount}/{tasksCount} tarefas</span>
            </span>
            <span className="font-mono text-[var(--vly-text-secondary)]">{calculatedProgress}%</span>
          </div>
          <div className="w-full bg-[var(--vly-surface-raised)] h-1.5 rounded-full overflow-hidden border border-[var(--vly-border-subtle)]">
            <div
              className="h-full bg-[var(--vly-accent)] transition-all duration-300"
              style={{ width: `${calculatedProgress}%` }}
            />
          </div>
        </div>

        {/* Tags & Deadline */}
        <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
          <div className="flex items-center gap-1 truncate max-w-[60%] text-[var(--vly-text-muted)]">
            <Tag size={11} className="flex-shrink-0" />
            <span className="truncate">{project.tags.slice(0, 3).map((t) => `#${t}`).join(" ")}</span>
          </div>

          {project.deadline && (
            <div className="flex items-center gap-1 text-[var(--vly-text-secondary)] font-mono text-[10px]">
              <Calendar size={11} className="text-[var(--vly-accent)]" />
              <span>{project.deadline}</span>
            </div>
          )}
        </div>
      </div>
      </Surface>
    </Link>
  );
}
