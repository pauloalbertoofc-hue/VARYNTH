"use client";

import { useState } from "react";
import { Note } from "@/lib/types";
import { useVarynthStore } from "@/lib/store/useVarynthStore";
import { Plus, Trash2 } from "lucide-react";
import { StatePanel } from "@/components/ui/StatePanel";
import { Surface } from "@/components/ui/Surface";

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
        <h3 className="text-xs font-bold text-[var(--vly-text-secondary)] uppercase tracking-wider">
          Notas & Fichamentos do Projeto ({projectNotes.length})
        </h3>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-1.5 rounded-lg bg-[var(--vly-accent)] px-3 py-1.5 text-xs font-semibold text-[var(--vly-accent-contrast)] transition-colors hover:opacity-90"
        >
          <Plus size={14} />
          <span>Nova Nota</span>
        </button>
      </div>

      {/* Add Form */}
      {isAdding && (
        <form onSubmit={handleCreate} className="p-4 rounded-[var(--vly-radius-lg)] bg-[var(--vly-surface-raised)] border border-[var(--vly-border-strong)] space-y-3">
          <input
            type="text"
            required
            placeholder="Título da anotação..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="vly-field w-full px-3 py-2 text-xs"
            autoFocus
          />
          <textarea
            rows={4}
            placeholder="Escreva livremente aqui (markdown suportado)..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="vly-field w-full resize-none px-3 py-2 text-xs font-sans"
          />
          <input
            type="text"
            placeholder="Tags separadas por vírgula (ex: requisitos, arquitetura)"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="vly-field w-full px-3 py-2 text-xs"
          />
          <div className="flex justify-end gap-2 pt-2">
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
              Salvar Nota
            </button>
          </div>
        </form>
      )}

      {/* Notes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {projectNotes.length === 0 ? (
          <div className="col-span-2"><StatePanel tone="empty" className="bg-[var(--vly-surface)]" title="Nenhuma anotação vinculada" description="Registre decisões, contexto ou referências para manter o conhecimento do projeto no Workspace." action={<button type="button" onClick={() => setIsAdding(true)} className="vly-interactive rounded-[var(--vly-radius-md)] bg-[var(--vly-accent)] px-3 py-2 text-xs font-bold text-[var(--vly-accent-contrast)]"><Plus size={13} className="mr-1 inline" />Nova nota</button>} /></div>
        ) : (
          projectNotes.map((note) => (
            <Surface
              key={note.id}
              tone="raised"
              className="group relative flex flex-col justify-between rounded-xl p-4 transition-all duration-200 hover:border-[var(--vly-accent)]/40"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-[var(--vly-text-primary)] transition-colors group-hover:text-[var(--vly-accent)]">
                    {note.title}
                  </h4>
                  <button
                    onClick={() => deleteNote(note.id)}
                    className="touch-manipulation p-1.5 text-[var(--vly-text-muted)] opacity-70 transition-opacity hover:text-[var(--vly-danger)] sm:opacity-0 sm:group-hover:opacity-100"
                    title="Remover nota"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
                <p className="text-xs text-[var(--vly-text-secondary)] whitespace-pre-wrap leading-relaxed">
                  {note.content}
                </p>
              </div>

              <div className="flex items-center justify-between mt-4 pt-2 border-t border-[var(--vly-border-subtle)] text-[10px] text-[var(--vly-text-muted)]">
                <div className="flex items-center gap-1 flex-wrap">
                  {note.tags.map((t) => (
                    <span key={t} className="px-1.5 py-0.5 rounded bg-[var(--vly-surface-raised)] text-[var(--vly-text-secondary)] border border-[var(--vly-border-subtle)]">
                      #{t}
                    </span>
                  ))}
                </div>
                <span>{new Date(note.createdAt).toLocaleDateString("pt-BR")}</span>
              </div>
            </Surface>
          ))
        )}
      </div>
    </div>
  );
}
