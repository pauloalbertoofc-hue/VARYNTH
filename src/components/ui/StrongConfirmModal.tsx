"use client";

import { useState } from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface StrongConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  expectedWord?: string;
  itemCount?: number;
}

export function StrongConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  expectedWord = "ESVAZIAR",
  itemCount,
}: StrongConfirmModalProps) {
  const [typedWord, setTypedWord] = useState("");

  if (!isOpen) return null;

  const isMatch = typedWord.trim().toUpperCase() === expectedWord.toUpperCase();

  const handleConfirm = () => {
    if (!isMatch) return;
    onConfirm();
    setTypedWord("");
    onClose();
  };

  return (
    <div role="presentation" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--vly-overlay)] backdrop-blur-md animate-fade-in">
      <div role="dialog" aria-modal="true" aria-labelledby="strong-confirm-title" aria-describedby="strong-confirm-description" className="w-full max-w-md bg-[var(--vly-surface-floating)] border border-[color-mix(in_srgb,var(--vly-danger)_58%,transparent)] rounded-[var(--vly-radius-xl)] shadow-[0_24px_70px_rgb(0_0_0_/_42%)] p-6 space-y-5 relative">
        <button
          type="button"
          onClick={() => {
            setTypedWord("");
            onClose();
          }}
          aria-label="Fechar confirmação permanente"
          className="vly-interactive absolute top-4 right-4 rounded-[var(--vly-radius-sm)] p-1 text-[var(--vly-text-muted)] hover:text-[var(--vly-text-primary)]"
        >
          <X size={16} />
        </button>

        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-[color-mix(in_srgb,var(--vly-danger)_16%,var(--vly-surface))] border border-[var(--vly-border-danger)] flex items-center justify-center text-[var(--vly-danger)] flex-shrink-0">
            <AlertTriangle size={24} />
          </div>

          <div className="space-y-1">
            <h3 id="strong-confirm-title" className="text-base font-bold text-[var(--vly-text-primary)] leading-snug">{title}</h3>
            {itemCount !== undefined && (
              <span className="text-[11px] px-2 py-0.5 rounded bg-[color-mix(in_srgb,var(--vly-danger)_10%,var(--vly-surface))] text-[var(--vly-danger)] border border-[var(--vly-border-danger)] font-bold font-mono">
                {itemCount} {itemCount === 1 ? "item afetado" : "itens afetados"}
              </span>
            )}
          </div>
        </div>

        <div id="strong-confirm-description" className="p-3.5 rounded-[var(--vly-radius-md)] bg-[var(--vly-world)] border border-[color-mix(in_srgb,var(--vly-danger)_20%,transparent)] text-xs text-[var(--vly-text-secondary)] leading-relaxed space-y-2">
          <p className="text-[var(--vly-danger)] font-medium">{description}</p>
          <p className="text-[var(--vly-text-secondary)]">
            Para autorizar a destruição definitiva, digite <span className="text-[var(--vly-text-primary)] font-mono font-bold select-all">&quot;{expectedWord}&quot;</span> no campo abaixo:
          </p>
        </div>

        <div>
          <input
            id="strong-confirm-input"
            type="text"
            aria-label={`Digite ${expectedWord} para confirmar a destruição permanente`}
            placeholder={`Digite ${expectedWord} para confirmar...`}
            value={typedWord}
            onChange={(e) => setTypedWord(e.target.value)}
            className="vly-field w-full px-3.5 py-2.5 text-xs font-mono uppercase text-center tracking-widest font-bold"
            autoFocus
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => {
              setTypedWord("");
              onClose();
            }}
            className="vly-interactive px-4 py-2 rounded-[var(--vly-radius-md)] text-xs font-semibold text-[var(--vly-text-secondary)] hover:text-[var(--vly-text-primary)] bg-[var(--vly-surface-raised)] border border-[var(--vly-border-default)]"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={!isMatch}
            aria-disabled={!isMatch}
            className={cn(
              "vly-interactive flex items-center gap-1.5 px-4 py-2 rounded-[var(--vly-radius-md)] text-xs font-bold text-[var(--vly-text-primary)] shadow-lg",
              isMatch
                ? "bg-[var(--vly-danger)] hover:bg-[var(--vly-accent-hover)] cursor-pointer"
                : "bg-[color-mix(in_srgb,var(--vly-danger)_12%,var(--vly-surface))] text-[var(--vly-text-disabled)] border border-[var(--vly-border-danger)] cursor-not-allowed opacity-50"
            )}
          >
            <Trash2 size={13} />
            <span>Destruir Permanentemente</span>
          </button>
        </div>
      </div>
    </div>
  );
}
