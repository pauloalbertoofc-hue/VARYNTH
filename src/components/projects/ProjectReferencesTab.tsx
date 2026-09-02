"use client";

import { useState } from "react";
import { ProjectReference } from "@/lib/types";
import { useVarynthStore } from "@/lib/store/useVarynthStore";
import { Link2, ExternalLink, Plus, Trash2, BookOpen, FileCode, Scale } from "lucide-react";
import { cn } from "@/lib/utils";

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
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
          Referências, Doutrina & Links ({projectRefs.length})
        </h3>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white transition-colors"
        >
          <Plus size={14} />
          <span>Nova Referência</span>
        </button>
      </div>

      {/* Add Form */}
      {isAdding && (
        <form onSubmit={handleCreate} className="p-4 rounded-xl bg-[#14141f] border border-[#2d2d4a] space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              required
              placeholder="Título da obra / referência / lei *"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="sm:col-span-2 px-3 py-2 rounded-lg bg-[#0a0a0f] border border-[#1e1e30] text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500/60"
              autoFocus
            />
            <select
              value={type}
              onChange={(e) => setType(e.target.value as ProjectReference["type"])}
              className="px-2.5 py-2 rounded-lg bg-[#0a0a0f] border border-[#1e1e30] text-xs text-slate-200 focus:outline-none"
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
              className="px-3 py-2 rounded-lg bg-[#0a0a0f] border border-[#1e1e30] text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500/60"
            />
            <input
              type="url"
              placeholder="URL / Link de acesso (https://...)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="px-3 py-2 rounded-lg bg-[#0a0a0f] border border-[#1e1e30] text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500/60"
            />
          </div>

          <textarea
            rows={2}
            placeholder="Anotações ou trecho relevante..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-[#0a0a0f] border border-[#1e1e30] text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500/60 resize-none"
          />

          <div className="flex justify-end gap-2 pt-1">
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
        </form>
      )}

      {/* List */}
      <div className="space-y-3">
        {projectRefs.length === 0 ? (
          <div className="py-12 text-center rounded-xl bg-[#0f0f1a] border border-[#1e1e30] text-slate-500 text-xs">
            Nenhuma referência bibliográfica cadastrada.
          </div>
        ) : (
          projectRefs.map((ref) => (
            <div
              key={ref.id}
              className="group flex flex-col justify-between p-4 rounded-xl bg-[#0f0f1a] border border-[#1e1e30] hover:border-violet-500/40 transition-all duration-200"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20 font-semibold uppercase">
                      {ref.type}
                    </span>
                    {ref.author && (
                      <span className="text-xs font-medium text-slate-400">{ref.author}</span>
                    )}
                  </div>
                  <h4 className="text-xs font-bold text-slate-200 mt-1.5">{ref.title}</h4>
                  {ref.notes && (
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed bg-[#0a0a0f]/60 p-2.5 rounded-lg border border-[#1e1e30]">
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
                      className="p-1.5 rounded-lg bg-[#14141f] border border-[#1e1e30] text-slate-400 hover:text-violet-300 transition-colors"
                      title="Abrir link"
                    >
                      <ExternalLink size={13} />
                    </a>
                  )}
                  <button
                    onClick={() => deleteReference(ref.id)}
                    className="opacity-70 sm:opacity-0 sm:group-hover:opacity-100 p-1.5 text-slate-500 hover:text-red-400 transition-opacity touch-manipulation"
                    title="Remover referência"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

