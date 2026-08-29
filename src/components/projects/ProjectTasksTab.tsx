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

interface ProjectTasksTabProps {
  projectId: string;
}

const PRIORITY_BADGES = {
  baixa: { label: "Baixa", class: "text-slate-400 border-slate-700 bg-slate-800/30" },
  media: { label: "Média", class: "text-blue-400 border-blue-500/30 bg-blue-500/10" },
  alta: { label: "Alta", class: "text-amber-400 border-amber-500/30 bg-amber-500/10" },
  urgente: { label: "Urgente", class: "text-red-400 border-red-500/30 bg-red-500/10" },
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
                ? "bg-violet-600/30 text-violet-300 border border-violet-500/40"
                : "text-slate-400 hover:text-slate-200"
            )}
          >
            Todas ({projectTasks.length})
          </button>
          <button
            onClick={() => setFilter("pendentes")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
              filter === "pendentes"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                : "text-slate-400 hover:text-slate-200"
            )}
          >
            Pendentes ({projectTasks.filter((t) => t.status !== "concluida").length})
          </button>
          <button
            onClick={() => setFilter("concluidas")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
              filter === "concluidas"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                : "text-slate-400 hover:text-slate-200"
            )}
          >
            Concluídas ({projectTasks.filter((t) => t.status === "concluida").length})
          </button>
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white transition-colors"
        >
          <Plus size={14} />
          <span>Nova Tarefa</span>
        </button>
      </div>

      {/* Quick Add Form */}
      {isAdding && (
        <form onSubmit={handleCreate} className="p-4 rounded-xl bg-[#14141f] border border-[#2d2d4a] space-y-3">
          <div>
            <input
              type="text"
              required
              placeholder="O que precisa ser feito neste projeto?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#0a0a0f] border border-[#1e1e30] text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500/60"
              autoFocus
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400">Prioridade:</span>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as PriorityLevel)}
                className="px-2.5 py-1 rounded bg-[#0a0a0f] border border-[#1e1e30] text-xs text-slate-200 focus:outline-none"
              >
                <option value="baixa">Baixa</option>
                <option value="media">Média</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente 🔥</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400">Prazo:</span>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="px-2 py-1 rounded bg-[#0a0a0f] border border-[#1e1e30] text-xs text-slate-200 focus:outline-none"
              />
            </div>

            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-3 py-1 text-xs text-slate-400 hover:text-slate-200"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1 rounded bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white transition-colors"
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
          <div className="py-12 text-center rounded-xl bg-[#0f0f1a] border border-[#1e1e30] text-slate-500 text-xs">
            Nenhuma tarefa encontrada para este filtro.
          </div>
        ) : (
          filteredTasks.map((task) => {
            const isDone = task.status === "concluida";
            const prio = PRIORITY_BADGES[task.priority];

            return (
              <div
                key={task.id}
                className={cn(
                  "group flex items-center justify-between gap-3 p-3.5 rounded-xl bg-[#0f0f1a] border border-[#1e1e30]",
                  "hover:border-violet-500/40 transition-all duration-200",
                  isDone && "opacity-60 bg-[#0a0a0f]"
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => toggleTask(task.id)}
                    className="text-violet-400 hover:text-violet-300 transition-colors flex-shrink-0"
                  >
                    {isDone ? <CheckSquare size={18} className="text-emerald-400" /> : <Square size={18} />}
                  </button>

                  <div className="min-w-0">
                    <p className={cn("text-xs font-medium text-slate-200 truncate", isDone && "line-through text-slate-500")}>
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="text-[11px] text-slate-400 mt-0.5 truncate">{task.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={cn("text-[10px] px-2 py-0.5 rounded border font-medium", prio.class)}>
                    {prio.label}
                  </span>

                  {task.dueDate && (
                    <span className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                      <Calendar size={11} className="text-violet-400" />
                      <span>{task.dueDate}</span>
                    </span>
                  )}

                  <button
                    onClick={() => deleteTask(task.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 transition-opacity"
                    title="Remover tarefa"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

