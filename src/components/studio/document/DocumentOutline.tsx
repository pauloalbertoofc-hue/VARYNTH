"use client";

import React from "react";
import { DocumentHeading } from "@/lib/studio/document/types";
import { Hash } from "lucide-react";
import { StatePanel } from "@/components/ui/StatePanel";

interface DocumentOutlineProps {
  outline: DocumentHeading[];
  onSelectHeading?: (heading: DocumentHeading) => void;
}

export function DocumentOutline({ outline, onSelectHeading }: DocumentOutlineProps) {
  return (
    <nav aria-label="Outline do documento" className="flex flex-col gap-2 p-4">
      <div className="flex items-center justify-between border-b border-[var(--vly-border-default)] pb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--vly-text-secondary)]">Estrutura (Outline)</span>
        <span className="rounded bg-[var(--vly-surface-raised)] px-1.5 py-0.5 text-[10px] text-[var(--vly-text-muted)]">{outline.length} títulos</span>
      </div>

      {outline.length === 0 ? (
        <StatePanel tone="empty" title="Sem títulos" description="Use #, ## ou ### para estruturar o documento." />
      ) : (
        <div role="list" className="mt-1 flex flex-col gap-1">
          {outline.map((heading) => (
            <button
              key={heading.id}
              type="button"
              aria-label={`Ir para ${heading.text}`}
              onClick={() => onSelectHeading && onSelectHeading(heading)}
              className="vly-interactive flex items-center gap-1.5 truncate rounded px-2 py-1 text-left text-xs text-[var(--vly-text-secondary)] hover:bg-[var(--vly-surface-hover)] hover:text-[var(--vly-text-primary)]"
              style={{ paddingLeft: `${(heading.level - 1) * 12 + 8}px` }}
            >
              <Hash size={11} className="shrink-0 text-[var(--vly-info)]" />
              <span className="truncate">{heading.text}</span>
            </button>
          ))}
        </div>
      )}
    </nav>
  );
}
