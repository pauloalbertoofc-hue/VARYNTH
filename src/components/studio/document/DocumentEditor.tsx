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
    <section aria-label="Editor de documento Markdown" className="relative flex h-full flex-col bg-[var(--vly-surface)]">
      {/* Editor Toolbar */}
      <div role="toolbar" aria-label="Ferramentas de formatação Markdown" className="flex h-10 shrink-0 items-center gap-1 overflow-x-auto border-b border-[var(--vly-border-default)] bg-[var(--vly-surface-raised)] px-3">
        <button
          type="button"
          aria-label="Inserir título H1"
          onClick={() => insertSnippet("# ", "", "Título Principal")}
          className="vly-interactive rounded p-1.5 text-[var(--vly-text-secondary)] hover:bg-[var(--vly-surface-hover)] hover:text-[var(--vly-text-primary)]"
          title="Título 1 (H1)"
        >
          <Heading1 size={15} />
        </button>
        <button
          type="button"
          aria-label="Inserir título H2"
          onClick={() => insertSnippet("## ", "", "Subtítulo")}
          className="vly-interactive rounded p-1.5 text-[var(--vly-text-secondary)] hover:bg-[var(--vly-surface-hover)] hover:text-[var(--vly-text-primary)]"
          title="Título 2 (H2)"
        >
          <Heading2 size={15} />
        </button>
        <button
          type="button"
          aria-label="Inserir título H3"
          onClick={() => insertSnippet("### ", "", "Seção")}
          className="vly-interactive rounded p-1.5 text-[var(--vly-text-secondary)] hover:bg-[var(--vly-surface-hover)] hover:text-[var(--vly-text-primary)]"
          title="Título 3 (H3)"
        >
          <Heading3 size={15} />
        </button>

        <div className="mx-1 h-4 w-px bg-[var(--vly-border-default)]" />

        <button
          onClick={() => insertSnippet("**", "**", "texto em negrito")}
          className="vly-interactive rounded p-1.5 text-[var(--vly-text-secondary)] hover:bg-[var(--vly-surface-hover)] hover:text-[var(--vly-text-primary)]"
          title="Negrito"
        >
          <Bold size={15} />
        </button>
        <button
          onClick={() => insertSnippet("*", "*", "texto em itálico")}
          className="vly-interactive rounded p-1.5 text-[var(--vly-text-secondary)] hover:bg-[var(--vly-surface-hover)] hover:text-[var(--vly-text-primary)]"
          title="Itálico"
        >
          <Italic size={15} />
        </button>
        <button
          onClick={() => insertSnippet("`", "`", "código inline")}
          className="vly-interactive rounded p-1.5 text-[var(--vly-text-secondary)] hover:bg-[var(--vly-surface-hover)] hover:text-[var(--vly-text-primary)]"
          title="Código inline"
        >
          <Code size={15} />
        </button>
        <button
          onClick={() => insertSnippet("> ", "", "Citação ou jurisprudência")}
          className="vly-interactive rounded p-1.5 text-[var(--vly-text-secondary)] hover:bg-[var(--vly-surface-hover)] hover:text-[var(--vly-text-primary)]"
          title="Citação em bloco"
        >
          <Quote size={15} />
        </button>
        <button
          onClick={() => insertSnippet("- ", "", "Item da lista")}
          className="vly-interactive rounded p-1.5 text-[var(--vly-text-secondary)] hover:bg-[var(--vly-surface-hover)] hover:text-[var(--vly-text-primary)]"
          title="Lista"
        >
          <List size={15} />
        </button>
        <button
          onClick={() => insertSnippet("[", "](url)", "Texto do Link")}
          className="vly-interactive rounded p-1.5 text-[var(--vly-text-secondary)] hover:bg-[var(--vly-surface-hover)] hover:text-[var(--vly-text-primary)]"
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
          className="vly-interactive rounded p-1.5 text-[var(--vly-text-muted)] transition hover:bg-[var(--vly-surface-raised)] hover:text-[var(--vly-text-primary)]"
          title="Tabela Básica"
        >
          <Table size={15} />
        </button>

        {selectedText && onAskAthenaAboutSelection && (
          <div className="ml-auto">
            <button
              onClick={() => onAskAthenaAboutSelection(selectedText)}
              className="vly-interactive flex items-center gap-1.5 rounded border border-[var(--vly-border-warning)] bg-[var(--vly-surface-warning)] px-2 py-1 text-xs text-[var(--vly-warning)]"
            >
              <Sparkles size={12} />
              Reescrever Seleção com Athena
            </button>
          </div>
        )}
      </div>

      {/* Editor Textarea */}
      <div className="flex-1 overflow-y-auto bg-[var(--vly-world)] p-6">
        <textarea
          aria-label="Conteúdo do documento em Markdown"
          ref={textareaRef}
          value={content}
          onChange={(e) => onChange(e.target.value)}
          onSelect={handleSelection}
          onKeyUp={handleSelection}
          placeholder="Escreva seu documento em Markdown..."
          className="h-full w-full resize-none bg-transparent font-mono text-sm leading-relaxed text-[var(--vly-text-primary)] outline-none placeholder:text-[var(--vly-text-muted)]"
          spellCheck={false}
        />
      </div>
    </section>
  );
}
