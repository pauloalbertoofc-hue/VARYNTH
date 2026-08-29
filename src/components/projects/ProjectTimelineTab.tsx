"use client";

import { useState } from "react";
import { ProjectTimelineEvent } from "@/lib/types";
import { useVarynthStore } from "@/lib/store/useVarynthStore";
import { Clock, Plus, Trash2, Milestone, Calendar, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

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
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
          Linha do Tempo & Marcos ({projectEvents.length})
        </h3>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white transition-colors"
        >
          <Plus size={14} />
          <span>Registrar Marco</span>
        </button>
      </div>

      {/* Add Form */}
      {isAdding && (
        <form onSubmit={handleCreate} className="p-4 rounded-xl bg-[#14141f] border border-[#2d2d4a] space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              required
              placeholder="Título do marco ou evento..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="sm:col-span-2 px-3 py-2 rounded-lg bg-[#0a0a0f] border border-[#1e1e30] text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500/60"
              autoFocus
            />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-[#0a0a0f] border border-[#1e1e30] text-xs text-slate-200 focus:outline-none"
            />
          </div>
          <textarea
            rows={2}
            placeholder="Descrição ou resultado alcançado..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-[#0a0a0f] border border-[#1e1e30] text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500/60 resize-none"
          />
          <div className="flex justify-end gap-2">
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
              Salvar Marco
            </button>
          </div>
        </form>
      )}

      {/* Timeline view */}
      <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#1e1e30]">
        {projectEvents.length === 0 ? (
          <div className="py-12 text-center rounded-xl bg-[#0f0f1a] border border-[#1e1e30] text-slate-500 text-xs">
            Nenhum marco registrado na linha do tempo.
          </div>
        ) : (
          projectEvents.map((evt) => (
            <div key={evt.id} className="relative group">
              {/* Dot */}
              <div className="absolute -left-[27px] top-1.5 w-3 h-3 rounded-full bg-violet-500 border-2 border-[#0a0a0f] ring-2 ring-violet-500/30" />

              <div className="p-4 rounded-xl bg-[#0f0f1a] border border-[#1e1e30] hover:border-violet-500/40 transition-all">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-semibold text-violet-400">{evt.date}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[#14141f] text-slate-400 border border-[#1e1e30] uppercase">
                      {evt.type}
                    </span>
                  </div>
                  <button
                    onClick={() => deleteTimelineEvent(evt.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 transition-opacity"
                    title="Remover evento"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                <h4 className="text-xs font-bold text-slate-200 mt-1">{evt.title}</h4>
                {evt.description && (
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{evt.description}</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

