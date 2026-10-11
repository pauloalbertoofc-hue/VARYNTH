"use client";

import React from "react";
import { WebMultiFileChangeSet } from "@/lib/studio/web/types";
import { Sparkles, Check, X, FileCode, Plus, Minus, Edit3 } from "lucide-react";

interface WebMultiFileSuggestionModalProps {
  isOpen: boolean;
  changeSets: WebMultiFileChangeSet[];
  onAccept: (changeSetId: string) => void;
  onReject: (changeSetId: string) => void;
  onClose: () => void;
}

export function WebMultiFileSuggestionModal({
  isOpen,
  changeSets,
  onAccept,
  onReject,
  onClose,
}: WebMultiFileSuggestionModalProps) {
  if (!isOpen || changeSets.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--vly-world)]/75 p-4 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" aria-labelledby="web-suggestion-title" className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-floating)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--vly-border-subtle)] bg-[var(--vly-surface)] px-6 py-4">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-[var(--vly-warning)]" />
            <h3 id="web-suggestion-title" className="text-base font-bold text-[var(--vly-text-primary)]">Proposta Multi-Arquivo da Athena</h3>
          </div>
          <button onClick={onClose} aria-label="Fechar proposta multi-arquivo" className="vly-interactive rounded p-1 text-[var(--vly-text-muted)] hover:text-[var(--vly-text-primary)]">
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-6 overflow-y-auto p-6 text-[var(--vly-text-secondary)]">
          {changeSets.map((cs) => (
            <div key={cs.id} className="space-y-4 rounded-xl border border-[var(--vly-border-subtle)] bg-[var(--vly-world)] p-5">
              <div>
                <h4 className="text-sm font-bold text-[var(--vly-warning)]">{cs.title}</h4>
                <p className="mt-1 text-xs text-[var(--vly-text-muted)]">{cs.description}</p>
              </div>

              {/* Diffs List */}
              <div className="space-y-3">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--vly-text-muted)]">
                  Arquivos Impactados ({cs.changes.length})
                </span>

                {cs.changes.map((diff, idx) => (
                  <div key={idx} className="space-y-2 rounded-lg border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-raised)] p-3 text-xs">
                    <div className="flex items-center justify-between font-mono">
                      <div className="flex items-center gap-2 font-semibold text-[var(--vly-accent)]">
                        <FileCode size={14} />
                        <span>{diff.path}</span>
                      </div>
                      <span className="rounded bg-[var(--vly-accent)]/20 px-2 py-0.5 text-[10px] uppercase text-[var(--vly-accent)]">
                        {diff.type}
                      </span>
                    </div>

                    <p className="text-[11px] italic text-[var(--vly-text-muted)]">{diff.explanation}</p>

                    {diff.oldContent && (
                      <div className="line-clamp-3 rounded border border-[var(--vly-border-danger)] bg-[var(--vly-danger)]/10 p-2 font-mono text-[11px] text-[var(--vly-danger)]">
                        <span className="mb-1 block text-[9px] font-bold uppercase text-[var(--vly-danger)]">Anterior:</span>
                        {diff.oldContent}
                      </div>
                    )}

                    <div className="line-clamp-4 rounded border border-[var(--vly-border-success)] bg-[var(--vly-success)]/10 p-2 font-mono text-[11px] text-[var(--vly-success)]">
                      <span className="mb-1 block text-[9px] font-bold uppercase text-[var(--vly-success)]">Proposto:</span>
                      {diff.newContent}
                    </div>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 border-t border-[var(--vly-border-subtle)] pt-3">
                <button
                  onClick={() => onReject(cs.id)}
                  className="vly-interactive flex items-center gap-1.5 rounded-lg border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-raised)] px-4 py-1.5 text-xs font-medium text-[var(--vly-text-secondary)] transition hover:border-[var(--vly-border-danger)] hover:bg-[var(--vly-danger)]/10 hover:text-[var(--vly-danger)]"
                >
                  <X size={13} />
                  Rejeitar Proposta
                </button>
                <button
                  onClick={() => onAccept(cs.id)}
                  className="vly-interactive flex items-center gap-1.5 rounded-lg bg-[var(--vly-success)] px-4 py-1.5 text-xs font-semibold text-[var(--vly-text-on-accent)] shadow-lg transition hover:opacity-90"
                >
                  <Check size={13} />
                  Aceitar Todas as Alterações
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

