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
      <div className="h-full flex items-center justify-center bg-[#0d0e17] text-slate-500 text-xs">
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
    <div className="h-full flex flex-col bg-[#0b0c16] text-slate-200 overflow-hidden select-none">
      {/* Editor Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#1c1d30] bg-[#111222] text-xs">
        <div className="flex items-center gap-2">
          <span className="font-mono text-blue-400 font-semibold">{activeFile.path}</span>
          <span className="text-[10px] text-slate-500 bg-[#181a30] px-2 py-0.5 rounded uppercase">
            {activeFile.language}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            {lines.length} linhas | {activeFile.content.length} caracteres
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className={`p-1.5 rounded transition ${
              showSearch ? "bg-blue-600/30 text-blue-300" : "hover:bg-[#1c1d32] text-slate-400"
            }`}
            title="Localizar e Substituir"
          >
            <Search size={14} />
          </button>
          <button
            onClick={handleAskAthena}
            className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded text-xs flex items-center gap-1.5 transition"
            title="Pedir assistência da Athena sobre este código"
          >
            <Sparkles size={12} />
            Pedir à Athena
          </button>
        </div>
      </div>

      {/* Search & Replace Floating Bar */}
      {showSearch && (
        <div className="px-4 py-2 bg-[#141528] border-b border-[#242646] flex items-center gap-3 text-xs">
          <input
            type="text"
            placeholder="Localizar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-2 py-1 bg-[#0b0c16] border border-[#2a2c4e] rounded text-white text-xs outline-none focus:border-blue-500"
          />
          <input
            type="text"
            placeholder="Substituir por..."
            value={replaceTerm}
            onChange={(e) => setReplaceTerm(e.target.value)}
            className="px-2 py-1 bg-[#0b0c16] border border-[#2a2c4e] rounded text-white text-xs outline-none focus:border-blue-500"
          />
          <button
            onClick={handleReplaceAll}
            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs transition"
          >
            Substituir Todos
          </button>
          <button onClick={() => setShowSearch(false)} className="text-slate-400 hover:text-white ml-auto">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Line Numbers + Code Editor Area */}
      <div className="flex-1 flex overflow-hidden font-mono text-xs select-text">
        {/* Line Numbers Column */}
        <div className="w-12 bg-[#090a12] text-slate-600 py-3 pr-3 text-right select-none border-r border-[#191a2e] overflow-hidden">
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
          className="flex-1 p-3 bg-transparent text-slate-100 outline-none resize-none leading-6 font-mono text-xs border-none overflow-y-auto"
        />
      </div>
    </div>
  );
}

