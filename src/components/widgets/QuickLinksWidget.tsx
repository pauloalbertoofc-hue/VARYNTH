"use client";

import { useState, useEffect } from "react";
import { Link2, Plus, ExternalLink, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Surface } from "@/components/ui/Surface";

interface QuickLink {
  id: string;
  title: string;
  url: string;
  color?: string;
  isCustom?: boolean;
}

const DEFAULT_LINKS: QuickLink[] = [
  { id: "github", title: "GitHub", url: "https://github.com", color: "text-[var(--vly-text-secondary)] border-[var(--vly-border-default)] bg-[var(--vly-surface-raised)]" },
  { id: "vercel", title: "Vercel", url: "https://vercel.com", color: "text-[var(--vly-text-primary)] border-[var(--vly-border-default)] bg-[var(--vly-world)]" },
  { id: "chatgpt", title: "ChatGPT", url: "https://chatgpt.com", color: "text-[var(--vly-success)] border-[var(--vly-border-success)] bg-[var(--vly-success)]/10" },
  { id: "nextjs", title: "Next.js Docs", url: "https://nextjs.org/docs", color: "text-[var(--vly-info)] border-[var(--vly-border-info)] bg-[var(--vly-info)]/10" },
];

export function QuickLinksWidget() {
  const [links, setLinks] = useState<QuickLink[]>(DEFAULT_LINKS);
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newUrl, setNewUrl] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("varynth_quicklinks");
      if (saved) {
        const parsed = JSON.parse(saved);
        setLinks(parsed);
      }
    } catch {
      // ignore
    }
  }, []);

  const saveLinks = (updated: QuickLink[]) => {
    setLinks(updated);
    try {
      localStorage.setItem("varynth_quicklinks", JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const handleAddLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newUrl.trim()) return;

    let formattedUrl = newUrl.trim();
    if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
      formattedUrl = "https://" + formattedUrl;
    }

    const newLink: QuickLink = {
      id: "custom-" + Date.now(),
      title: newTitle.trim(),
      url: formattedUrl,
      color: "text-[var(--vly-accent)] border-[var(--vly-border-accent)] bg-[var(--vly-accent)]/10",
      isCustom: true,
    };

    const updated = [...links, newLink];
    saveLinks(updated);
    setNewTitle("");
    setNewUrl("");
    setIsAdding(false);
  };

  const handleDeleteLink = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const updated = links.filter((l) => l.id !== id);
    saveLinks(updated);
  };

  return (
    <Surface tone="panel" className="relative flex flex-col justify-between p-5 clip-corner-sm group vly-interactive">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-[var(--vly-accent)] tracking-wider uppercase">
          <Link2 size={14} />
          <span>Atalhos Rápidos</span>
        </div>
        <button
          type="button"
          onClick={() => setIsAdding(!isAdding)}
          aria-expanded={isAdding}
          aria-controls="quick-links-add-form"
          className="vly-interactive flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium bg-[var(--vly-surface-raised)] border border-[var(--vly-border-subtle)] text-[var(--vly-text-secondary)] hover:text-[var(--vly-accent)] hover:border-[var(--vly-border-accent)] transition-all"
        >
          {isAdding ? <X size={12} /> : <Plus size={12} />}
          <span>{isAdding ? "Cancelar" : "Novo Link"}</span>
        </button>
      </div>

      {/* Add Form */}
      {isAdding && (
        <form id="quick-links-add-form" onSubmit={handleAddLink} className="mb-3 space-y-2 rounded-lg border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-raised)] p-3">
          <div className="flex gap-2">
            <input
              type="text"
              aria-label="Nome do atalho"
              placeholder="Nome (Ex: GitHub, Docs)"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="vly-field flex-1 px-2.5 py-1.5 rounded text-xs"
              autoFocus
            />
            <input
              type="text"
              aria-label="URL do atalho"
              placeholder="URL (Ex: github.com)"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              className="vly-field flex-1 px-2.5 py-1.5 rounded text-xs"
            />
          </div>
          <button
            type="submit"
            className="vly-interactive w-full py-1.5 rounded text-xs font-medium bg-[var(--vly-accent)] hover:opacity-90 text-[var(--vly-accent-contrast)] transition-colors"
          >
            Adicionar Atalho
          </button>
        </form>
      )}

      {/* Links Grid */}
      <div className="grid grid-cols-2 gap-2 my-1">
        {links.map((link) => (
          <div key={link.id} className="group/item relative">
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Abrir ${link.title} em nova aba`}
              className={cn(
                "flex items-center justify-between rounded-lg border p-2.5 pr-8 text-xs font-medium transition-all duration-200",
                link.color || "text-[var(--vly-text-secondary)] border-[var(--vly-border-subtle)] bg-[var(--vly-surface-raised)]",
                "vly-interactive hover:scale-[1.02] hover:shadow-sm"
              )}
            >
              <span className="truncate">{link.title}</span>
              <ExternalLink size={11} className="opacity-60 group-hover/item:opacity-100" />
            </a>
            <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
              {link.isCustom && (
                <button
                  type="button"
                  onClick={(e) => handleDeleteLink(link.id, e)}
                  aria-label={`Remover ${link.title}`}
                  className="vly-interactive opacity-0 group-hover/item:opacity-100 p-0.5 hover:text-[var(--vly-danger)] transition-opacity"
                  title="Remover link"
                >
                  <Trash2 size={11} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div aria-live="polite" className="mt-2 border-t border-[var(--vly-border-subtle)] pt-2 text-[11px] text-[var(--vly-text-muted)]">
        <span>{links.length} links configurados</span>
      </div>
    </Surface>
  );
}
