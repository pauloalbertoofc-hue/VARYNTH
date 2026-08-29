"use client";

import React, { useRef, useState, useEffect } from "react";
import {
  Heading1,
  Heading2,
  Heading3,
  Bold,
  Italic,
  Code,
  Quote,
  List,
  Link,
  Table,
  Sparkles,
} from "lucide-react";

interface DocumentEditorProps {
  content: string;
  onChange: (newContent: string) => void;
  onAskAthenaAboutSelection?: (selectedText: string) => void;
}

export function DocumentEditor({
  content,
  onChange,
  onAskAthenaAboutSelection,
}: DocumentEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [selectedText, setSelectedText] = useState("");

  const handleSelection = () => {
    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      const text = textareaRef.current.value.substring(start, end);
      setSelectedText(text);
    }
  };

  const insertSnippet = (before: string, after: string = "", placeholder: string = "") => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const currentVal = textareaRef.current.value;

    const selection = currentVal.substring(start, end) || placeholder;
    const replacement = `${before}${selection}${after}`;

    const nextVal =
      currentVal.substring(0, start) + replacement + currentVal.substring(end);

    onChange(nextVal);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(
          start + before.length,
          start + before.length + selection.length
        );
      }
    }, 10);
  };

  return (
    <div className="flex flex-col h-full bg-[#08080e] relative">
      {/* Editor Toolbar */}
      <div className="h-10 border-b border-[#1c1c2e] bg-[#0c0c16] px-3 flex items-center gap-1 shrink-0 overflow-x-auto">
        <button
          onClick={() => insertSnippet("# ", "", "Título Principal")}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-[#1e1e32] rounded transition"
          title="Título 1 (H1)"
        >
          <Heading1 size={15} />
        </button>
        <button
          onClick={() => insertSnippet("## ", "", "Subtítulo")}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-[#1e1e32] rounded transition"
          title="Título 2 (H2)"
        >
          <Heading2 size={15} />
        </button>
        <button
          onClick={() => insertSnippet("### ", "", "Seção")}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-[#1e1e32] rounded transition"
          title="Título 3 (H3)"
        >
          <Heading3 size={15} />
        </button>

        <div className="w-[1px] h-4 bg-[#232338] mx-1" />

        <button
          onClick={() => insertSnippet("**", "**", "texto em negrito")}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-[#1e1e32] rounded transition"
          title="Negrito"
        >
          <Bold size={15} />
        </button>
        <button
          onClick={() => insertSnippet("*", "*", "texto em itálico")}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-[#1e1e32] rounded transition"
          title="Itálico"
        >
          <Italic size={15} />
        </button>
        <button
          onClick={() => insertSnippet("`", "`", "código inline")}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-[#1e1e32] rounded transition"
          title="Código inline"
        >
          <Code size={15} />
        </button>
        <button
          onClick={() => insertSnippet("> ", "", "Citação ou jurisprudência")}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-[#1e1e32] rounded transition"
          title="Citação em bloco"
        >
          <Quote size={15} />
        </button>
        <button
          onClick={() => insertSnippet("- ", "", "Item da lista")}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-[#1e1e32] rounded transition"
          title="Lista"
        >
          <List size={15} />
        </button>
        <button
          onClick={() => insertSnippet("[", "](url)", "Texto do Link")}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-[#1e1e32] rounded transition"
          title="Inserir Link"
        >
          <Link size={15} />
        </button>
        <button
          onClick={() =>
            insertSnippet(
              "\n| Cabeçalho 1 | Cabeçalho 2 |\n| ----------- | ----------- |\n| Item 1      | Item 2      |\n"
            )
          }
          className="p-1.5 text-slate-400 hover:text-white hover:bg-[#1e1e32] rounded transition"
          title="Tabela Básica"
        >
          <Table size={15} />
        </button>

        {selectedText && onAskAthenaAboutSelection && (
          <div className="ml-auto">
            <button
              onClick={() => onAskAthenaAboutSelection(selectedText)}
              className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded text-xs flex items-center gap-1.5 transition"
            >
              <Sparkles size={12} />
              Reescrever Seleção com Athena
            </button>
          </div>
        )}
      </div>

      {/* Editor Textarea */}
      <div className="flex-1 p-6 overflow-y-auto">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => onChange(e.target.value)}
          onSelect={handleSelection}
          onKeyUp={handleSelection}
          placeholder="Escreva seu documento em Markdown..."
          className="w-full h-full bg-transparent text-slate-200 resize-none outline-none font-mono text-sm leading-relaxed placeholder:text-slate-600"
          spellCheck={false}
        />
      </div>
    </div>
  );
}

