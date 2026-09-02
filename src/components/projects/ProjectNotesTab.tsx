"use client";

import { useState } from "react";
import { Note } from "@/lib/types";
import { useVarynthStore } from "@/lib/store/useVarynthStore";
import { FileText, Plus, Trash2, Pin, Tag, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProjectNotesTabProps {
  projectId: string;
}

export function ProjectNotesTab({ projectId }: ProjectNotesTabProps) {
  const { notes, addNote, deleteNote } = useVarynthStore();
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");

  const projectNotes = notes.filter((n) => n.projectId === projectId);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const tagsArray = tags
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    addNote({
      projectId,
      title: title.trim(),
      content: content.trim(),
      tags: tagsArray.length ? tagsArray : ["projeto"],
      pinned: false,
    });

    setTitle("");
    setContent("");
    setTags("");
    setIsAdding(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
          Notas & Fichamentos do Projeto ({projectNotes.length})
        </h3>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white transition-colors"
        >
          <Plus size={14} />
          <span>Nova Nota</span>
        </button>
      </div>

      {/* Add Form */}
      {isAdding && (
        <form onSubmit={handleCreate} className="p-4 rounded-xl bg-[#14141f] border border-[#2d2d4a] space-y-3">
          <input
            type="text"
            required
            placeholder="Título da anotação..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-[#0a0a0f] border border-[#1e1e30] text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500/60"
            autoFocus
          />
          <textarea
            rows={4}
            placeholder="Escreva livremente aqui (markdown suportado)..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-[#0a0a0f] border border-[#1e1e30] text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500/60 resize-none font-sans"
          />
          <input
            type="text"
            placeholder="Tags separadas por vírgula (ex: requisitos, arquitetura)"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-[#0a0a0f] border border-[#1e1e30] text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500/60"
          />
          <div className="flex justify-end gap-2 pt-2">
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
              Salvar Nota
            </button>
          </div>
        </form>
      )}

      {/* Notes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {projectNotes.length === 0 ? (
          <div className="col-span-2 py-12 text-center rounded-xl bg-[#0f0f1a] border border-[#1e1e30] text-slate-500 text-xs">
            Nenhuma anotação vinculada a este projeto ainda.
          </div>
        ) : (
          projectNotes.map((note) => (
            <div
              key={note.id}
              className="group relative flex flex-col justify-between p-4 rounded-xl bg-[#0f0f1a] border border-[#1e1e30] hover:border-violet-500/40 transition-all duration-200"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-100 group-hover:text-violet-300 transition-colors">
                    {note.title}
                  </h4>
                  <button
                    onClick={() => deleteNote(note.id)}
                    className="opacity-70 sm:opacity-0 sm:group-hover:opacity-100 p-1.5 text-slate-500 hover:text-red-400 transition-opacity touch-manipulation"
                    title="Remover nota"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
                <p className="text-xs text-slate-400 whitespace-pre-wrap leading-relaxed">
                  {note.content}
                </p>
              </div>

              <div className="flex items-center justify-between mt-4 pt-2 border-t border-[#1e1e30] text-[10px] text-slate-500">
                <div className="flex items-center gap-1 flex-wrap">
                  {note.tags.map((t) => (
                    <span key={t} className="px-1.5 py-0.5 rounded bg-[#14141f] text-slate-400 border border-[#1e1e30]">
                      #{t}
                    </span>
                  ))}
                </div>
                <span>{new Date(note.createdAt).toLocaleDateString("pt-BR")}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

