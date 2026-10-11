"use client";

import { useState } from "react";
import { Task, PriorityLevel } from "@/lib/types";
import { useVarynthStore } from "@/lib/store/useVarynthStore";
import {
  CheckSquare,
  Square,
  Plus,
  Trash2,
  Calendar,
  AlertCircle,
  Clock,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StatePanel } from "@/components/ui/StatePanel";
import { Surface } from "@/components/ui/Surface";

interface ProjectTasksTabProps {
  projectId: string;
}

const PRIORITY_BADGES = {
  baixa: { label: "Baixa", class: "text-[var(--vly-text-muted)] border-[var(--vly-border-subtle)] bg-[var(--vly-surface-raised)]" },
  media: { label: "Média", class: "text-[var(--vly-info)] border-[var(--vly-info)]/30 bg-[var(--vly-info)]/10" },
  alta: { label: "Alta", class: "text-[var(--vly-warning)] border-[var(--vly-warning)]/30 bg-[var(--vly-warning)]/10" },
  urgente: { label: "Urgente", class: "text-[var(--vly-danger)] border-[var(--vly-danger)]/30 bg-[var(--vly-danger)]/10" },
};

export function ProjectTasksTab({ projectId }: ProjectTasksTabProps) {
  const { tasks, addTask, toggleTask, deleteTask } = useVarynthStore();
  const [filter, setFilter] = useState<"todas" | "pendentes" | "concluidas">("todas");
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<PriorityLevel>("media");
  const [dueDate, setDueDate] = useState("");

  const projectTasks = tasks.filter((t) => t.projectId === projectId);

  const filteredTasks = projectTasks.filter((t) => {
    if (filter === "pendentes") return t.status !== "concluida";
    if (filter === "concluidas") return t.status === "concluida";
    return true;
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    addTask({
      projectId,
      title: title.trim(),
      priority,
      dueDate: dueDate || undefined,
      status: "a_fazer",
    });

    setTitle("");
    setIsAdding(false);
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter("todas")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
              filter === "todas"
                ? "bg-[var(--vly-accent)]/20 text-[var(--vly-accent)] border border-[var(--vly-accent)]/40"
                : "text-[var(--vly-text-secondary)] hover:text-[var(--vly-text-primary)]"
            )}
          >
            Todas ({projectTasks.length})
          </button>
          <button
            onClick={() => setFilter("pendentes")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
              filter === "pendentes"
                ? "bg-[var(--vly-warning)]/15 text-[var(--vly-warning)] border border-[var(--vly-warning)]/40"
                : "text-[var(--vly-text-secondary)] hover:text-[var(--vly-text-primary)]"
            )}
          >
            Pendentes ({projectTasks.filter((t) => t.status !== "concluida").length})
          </button>
          <button
            onClick={() => setFilter("concluidas")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
              filter === "concluidas"
                ? "bg-[var(--vly-success)]/15 text-[var(--vly-success)] border border-[var(--vly-success)]/40"
                : "text-[var(--vly-text-secondary)] hover:text-[var(--vly-text-primary)]"
            )}
          >
            Concluídas ({projectTasks.filter((t) => t.status === "concluida").length})
          </button>
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-1.5 rounded-lg bg-[var(--vly-accent)] px-3 py-1.5 text-xs font-semibold text-[var(--vly-accent-contrast)] transition-colors hover:opacity-90"
        >
          <Plus size={14} />
          <span>Nova Tarefa</span>
        </button>
      </div>

      {/* Quick Add Form */}
      {isAdding && (
        <form onSubmit={handleCreate} className="p-4 rounded-[var(--vly-radius-lg)] bg-[var(--vly-surface-raised)] border border-[var(--vly-border-strong)] space-y-3">
          <div>
            <input
              type="text"
              required
              placeholder="O que precisa ser feito neste projeto?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="vly-field w-full px-3 py-2 text-xs"
              autoFocus
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[var(--vly-text-secondary)]">Prioridade:</span>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as PriorityLevel)}
                className="vly-field px-2.5 py-1 text-xs"
              >
                <option value="baixa">Baixa</option>
                <option value="media">Média</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente 🔥</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[var(--vly-text-secondary)]">Prazo:</span>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="vly-field px-2 py-1 text-xs"
              />
            </div>

            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-3 py-1 text-xs text-[var(--vly-text-secondary)] hover:text-[var(--vly-text-primary)]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1 rounded bg-[var(--vly-accent)] hover:opacity-90 text-xs font-semibold text-[var(--vly-accent-contrast)] transition-colors"
              >
                Adicionar
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Task List */}
      <div className="space-y-2">
        {filteredTasks.length === 0 ? (
          <StatePanel tone="empty" className="bg-[var(--vly-surface)]" title="Nenhuma tarefa encontrada" description="Ajuste o filtro ou adicione uma tarefa para este projeto." />
        ) : (
          filteredTasks.map((task) => {
            const isDone = task.status === "concluida";
            const prio = PRIORITY_BADGES[task.priority];

            return (
              <Surface
                key={task.id}
                tone="raised"
                className={cn(
                  "group flex items-center justify-between gap-3 rounded-xl p-3.5",
                  "transition-all duration-200 hover:border-[var(--vly-accent)]/40",
                  isDone && "opacity-60"
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => toggleTask(task.id)}
                    aria-label={isDone ? `Reabrir tarefa: ${task.title}` : `Concluir tarefa: ${task.title}`}
                    title={isDone ? "Reabrir tarefa" : "Concluir tarefa"}
                    className="shrink-0 text-[var(--vly-accent)] transition-colors hover:opacity-80"
                  >
                    {isDone ? <CheckSquare size={18} className="text-[var(--vly-success)]" /> : <Square size={18} />}
                  </button>

                  <div className="min-w-0">
                    <p className={cn("text-xs font-medium text-[var(--vly-text-secondary)] truncate", isDone && "line-through text-[var(--vly-text-muted)]")}>
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="text-[11px] text-[var(--vly-text-secondary)] mt-0.5 truncate">{task.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={cn("text-[10px] px-2 py-0.5 rounded border font-medium", prio.class)}>
                    {prio.label}
                  </span>

                  {task.dueDate && (
                    <span className="flex items-center gap-1 text-[10px] text-[var(--vly-text-secondary)] font-mono">
                      <Calendar size={11} className="text-[var(--vly-accent)]" />
                      <span>{task.dueDate}</span>
                    </span>
                  )}

                  <button
                    onClick={() => deleteTask(task.id)}
                    className="touch-manipulation p-1.5 text-[var(--vly-text-muted)] opacity-70 transition-opacity hover:text-[var(--vly-danger)] sm:opacity-0 sm:group-hover:opacity-100"
                    title="Remover tarefa"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </Surface>
            );
          })
        )}
      </div>
    </div>
  );
}
