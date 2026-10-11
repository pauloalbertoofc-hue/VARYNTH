"use client";

import { useState } from "react";
import { ProjectReference } from "@/lib/types";
import { useVarynthStore } from "@/lib/store/useVarynthStore";
import { ExternalLink, Plus, Trash2 } from "lucide-react";
import { StatePanel } from "@/components/ui/StatePanel";
import { Surface } from "@/components/ui/Surface";

interface ProjectReferencesTabProps {
  projectId: string;
}

export function ProjectReferencesTab({ projectId }: ProjectReferencesTabProps) {
  const { references, addReference, deleteReference } = useVarynthStore();
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [url, setUrl] = useState("");
  const [type, setType] = useState<ProjectReference["type"]>("artigo");
  const [notes, setNotes] = useState("");

  const projectRefs = references.filter((r) => r.projectId === projectId);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    addReference({
      projectId,
      title: title.trim(),
      author: author.trim() || undefined,
      url: url.trim() || undefined,
      type,
      notes: notes.trim() || undefined,
    });

    setTitle("");
    setAuthor("");
    setUrl("");
    setNotes("");
    setIsAdding(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-[var(--vly-text-secondary)] uppercase tracking-wider">
          Referências, Doutrina & Links ({projectRefs.length})
        </h3>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-1.5 rounded-lg bg-[var(--vly-accent)] px-3 py-1.5 text-xs font-semibold text-[var(--vly-accent-contrast)] transition-colors hover:opacity-90"
        >
          <Plus size={14} />
          <span>Nova Referência</span>
        </button>
      </div>

      {/* Add Form */}
      {isAdding && (
        <form onSubmit={handleCreate} className="p-4 rounded-[var(--vly-radius-lg)] bg-[var(--vly-surface-raised)] border border-[var(--vly-border-strong)] space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              required
              placeholder="Título da obra / referência / lei *"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="vly-field sm:col-span-2 px-3 py-2 text-xs"
              autoFocus
            />
            <select
              value={type}
              onChange={(e) => setType(e.target.value as ProjectReference["type"])}
              className="vly-field px-2.5 py-2 text-xs"
            >
              <option value="artigo">Artigo Científico</option>
              <option value="livro">Livro / Doutrina</option>
              <option value="jurisprudencia">Jurisprudência</option>
              <option value="lei">Legislação</option>
              <option value="site">Página Web</option>
              <option value="video">Vídeo / Aula</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Autor / Origem (ex: STF, Vaswani et al.)"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="vly-field px-3 py-2 text-xs"
            />
            <input
              type="url"
              placeholder="URL / Link de acesso (https://...)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="vly-field px-3 py-2 text-xs"
            />
          </div>

          <textarea
            rows={2}
            placeholder="Anotações ou trecho relevante..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="vly-field w-full resize-none px-3 py-2 text-xs"
          />

          <div className="flex justify-end gap-2 pt-1">
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
        </form>
      )}

      {/* List */}
      <div className="space-y-3">
        {projectRefs.length === 0 ? (
          <StatePanel tone="empty" className="bg-[var(--vly-surface)]" title="Nenhuma referência cadastrada" description="Adicione fontes, doutrina, legislação ou links para sustentar o raciocínio do projeto." action={<button type="button" onClick={() => setIsAdding(true)} className="vly-interactive rounded-[var(--vly-radius-md)] bg-[var(--vly-accent)] px-3 py-2 text-xs font-bold text-[var(--vly-accent-contrast)]"><Plus size={13} className="mr-1 inline" />Nova referência</button>} />
        ) : (
          projectRefs.map((ref) => (
            <Surface
              key={ref.id}
              tone="raised"
              className="group flex flex-col justify-between rounded-xl p-4 transition-all duration-200 hover:border-[var(--vly-accent)]/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded border border-[var(--vly-accent)]/20 bg-[var(--vly-accent)]/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-[var(--vly-accent)]">
                      {ref.type}
                    </span>
                    {ref.author && (
                      <span className="text-xs font-medium text-[var(--vly-text-secondary)]">{ref.author}</span>
                    )}
                  </div>
                  <h4 className="text-xs font-bold text-[var(--vly-text-secondary)] mt-1.5">{ref.title}</h4>
                  {ref.notes && (
                    <p className="text-xs text-[var(--vly-text-secondary)] mt-1 leading-relaxed bg-[var(--vly-world)]/60 p-2.5 rounded-lg border border-[var(--vly-border-subtle)]">
                      {ref.notes}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {ref.url && (
                    <a
                      href={ref.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-raised)] p-1.5 text-[var(--vly-text-secondary)] transition-colors hover:text-[var(--vly-accent)]"
                      title="Abrir link"
                    >
                      <ExternalLink size={13} />
                    </a>
                  )}
                  <button
                    onClick={() => deleteReference(ref.id)}
                    className="touch-manipulation p-1.5 text-[var(--vly-text-muted)] opacity-70 transition-opacity hover:text-[var(--vly-danger)] sm:opacity-0 sm:group-hover:opacity-100"
                    title="Remover referência"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </Surface>
          ))
        )}
      </div>
    </div>
  );
}
