"use client";

import React, { useState, useRef } from "react";
import { WebFileItem } from "@/lib/studio/web/types";
import { Sparkles, Search, X } from "lucide-react";

interface WebCodeEditorProps {
  files: WebFileItem[];
  activeFile?: WebFileItem;
  onContentChange: (path: string, newContent: string) => void;
  onAskAthenaAboutSelection?: (selection: string, activePath: string) => void;
}

export function WebCodeEditor({
  files,
  activeFile,
  onContentChange,
  onAskAthenaAboutSelection,
}: WebCodeEditorProps) {
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [replaceTerm, setReplaceTerm] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  if (!activeFile) {
    return (
      <div role="status" className="flex h-full items-center justify-center bg-[var(--vly-world)] text-xs text-[var(--vly-text-muted)]">
        Selecione um arquivo na árvore lateral para iniciar a edição.
      </div>
    );
  }

  const lines = activeFile.content.split("\n");

  const handleAskAthena = () => {
    if (textareaRef.current && onAskAthenaAboutSelection) {
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      const sel = activeFile.content.substring(start, end);
      if (sel.trim()) {
        onAskAthenaAboutSelection(sel.trim(), activeFile.path);
      } else {
        onAskAthenaAboutSelection(activeFile.content, activeFile.path);
      }
    }
  };

  const handleReplaceAll = () => {
    if (searchTerm) {
      const updated = activeFile.content.replaceAll(searchTerm, replaceTerm);
      onContentChange(activeFile.path, updated);
    }
  };

  return (
    <div className="flex h-full select-none flex-col overflow-hidden bg-[var(--vly-world)] text-[var(--vly-text-secondary)]">
      {/* Editor Toolbar */}
      <div role="toolbar" aria-label="Ferramentas do editor de código" className="flex items-center justify-between border-b border-[var(--vly-border-subtle)] bg-[var(--vly-surface)] px-4 py-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-mono font-semibold text-[var(--vly-accent)]">{activeFile.path}</span>
          <span className="rounded bg-[var(--vly-surface-raised)] px-2 py-0.5 text-[10px] uppercase text-[var(--vly-text-muted)]">
            {activeFile.language}
          </span>
          <span className="font-mono text-[10px] text-[var(--vly-text-muted)]">
            {lines.length} linhas | {activeFile.content.length} caracteres
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSearch(!showSearch)}
            aria-label="Localizar e substituir"
            aria-pressed={showSearch}
            className={`vly-interactive rounded p-1.5 transition ${
              showSearch ? "bg-[var(--vly-accent)]/30 text-[var(--vly-accent)]" : "text-[var(--vly-text-muted)] hover:bg-[var(--vly-surface-hover)]"
            }`}
            title="Localizar e Substituir"
          >
            <Search size={14} />
          </button>
          <button
            onClick={handleAskAthena}
            className="vly-interactive flex items-center gap-1.5 rounded border border-[var(--vly-border-warning)] bg-[var(--vly-warning)]/10 px-2.5 py-1 text-xs text-[var(--vly-warning)] transition hover:bg-[var(--vly-warning)]/20"
            title="Pedir assistência da Athena sobre este código"
          >
            <Sparkles size={12} />
            Pedir à Athena
          </button>
        </div>
      </div>

      {/* Search & Replace Floating Bar */}
      {showSearch && (
        <div role="search" className="flex items-center gap-3 border-b border-[var(--vly-border-subtle)] bg-[var(--vly-surface-raised)] px-4 py-2 text-xs">
          <input
            type="text"
            placeholder="Localizar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Texto para localizar"
            className="vly-field px-2 py-1 text-xs outline-none"
          />
          <input
            type="text"
            placeholder="Substituir por..."
            value={replaceTerm}
            onChange={(e) => setReplaceTerm(e.target.value)}
            aria-label="Texto para substituir"
            className="vly-field px-2 py-1 text-xs outline-none"
          />
          <button
            onClick={handleReplaceAll}
            className="vly-interactive rounded bg-[var(--vly-accent)] px-2.5 py-1 text-xs text-[var(--vly-text-on-accent)] transition hover:opacity-90"
          >
            Substituir Todos
          </button>
          <button onClick={() => setShowSearch(false)} aria-label="Fechar localizar e substituir" className="vly-interactive ml-auto text-[var(--vly-text-muted)] hover:text-[var(--vly-text-primary)]">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Line Numbers + Code Editor Area */}
      <div className="flex-1 flex overflow-hidden font-mono text-xs select-text">
        {/* Line Numbers Column */}
        <div aria-hidden="true" className="w-12 select-none overflow-hidden border-r border-[var(--vly-border-subtle)] bg-[var(--vly-world)] py-3 pr-3 text-right text-[var(--vly-text-disabled)]">
          {lines.map((_, i) => (
            <div key={i} className="leading-6 text-[11px]">
              {i + 1}
            </div>
          ))}
        </div>

        {/* Text Area */}
        <textarea
          ref={textareaRef}
          value={activeFile.content}
          onChange={(e) => onContentChange(activeFile.path, e.target.value)}
          spellCheck={false}
          aria-label={`Editor de código ${activeFile.path}`}
          className="flex-1 resize-none overflow-y-auto border-none bg-transparent p-3 font-mono text-xs leading-6 text-[var(--vly-text-primary)] outline-none"
        />
      </div>
    </div>
  );
}

