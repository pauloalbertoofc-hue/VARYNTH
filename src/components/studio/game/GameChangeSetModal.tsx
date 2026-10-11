"use client";

import React from "react";
import { GameChangeSet } from "@/lib/studio/game/types";
import { Sparkles, Check, X, Layers, Box, Cpu, Variable, FileText } from "lucide-react";
import { Surface } from "@/components/ui/Surface";

interface GameChangeSetModalProps {
  isOpen: boolean;
  changeSets: GameChangeSet[];
  onAccept: (changeSetId: string) => void;
  onReject: (changeSetId: string) => void;
  onClose: () => void;
}

export const GameChangeSetModal: React.FC<GameChangeSetModalProps> = ({
  isOpen,
  changeSets,
  onAccept,
  onReject,
  onClose,
}) => {
  if (!isOpen || changeSets.length === 0) return null;

  const currentCS = changeSets[0];
  const plan = currentCS.plan;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--vly-world)]/80 p-6 backdrop-blur-md select-none">
      <Surface tone="floating" role="dialog" aria-modal="true" aria-label={currentCS.title} className="flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--vly-border-subtle)] bg-[var(--vly-surface)] p-4">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-[var(--vly-warning)]" />
            <div>
              <h3 className="text-sm font-bold text-[var(--vly-text-primary)]">{currentCS.title}</h3>
              <span className="text-[11px] text-[var(--vly-text-muted)]">{currentCS.summary}</span>
            </div>
          </div>
          <button onClick={onClose} className="vly-interactive rounded-lg p-1 text-[var(--vly-text-muted)] hover:text-[var(--vly-text-primary)]">
            <X size={18} />
          </button>
        </div>

        {/* Plan Body */}
        <div className="max-h-[65vh] space-y-4 overflow-y-auto p-5 text-xs text-[var(--vly-text-secondary)]">
          {plan && (
            <Surface tone="panel" className="space-y-3 p-4">
              <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[var(--vly-warning)]">
                <FileText size={12} /> Plano de Criação Audiovisual & Lógico (GDD Draft)
              </span>

              <div>
                <span className="block text-[10px] font-semibold uppercase text-[var(--vly-text-muted)]">Conceito do Jogo</span>
                <p className="mt-0.5 text-[var(--vly-text-primary)]">{plan.concept}</p>
              </div>

              <div>
                <span className="block text-[10px] font-semibold uppercase text-[var(--vly-text-muted)]">Loop de Jogabilidade (Gameplay Loop)</span>
                <p className="mt-0.5 text-[var(--vly-text-primary)]">{plan.gameplayLoop}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 border-t border-[var(--vly-border-subtle)] pt-2">
                <div>
                  <span className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase text-[var(--vly-text-muted)]">
                    <Layers size={11} className="text-[var(--vly-success)]" /> Cenas Planejadas ({plan.scenes.length})
                  </span>
                  <ul className="space-y-1 text-[11px]">
                    {plan.scenes.map((s, idx) => (
                      <li key={idx} className="rounded border border-[var(--vly-border-subtle)] bg-[var(--vly-world)] p-1.5">
                        <strong className="text-[var(--vly-text-primary)]">{s.name}:</strong> {s.description}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <span className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase text-[var(--vly-text-muted)]">
                    <Variable size={11} className="text-[var(--vly-info)]" /> Variáveis de Estado ({plan.variables.length})
                  </span>
                  <ul className="space-y-1 text-[11px]">
                    {plan.variables.map((v, idx) => (
                      <li key={idx} className="rounded border border-[var(--vly-border-subtle)] bg-[var(--vly-world)] p-1.5 font-mono">
                        <span className="font-bold text-[var(--vly-success)]">{v.name}</span>: {v.type} ({String(v.initialValue)})
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Surface>
          )}

          {/* Operations List */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--vly-text-muted)]">
              Operações a serem aplicadas atomicamente ({currentCS.operations.length})
            </span>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {currentCS.operations.map((op, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-lg border border-[var(--vly-border-subtle)] bg-[var(--vly-surface)] p-2 font-mono text-[11px] text-[var(--vly-text-secondary)]"
                >
                  <span className="font-bold text-[var(--vly-success)]">{op.type}</span>
                  <span className="max-w-xs truncate text-[var(--vly-text-muted)]">
                    {op.type === "CREATE_SCENE" ? op.scene.name : op.type === "CREATE_ENTITY" ? op.entity.name : op.type === "CREATE_RULE" ? op.rule.name : op.type === "CREATE_VARIABLE" ? op.variable.name : "..."}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="flex items-center justify-between border-t border-[var(--vly-border-subtle)] bg-[var(--vly-surface)] p-4">
          <button
            onClick={() => onReject(currentCS.id)}
            className="vly-interactive flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-[var(--vly-danger)] transition hover:bg-[var(--vly-danger)]/10"
          >
            <X size={14} /> Rejeitar Proposta
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="vly-interactive rounded-xl px-4 py-2 text-xs font-semibold text-[var(--vly-text-secondary)] hover:text-[var(--vly-text-primary)]"
            >
              Fechar
            </button>
            <button
              onClick={() => onAccept(currentCS.id)}
              className="vly-interactive flex items-center gap-1.5 rounded-xl bg-[var(--vly-success)] px-5 py-2 text-xs font-bold text-[var(--vly-text-on-accent)] shadow-lg transition hover:opacity-90"
            >
              <Check size={14} /> Aceitar & Aplicar Atomicamente
            </button>
          </div>
        </div>
      </Surface>
    </div>
  );
};

