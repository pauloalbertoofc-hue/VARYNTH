"use client";

import React from "react";
import { DocumentSuggestion } from "@/lib/studio/document/types";
import { Sparkles, Check, X } from "lucide-react";

interface DocumentSuggestionPanelProps {
  suggestions: DocumentSuggestion[];
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
}

export function DocumentSuggestionPanel({
  suggestions,
  onAccept,
  onReject,
}: DocumentSuggestionPanelProps) {
  const pending = suggestions.filter((s) => s.status === "PENDING");

  return (
    <section aria-label="Sugestões da Athena" className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between border-b border-[var(--vly-border-subtle)] pb-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--vly-warning)]">
          <Sparkles size={13} />
          <span>Sugestões da Athena</span>
        </div>
        <span className="rounded border border-[var(--vly-border-warning)] bg-[var(--vly-warning)]/10 px-1.5 py-0.5 text-[10px] text-[var(--vly-warning)]">
          {pending.length} pendentes
        </span>
      </div>

      {pending.length === 0 ? (
        <p role="status" className="mt-1 text-xs italic text-[var(--vly-text-muted)]">
          Nenhuma sugestão pendente no momento. Selecione um trecho e peça revisões à Athena.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {pending.map((sug) => (
            <article key={sug.id} className="flex flex-col gap-2 rounded-lg border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-raised)] p-3 text-xs">
              {sug.rationale && (
                <p className="text-[11px] italic text-[var(--vly-warning)]">
                  &quot;{sug.rationale}&quot;
                </p>
              )}

              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold uppercase text-[var(--vly-danger)]">Original:</span>
                <p className="rounded border border-[var(--vly-border-danger)] bg-[var(--vly-danger)]/5 p-1.5 font-mono text-[11px] text-[var(--vly-text-muted)] line-through">
                  {sug.originalText}
                </p>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold uppercase text-[var(--vly-success)]">Proposto:</span>
                <p className="rounded border border-[var(--vly-border-success)] bg-[var(--vly-success)]/5 p-1.5 font-mono text-[11px] text-[var(--vly-text-secondary)]">
                  {sug.proposedText}
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-[var(--vly-border-subtle)] pt-2">
                <button
                  onClick={() => onReject(sug.id)}
                  className="vly-interactive flex items-center gap-1 rounded px-2 py-1 text-[11px] text-[var(--vly-text-muted)] transition hover:bg-[var(--vly-danger)]/20 hover:text-[var(--vly-danger)]"
                >
                  <X size={12} /> Rejeitar
                </button>
                <button
                  onClick={() => onAccept(sug.id)}
                  className="vly-interactive flex items-center gap-1 rounded bg-[var(--vly-success)] px-2.5 py-1 text-[11px] font-medium text-[var(--vly-text-on-accent)] transition hover:opacity-90"
                >
                  <Check size={12} /> Aceitar
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

