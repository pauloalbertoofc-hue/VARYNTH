"use client";

import React from "react";
import { AudioChangeSet } from "@/lib/studio/audio/types";
import { Sparkles, Check, X, Scissors, Volume2, Move, Plus } from "lucide-react";

interface AudioChangeSetModalProps {
  isOpen: boolean;
  changeSets: AudioChangeSet[];
  onAccept: (changeSetId: string) => void;
  onReject: (changeSetId: string) => void;
  onClose: () => void;
}

export function AudioChangeSetModal({
  isOpen,
  changeSets,
  onAccept,
  onReject,
  onClose,
}: AudioChangeSetModalProps) {
  if (!isOpen || changeSets.length === 0) return null;

  const getOpIcon = (type: string) => {
    switch (type) {
      case "TRIM_CLIP":
        return <Scissors size={13} className="text-[var(--vly-warning)]" />;
      case "MOVE_CLIP":
        return <Move size={13} className="text-[var(--vly-accent)]" />;
      case "SET_CLIP_GAIN":
      case "UPDATE_TRACK":
        return <Volume2 size={13} className="text-[var(--vly-success)]" />;
      default:
        return <Plus size={13} className="text-[var(--vly-info)]" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--vly-world)]/75 p-4 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" aria-labelledby="audio-change-set-title" className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-floating)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--vly-border-subtle)] bg-[var(--vly-surface)] px-6 py-4">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-[var(--vly-warning)]" />
            <h3 id="audio-change-set-title" className="text-base font-bold text-[var(--vly-text-primary)]">Proposta de Áudio da Athena</h3>
          </div>
          <button onClick={onClose} aria-label="Fechar proposta de áudio" className="vly-interactive rounded p-1 text-[var(--vly-text-muted)] hover:text-[var(--vly-text-primary)]">
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
                  Operações Temporais ({cs.operations.length})
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
                      {"clipId" in op ? `Clip: ${op.clipId}` : "trackId" in op ? `Faixa: ${op.trackId}` : "Timeline Global"}
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

