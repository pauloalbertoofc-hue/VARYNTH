"use client";

import React from "react";
import { ImageChangeSet } from "@/lib/studio/image/types";
import { Sparkles, Check, X, Layers, Move, Type, Square } from "lucide-react";

interface ImageChangeSetModalProps {
  isOpen: boolean;
  changeSets: ImageChangeSet[];
  onAccept: (changeSetId: string) => void;
  onReject: (changeSetId: string) => void;
  onClose: () => void;
}

export function ImageChangeSetModal({
  isOpen,
  changeSets,
  onAccept,
  onReject,
  onClose,
}: ImageChangeSetModalProps) {
  if (!isOpen || changeSets.length === 0) return null;

  const getOpIcon = (type: string) => {
    switch (type) {
      case "ADD_LAYER":
        return <Layers size={13} className="text-[var(--vly-success)]" />;
      case "TRANSFORM_LAYER":
        return <Move size={13} className="text-[var(--vly-accent)]" />;
      case "UPDATE_TEXT":
        return <Type size={13} className="text-[var(--vly-warning)]" />;
      default:
        return <Square size={13} className="text-[var(--vly-info)]" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--vly-world)]/75 p-4 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" aria-labelledby="image-change-set-title" className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-floating)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--vly-border-subtle)] bg-[var(--vly-surface)] px-6 py-4">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-[var(--vly-warning)]" />
            <h3 id="image-change-set-title" className="text-base font-bold text-[var(--vly-text-primary)]">Proposta Visual da Athena</h3>
          </div>
          <button onClick={onClose} aria-label="Fechar proposta visual" className="vly-interactive rounded p-1 text-[var(--vly-text-muted)] hover:text-[var(--vly-text-primary)]">
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-6 overflow-y-auto p-6 text-xs text-[var(--vly-text-secondary)]">
          {changeSets.map((cs) => (
            <div key={cs.id} className="space-y-4 rounded-xl border border-[var(--vly-border-subtle)] bg-[var(--vly-world)] p-5">
              <div>
                <h4 className="text-sm font-bold text-[var(--vly-warning)]">{cs.title}</h4>
                <p className="mt-1 text-xs text-[var(--vly-text-muted)]">{cs.summary}</p>
              </div>

              {/* Operations List */}
              <div className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--vly-text-muted)]">
                  Operações Atômicas ({cs.operations.length})
                </span>

                {cs.operations.map((op, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-lg border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-raised)] p-2.5"
                  >
                    <div className="flex items-center gap-2">
                      {getOpIcon(op.type)}
                      <span className="font-mono font-semibold text-[var(--vly-accent)]">{op.type}</span>
                    </div>
                    <span className="font-mono text-[10px] text-[var(--vly-text-muted)]">
                      {"layerId" in op ? `Camada: ${op.layerId}` : "Canvas Global"}
                    </span>
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
                  Aceitar Proposta
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

