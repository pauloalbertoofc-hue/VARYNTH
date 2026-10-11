"use client";

import React from "react";
import { GAME_TEMPLATES, GameTemplate } from "@/lib/studio/game/game-templates";
import { X, Gamepad2, ArrowRight } from "lucide-react";

interface GameTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (templateId: string, name: string) => void;
}

export const GameTemplatesModal: React.FC<GameTemplatesModalProps> = ({
  isOpen,
  onClose,
  onSelectTemplate,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex select-none items-center justify-center bg-[var(--vly-world)]/80 p-6 backdrop-blur-md">
      <div role="dialog" aria-modal="true" aria-labelledby="game-template-title" className="flex w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-floating)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--vly-border-subtle)] bg-[var(--vly-surface)] p-4">
          <div className="flex items-center gap-2">
            <Gamepad2 size={18} className="text-[var(--vly-success)]" />
            <h3 id="game-template-title" className="text-sm font-bold text-[var(--vly-text-primary)]">Criar Novo Projeto de Jogo</h3>
          </div>
          <button onClick={onClose} aria-label="Fechar criação de jogo" className="vly-interactive rounded-lg p-1 text-[var(--vly-text-muted)] hover:text-[var(--vly-text-primary)]">
            <X size={18} />
          </button>
        </div>

        {/* Templates Grid */}
        <div className="grid max-h-[70vh] grid-cols-1 gap-3.5 overflow-y-auto p-5 md:grid-cols-2">
          {GAME_TEMPLATES.map((tmpl) => (
            <div
              key={tmpl.id}
              onClick={() => {
                onSelectTemplate(tmpl.id, tmpl.name);
                onClose();
              }}
              role="button"
              tabIndex={0}
              aria-label={`Usar template ${tmpl.name}`}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectTemplate(tmpl.id, tmpl.name);
                  onClose();
                }
              }}
              className="vly-interactive group flex cursor-pointer flex-col justify-between gap-3 rounded-xl border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-raised)] p-4 transition hover:border-[var(--vly-border-success)] hover:bg-[var(--vly-surface-hover)]"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded border border-[var(--vly-border-success)] bg-[var(--vly-success)]/10 px-2 py-0.5 text-[10px] font-bold uppercase text-[var(--vly-success)]">
                    {tmpl.gameType}
                  </span>
                </div>
                <h4 className="mt-2 text-sm font-bold text-[var(--vly-text-primary)] transition group-hover:text-[var(--vly-success)]">
                  {tmpl.name}
                </h4>
                <p className="mt-1 line-clamp-2 text-xs text-[var(--vly-text-muted)]">
                  {tmpl.description}
                </p>
              </div>

              <div className="flex items-center justify-between border-t border-[var(--vly-border-subtle)] pt-2 text-xs text-[var(--vly-text-muted)]">
                <span className="font-mono text-[11px]">Template 2D</span>
                <span className="flex items-center gap-1 font-semibold text-[var(--vly-success)] transition group-hover:translate-x-1">
                  Iniciar <ArrowRight size={13} />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

