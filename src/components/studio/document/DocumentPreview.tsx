"use client";

import React from "react";
import { StatePanel } from "@/components/ui/StatePanel";

interface DocumentPreviewProps {
  content: string;
}

export function DocumentPreview({ content }: DocumentPreviewProps) {
  // Simple deterministic renderer for markdown blocks
  const renderBlocks = () => {
    if (!content.trim()) {
      return <StatePanel tone="empty" title="Documento vazio" description="Digite algo no editor para visualizar a prévia." />;
    }

    const lines = content.split("\n");
    const elements: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeBuffer: string[] = [];

    lines.forEach((line, index) => {
      if (line.startsWith("```")) {
        if (inCodeBlock) {
          elements.push(
            <pre key={`code-${index}`} className="my-3 overflow-x-auto rounded-lg border border-[var(--vly-border-default)] bg-[var(--vly-surface)] p-3 font-mono text-xs text-[var(--vly-success)]">
              <code>{codeBuffer.join("\n")}</code>
            </pre>
          );
          codeBuffer = [];
          inCodeBlock = false;
        } else {
          inCodeBlock = true;
        }
        return;
      }

      if (inCodeBlock) {
        codeBuffer.push(line);
        return;
      }

      if (line.startsWith("# ")) {
        elements.push(
          <h1 key={index} className="mb-3 mt-6 border-b border-[var(--vly-border-subtle)] pb-2 text-2xl font-bold text-[var(--vly-text-primary)]">
            {line.replace("# ", "")}
          </h1>
        );
      } else if (line.startsWith("## ")) {
        elements.push(
          <h2 key={index} className="mb-2 mt-5 text-xl font-semibold text-[var(--vly-text-primary)]">
            {line.replace("## ", "")}
          </h2>
        );
      } else if (line.startsWith("### ")) {
        elements.push(
          <h3 key={index} className="mb-2 mt-4 text-base font-semibold text-[var(--vly-info)]">
            {line.replace("### ", "")}
          </h3>
        );
      } else if (line.startsWith("> ")) {
        elements.push(
          <blockquote key={index} className="my-3 rounded-r border-l-4 border-[var(--vly-border-info)] bg-[var(--vly-info)]/5 px-4 py-2 text-sm italic text-[var(--vly-text-secondary)]">
            {line.replace("> ", "")}
          </blockquote>
        );
      } else if (line.startsWith("- ")) {
        elements.push(
          <li key={index} className="my-1 ml-5 list-disc text-sm text-[var(--vly-text-secondary)]">
            {line.replace("- ", "")}
          </li>
        );
      } else if (line.startsWith("---")) {
        elements.push(<hr key={index} className="my-6 border-[var(--vly-border-default)]" />);
      } else if (line.trim().length > 0) {
        elements.push(
          <p key={index} className="my-2 text-sm leading-relaxed text-[var(--vly-text-secondary)]">
            {line}
          </p>
        );
      }
    });

    return elements;
  };

  return (
    <article aria-label="Pré-visualização do documento" className="mx-auto flex w-full max-w-4xl flex-1 overflow-y-auto bg-[var(--vly-surface)] p-8">
      <div className="prose prose-invert max-w-none">{renderBlocks()}</div>
    </article>
  );
}
