"use client";

import React from "react";
import { VideoChangeSet } from "@/lib/studio/video/types";
import { Sparkles, Check, X, Film, Scissors, Move, Plus, Type, Captions } from "lucide-react";
import { Surface } from "@/components/ui/Surface";

interface VideoChangeSetModalProps {
  isOpen: boolean;
  changeSets: VideoChangeSet[];
  onAccept: (changeSetId: string) => void;
  onReject: (changeSetId: string) => void;
  onClose: () => void;
}

export function VideoChangeSetModal({
  isOpen,
  changeSets,
  onAccept,
  onReject,
  onClose,
}: VideoChangeSetModalProps) {
  if (!isOpen || changeSets.length === 0) return null;

  const getOpIcon = (type: string) => {
    switch (type) {
      case "CREATE_SCENE":
      case "UPDATE_SCENE":
        return <Film size={13} className="text-[var(--vly-warning)]" />;
      case "TRIM_CLIP":
        return <Scissors size={13} className="text-[var(--vly-info)]" />;
      case "MOVE_CLIP":
      case "UPDATE_CLIP_TRANSFORM":
        return <Move size={13} className="text-[var(--vly-accent)]" />;
      case "ADD_SUBTITLE":
        return <Captions size={13} className="text-[var(--vly-warning)]" />;
      default:
        return <Plus size={13} className="text-[var(--vly-success)]" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <Surface tone="floating" className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--vly-border-subtle)] bg-[var(--vly-surface)] px-6 py-4">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-[var(--vly-warning)]" />
            <h3 className="text-base font-bold text-[var(--vly-text-primary)]">Proposta Audiovisual da Athena</h3>
          </div>
          <button onClick={onClose} className="vly-interactive rounded p-1 text-[var(--vly-text-muted)] hover:text-[var(--vly-text-primary)]">
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-6 overflow-y-auto p-6 text-xs text-[var(--vly-text-secondary)]">
          {changeSets.map((cs) => (
            <Surface key={cs.id} tone="panel" className="space-y-4 p-5">
              <div>
                <h4 className="text-sm font-bold text-[var(--vly-warning)]">{cs.title}</h4>
                <p className="mt-1 text-xs text-[var(--vly-text-muted)]">{cs.summary}</p>
              </div>

              {/* Inspectable VideoCreationPlan if generated */}
              {cs.plan && (
                <Surface tone="raised" className="space-y-2 p-3.5">
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-[var(--vly-text-primary)]">
                    Plano de Montagem ({cs.plan.scenes.length} Cenas | {Math.round(cs.plan.targetDurationMs / 1000)}s)
                  </span>
                  <div className="space-y-1.5">
                    {cs.plan.scenes.map((sc, i) => (
                      <div key={i} className="flex items-center justify-between rounded bg-[var(--vly-world)] px-2 py-1 text-[11px] text-[var(--vly-text-secondary)]">
                        <span>{sc.name}</span>
                        <span className="font-mono text-[var(--vly-text-muted)]">{Math.round(sc.durationMs / 1000)}s</span>
                      </div>
                    ))}
                  </div>
                </Surface>
              )}

              {/* Operations List */}
              <div className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--vly-text-muted)]">
                  Operações Audiovisuais ({cs.operations.length})
                </span>

                {cs.operations.map((op, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-lg border border-[var(--vly-border-subtle)] bg-[var(--vly-surface)] p-2.5"
                  >
                    <div className="flex items-center gap-2">
                      {getOpIcon(op.type)}
                      <span className="font-mono font-semibold text-[var(--vly-info)]">{op.type}</span>
                    </div>
                    <span className="font-mono text-[10px] text-[var(--vly-text-muted)]">
                      {"scene" in op ? `Cena: ${op.scene.name}` : "clipId" in op ? `Clip: ${op.clipId}` : "Timeline Global"}
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
            </Surface>
          ))}
        </div>
      </Surface>
    </div>
  );
}

