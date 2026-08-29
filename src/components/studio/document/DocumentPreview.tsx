"use client";

import React from "react";

interface DocumentPreviewProps {
  content: string;
}

export function DocumentPreview({ content }: DocumentPreviewProps) {
  // Simple deterministic renderer for markdown blocks
  const renderBlocks = () => {
    if (!content.trim()) {
      return <p className="text-slate-500 italic">Documento vazio. Digite algo no editor.</p>;
    }

    const lines = content.split("\n");
    const elements: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeBuffer: string[] = [];

    lines.forEach((line, index) => {
      if (line.startsWith("```")) {
        if (inCodeBlock) {
          elements.push(
            <pre key={`code-${index}`} className="p-3 my-3 bg-[#0d0d16] border border-[#1e1e30] rounded-lg overflow-x-auto text-xs font-mono text-emerald-400">
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
          <h1 key={index} className="text-2xl font-bold text-white mt-6 mb-3 border-b border-[#222236] pb-2">
            {line.replace("# ", "")}
          </h1>
        );
      } else if (line.startsWith("## ")) {
        elements.push(
          <h2 key={index} className="text-xl font-semibold text-slate-100 mt-5 mb-2">
            {line.replace("## ", "")}
          </h2>
        );
      } else if (line.startsWith("### ")) {
        elements.push(
          <h3 key={index} className="text-base font-semibold text-blue-400 mt-4 mb-2">
            {line.replace("### ", "")}
          </h3>
        );
      } else if (line.startsWith("> ")) {
        elements.push(
          <blockquote key={index} className="border-l-4 border-blue-500/60 bg-blue-500/5 px-4 py-2 my-3 rounded-r text-sm text-slate-300 italic">
            {line.replace("> ", "")}
          </blockquote>
        );
      } else if (line.startsWith("- ")) {
        elements.push(
          <li key={index} className="ml-5 list-disc text-sm text-slate-300 my-1">
            {line.replace("- ", "")}
          </li>
        );
      } else if (line.startsWith("---")) {
        elements.push(<hr key={index} className="border-[#222236] my-6" />);
      } else if (line.trim().length > 0) {
        elements.push(
          <p key={index} className="text-sm leading-relaxed text-slate-300 my-2">
            {line}
          </p>
        );
      }
    });

    return elements;
  };

  return (
    <div className="flex-1 p-8 bg-[#0a0a12] overflow-y-auto max-w-4xl mx-auto w-full">
      <div className="prose prose-invert max-w-none">{renderBlocks()}</div>
    </div>
  );
}

