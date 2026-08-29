"use client";

import { useState, useEffect } from "react";
import { Link2, Plus, ExternalLink, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickLink {
  id: string;
  title: string;
  url: string;
  color?: string;
  isCustom?: boolean;
}

const DEFAULT_LINKS: QuickLink[] = [
  { id: "github", title: "GitHub", url: "https://github.com", color: "text-slate-300 border-slate-700 bg-slate-800/30" },
  { id: "vercel", title: "Vercel", url: "https://vercel.com", color: "text-white border-slate-700 bg-slate-900/40" },
  { id: "chatgpt", title: "ChatGPT", url: "https://chatgpt.com", color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" },
  { id: "nextjs", title: "Next.js Docs", url: "https://nextjs.org/docs", color: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10" },
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
      color: "text-violet-400 border-violet-500/30 bg-violet-500/10",
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
    <div className="relative flex flex-col justify-between p-5 rounded-lg bg-[#0f0f1a] border border-[#1e1e30] clip-corner-sm group hover:border-violet-500/40 transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-violet-400 tracking-wider uppercase">
          <Link2 size={14} />
          <span>Atalhos Rápidos</span>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium bg-[#14141f] border border-[#1e1e30] text-slate-300 hover:text-violet-300 hover:border-violet-500/40 transition-all"
        >
          {isAdding ? <X size={12} /> : <Plus size={12} />}
          <span>{isAdding ? "Cancelar" : "Novo Link"}</span>
        </button>
      </div>

      {/* Add Form */}
      {isAdding && (
        <form onSubmit={handleAddLink} className="mb-3 p-3 bg-[#0a0a0f] rounded-lg border border-[#1e1e30] space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Nome (Ex: GitHub, Docs)"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="flex-1 px-2.5 py-1.5 rounded bg-[#14141f] border border-[#1e1e30] text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500/60"
              autoFocus
            />
            <input
              type="text"
              placeholder="URL (Ex: github.com)"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              className="flex-1 px-2.5 py-1.5 rounded bg-[#14141f] border border-[#1e1e30] text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500/60"
            />
          </div>
          <button
            type="submit"
            className="w-full py-1.5 rounded text-xs font-medium bg-violet-600 hover:bg-violet-500 text-white transition-colors"
          >
            Adicionar Atalho
          </button>
        </form>
      )}

      {/* Links Grid */}
      <div className="grid grid-cols-2 gap-2 my-1">
        {links.map((link) => (
          <a
            key={link.id}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "group/item relative flex items-center justify-between p-2.5 rounded-lg border text-xs font-medium transition-all duration-200",
              link.color || "text-slate-300 border-[#1e1e30] bg-[#14141f]",
              "hover:scale-[1.02] hover:shadow-sm"
            )}
          >
            <span className="truncate mr-2">{link.title}</span>
            <div className="flex items-center gap-1">
              {link.isCustom && (
                <button
                  onClick={(e) => handleDeleteLink(link.id, e)}
                  className="opacity-0 group-hover/item:opacity-100 p-0.5 hover:text-red-400 transition-opacity"
                  title="Remover link"
                >
                  <Trash2 size={11} />
                </button>
              )}
              <ExternalLink size={11} className="opacity-60 group-hover/item:opacity-100" />
            </div>
          </a>
        ))}
      </div>

      {/* Footer */}
      <div className="text-[11px] text-slate-500 pt-2 border-t border-[#1e1e30] mt-2">
        <span>{links.length} links configurados</span>
      </div>
    </div>
  );
}

