"use client";

import { useState, useEffect } from "react";
import { FileText, Copy, Trash2, Check } from "lucide-react";

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
    <div className="relative flex flex-col justify-between p-5 rounded-lg bg-[#0f0f1a] border border-[#1e1e30] clip-corner-sm group hover:border-violet-500/40 transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold text-violet-400 tracking-wider uppercase">
          <FileText size={14} />
          <span>Anotações Rápidas</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleCopy}
            disabled={!content}
            className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium bg-[#14141f] border border-[#1e1e30] text-slate-400 hover:text-slate-200 hover:border-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            title="Copiar texto"
          >
            {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
            <span>{copied ? "Copiado!" : "Copiar"}</span>
          </button>
          <button
            onClick={handleClear}
            disabled={!content}
            className="p-1 rounded text-[11px] bg-[#14141f] border border-[#1e1e30] text-slate-400 hover:text-red-400 hover:border-red-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
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
            value={content}
            onChange={handleChange}
            placeholder="Digite algo para salvar instantaneamente (ideias, tarefas, códigos)..."
            className="w-full h-full min-h-[110px] bg-[#0a0a0f]/80 border border-[#1e1e30] rounded-md p-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500/60 transition-colors resize-none font-sans"
          />
        ) : (
          <div className="w-full h-[110px] bg-[#0a0a0f]/80 rounded-md animate-pulse" />
        )}
      </div>

      {/* Footer / Stats */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-[#1e1e30]">
        <span>Salvo localmente</span>
        <span>
          {charCount} caracteres · {wordCount} palavras
        </span>
      </div>
    </div>
  );
}

