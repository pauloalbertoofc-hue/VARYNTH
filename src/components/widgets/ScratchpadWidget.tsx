"use client";

import { useState, useEffect } from "react";
import { FileText, Copy, Trash2, Check } from "lucide-react";
import { Surface } from "@/components/ui/Surface";

export function ScratchpadWidget() {
  const [content, setContent] = useState("");
  const [copied, setCopied] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("varynth_scratchpad");
      if (saved !== null) {
        setContent(saved);
      }
    } catch {
      // LocalStorage error fallback
    }
    setIsLoaded(true);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);
    try {
      localStorage.setItem("varynth_scratchpad", val);
    } catch {
      // ignore
    }
  };

  const handleCopy = async () => {
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleClear = () => {
    if (content && window.confirm("Deseja realmente limpar suas anotações?")) {
      setContent("");
      try {
        localStorage.removeItem("varynth_scratchpad");
      } catch {
        // ignore
      }
    }
  };

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charCount = content.length;

  return (
    <Surface tone="panel" role="article" aria-label="Anotações rápidas" className="relative flex flex-col justify-between p-5 clip-corner-sm group vly-interactive">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold text-[var(--vly-accent)] tracking-wider uppercase">
          <FileText size={14} />
          <span>Anotações Rápidas</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleCopy}
            disabled={!content}
            aria-label={copied ? "Texto copiado" : "Copiar anotações"}
            className="vly-interactive flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium bg-[var(--vly-surface-raised)] border border-[var(--vly-border-subtle)] text-[var(--vly-text-secondary)] hover:text-[var(--vly-text-primary)] hover:border-[var(--vly-border-strong)] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            title="Copiar texto"
          >
            {copied ? <Check size={12} className="text-[var(--vly-success)]" /> : <Copy size={12} />}
            <span>{copied ? "Copiado!" : "Copiar"}</span>
          </button>
          <button
            type="button"
            onClick={handleClear}
            disabled={!content}
            aria-label="Limpar anotações"
            className="vly-interactive p-1 rounded text-[11px] bg-[var(--vly-surface-raised)] border border-[var(--vly-border-subtle)] text-[var(--vly-text-secondary)] hover:text-[var(--vly-danger)] hover:border-[var(--vly-border-danger)] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            title="Limpar notas"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Text Area */}
      <div className="my-3 flex-1 min-h-[110px]">
        {isLoaded ? (
          <textarea
            id="scratchpad-content"
            value={content}
            onChange={handleChange}
            aria-label="Rascunho rápido"
            placeholder="Digite algo para salvar instantaneamente (ideias, tarefas, códigos)..."
            className="vly-field w-full h-full min-h-[110px] rounded-md p-3 text-xs resize-none font-sans"
          />
        ) : (
          <div className="w-full h-[110px] bg-[var(--vly-surface-raised)] rounded-md vly-motion-loading" />
        )}
      </div>

      {/* Footer / Stats */}
      <div aria-live="polite" className="flex items-center justify-between text-[11px] text-[var(--vly-text-muted)] pt-2 border-t border-[var(--vly-border-subtle)]">
        <span>Salvo localmente</span>
        <span>
          {charCount} caracteres · {wordCount} palavras
        </span>
      </div>
    </Surface>
  );
}
