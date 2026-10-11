"use client";

import { useState } from "react";
import { ProjectTimelineEvent } from "@/lib/types";
import { useVarynthStore } from "@/lib/store/useVarynthStore";
import { Plus, Trash2 } from "lucide-react";
import { StatePanel } from "@/components/ui/StatePanel";
import { Surface } from "@/components/ui/Surface";

interface ProjectTimelineTabProps {
  projectId: string;
}

export function ProjectTimelineTab({ projectId }: ProjectTimelineTabProps) {
  const { timelineEvents, addTimelineEvent, deleteTimelineEvent } = useVarynthStore();
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [type, setType] = useState<ProjectTimelineEvent["type"]>("marco");

  const projectEvents = timelineEvents.filter((t) => t.projectId === projectId);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    addTimelineEvent({
      projectId,
      title: title.trim(),
      description: description.trim() || undefined,
      date: date || new Date().toISOString().split("T")[0],
      type,
    });

    setTitle("");
    setDescription("");
    setDate("");
    setIsAdding(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-[var(--vly-text-secondary)] uppercase tracking-wider">
          Linha do Tempo & Marcos ({projectEvents.length})
        </h3>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-1.5 rounded-lg bg-[var(--vly-accent)] px-3 py-1.5 text-xs font-semibold text-[var(--vly-accent-contrast)] transition-colors hover:opacity-90"
        >
          <Plus size={14} />
          <span>Registrar Marco</span>
        </button>
      </div>

      {/* Add Form */}
      {isAdding && (
        <form onSubmit={handleCreate} className="p-4 rounded-[var(--vly-radius-lg)] bg-[var(--vly-surface-raised)] border border-[var(--vly-border-strong)] space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              required
              placeholder="Título do marco ou evento..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="vly-field sm:col-span-2 px-3 py-2 text-xs"
              autoFocus
            />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="vly-field px-2.5 py-1.5 text-xs"
            />
          </div>
          <textarea
            rows={2}
            placeholder="Descrição ou resultado alcançado..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="vly-field w-full resize-none px-3 py-2 text-xs"
          />
          <div className="flex justify-end gap-2">
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
              Salvar Marco
            </button>
          </div>
        </form>
      )}

      {/* Timeline view */}
      <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[var(--vly-border-default)]">
        {projectEvents.length === 0 ? (
          <StatePanel tone="empty" className="bg-[var(--vly-surface)]" title="Nenhum marco registrado" description="Registre decisões, entregas e eventos para dar continuidade temporal ao projeto." action={<button type="button" onClick={() => setIsAdding(true)} className="vly-interactive rounded-[var(--vly-radius-md)] bg-[var(--vly-accent)] px-3 py-2 text-xs font-bold text-[var(--vly-accent-contrast)]"><Plus size={13} className="mr-1 inline" />Registrar marco</button>} />
        ) : (
          projectEvents.map((evt) => (
            <div key={evt.id} className="relative group">
              {/* Dot */}
              <div className="absolute -left-[27px] top-1.5 h-3 w-3 rounded-full border-2 border-[var(--vly-world)] bg-[var(--vly-accent)] ring-2 ring-[var(--vly-accent)]/30" />

              <Surface tone="raised" className="rounded-xl p-4 transition-all hover:border-[var(--vly-accent)]/40">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-semibold text-[var(--vly-accent)]">{evt.date}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--vly-surface-raised)] text-[var(--vly-text-secondary)] border border-[var(--vly-border-subtle)] uppercase">
                      {evt.type}
                    </span>
                  </div>
                  <button
                    onClick={() => deleteTimelineEvent(evt.id)}
                    className="touch-manipulation p-1.5 text-[var(--vly-text-muted)] opacity-70 transition-opacity hover:text-[var(--vly-danger)] sm:opacity-0 sm:group-hover:opacity-100"
                    title="Remover evento"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
                <h4 className="text-xs font-bold text-[var(--vly-text-secondary)] mt-1">{evt.title}</h4>
                {evt.description && (
                  <p className="text-xs text-[var(--vly-text-secondary)] mt-1 leading-relaxed">{evt.description}</p>
                )}
              </Surface>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
