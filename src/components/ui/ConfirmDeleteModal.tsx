"use client";

import { useState } from "react";
import { AlertTriangle, LoaderCircle, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  itemTitle: string;
  itemType: string;
  isPermanent?: boolean;
}

export function ConfirmDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  itemTitle,
  itemType,
  isPermanent = false,
}: ConfirmDeleteModalProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  if (!isOpen) return null;

  async function confirm() {
    if (pending) return;
    setPending(true);
    setError("");
    try {
      await onConfirm();
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível concluir a exclusão.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div role="presentation" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--vly-overlay)] backdrop-blur-md animate-fade-in">
      <div role="dialog" aria-modal="true" aria-labelledby="confirm-delete-title" aria-describedby="confirm-delete-description" className="w-full max-w-md bg-[var(--vly-surface-floating)] border border-[color-mix(in_srgb,var(--vly-danger)_42%,transparent)] rounded-[var(--vly-radius-xl)] shadow-[0_24px_70px_rgb(0_0_0_/_42%)] p-6 space-y-5 relative">
        <button
          type="button"
          onClick={onClose}
          disabled={pending}
          aria-label="Fechar confirmação de exclusão"
          className="vly-interactive absolute top-4 right-4 rounded-[var(--vly-radius-sm)] p-1 text-[var(--vly-text-muted)] hover:text-[var(--vly-text-primary)] disabled:opacity-50"
        >
          <X size={16} />
        </button>

        {/* Icon & Title */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-[color-mix(in_srgb,var(--vly-danger)_16%,var(--vly-surface))] border border-[var(--vly-border-danger)] flex items-center justify-center text-[var(--vly-danger)] flex-shrink-0">
            <AlertTriangle size={24} />
          </div>

          <div className="space-y-1">
            <h3 id="confirm-delete-title" className="text-base font-bold text-[var(--vly-text-primary)] leading-snug">
              {isPermanent ? "Destruir Permanentemente?" : `Mover ${itemType} para a Lixeira?`}
            </h3>
            <p className="text-xs font-mono text-[var(--vly-danger)] font-semibold truncate max-w-xs">
              &quot;{itemTitle}&quot;
            </p>
          </div>
        </div>

        {/* Explanation Banner */}
        <div id="confirm-delete-description" className="p-3.5 rounded-[var(--vly-radius-md)] bg-[var(--vly-world)] border border-[var(--vly-border-default)] text-xs text-[var(--vly-text-secondary)] leading-relaxed space-y-2">
          {isPermanent ? (
            <p className="text-[var(--vly-danger)] font-medium">
              ⚠️ Esta ação é irreversível. O item e todo o seu conteúdo serão destruídos permanentemente e não poderão ser recuperados.
            </p>
          ) : (
            <p>
              O item será removido da sua área ativa e ficará retido na <span className="text-[var(--vly-warning)] font-semibold">Lixeira por 10 dias</span>. Você poderá restaurá-lo a qualquer momento antes da destruição automática.
            </p>
          )}
        </div>

        {error && <p role="alert" className="rounded-lg border border-[var(--vly-border-danger)] bg-[color-mix(in_srgb,var(--vly-danger)_10%,var(--vly-surface))] p-3 text-xs text-[var(--vly-danger)]">{error}</p>}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="vly-interactive px-4 py-2 rounded-[var(--vly-radius-md)] text-xs font-semibold text-[var(--vly-text-secondary)] hover:text-[var(--vly-text-primary)] bg-[var(--vly-surface-raised)] border border-[var(--vly-border-default)]"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={() => void confirm()}
            disabled={pending}
            aria-busy={pending}
            className={cn(
              "vly-interactive flex items-center gap-1.5 px-4 py-2 rounded-[var(--vly-radius-md)] text-xs font-bold text-[var(--vly-text-primary)] shadow-lg disabled:cursor-wait disabled:opacity-60",
              isPermanent
                ? "bg-[var(--vly-danger)] hover:opacity-90"
                : "bg-[var(--vly-warning)] text-[var(--vly-world)] hover:opacity-90"
            )}
          >
            {pending ? <LoaderCircle size={13} className="animate-spin" /> : <Trash2 size={13} />}
            <span>{pending ? "Processando…" : isPermanent ? "Sim, Destruir Agora" : "Sim, Mover para Lixeira"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
