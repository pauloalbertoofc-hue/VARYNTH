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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md bg-[#0f0f1a] border border-red-500/30 rounded-2xl shadow-2xl p-6 space-y-5 clip-corner relative">
        <button
          onClick={onClose}
          disabled={pending}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 disabled:opacity-50"
        >
          <X size={16} />
        </button>

        {/* Icon & Title */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400 flex-shrink-0">
            <AlertTriangle size={24} />
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-bold text-white leading-snug">
              {isPermanent ? "Destruir Permanentemente?" : `Mover ${itemType} para a Lixeira?`}
            </h3>
            <p className="text-xs font-mono text-red-300 font-semibold truncate max-w-xs">
              &quot;{itemTitle}&quot;
            </p>
          </div>
        </div>

        {/* Explanation Banner */}
        <div className="p-3.5 rounded-xl bg-[#0a0a0f] border border-[#1e1e30] text-xs text-slate-300 leading-relaxed space-y-2">
          {isPermanent ? (
            <p className="text-red-400 font-medium">
              ⚠️ Esta ação é irreversível. O item e todo o seu conteúdo serão destruídos permanentemente e não poderão ser recuperados.
            </p>
          ) : (
            <p>
              O item será removido da sua área ativa e ficará retido na <span className="text-orange-300 font-semibold">Lixeira por 10 dias</span>. Você poderá restaurá-lo a qualquer momento antes da destruição automática.
            </p>
          )}
        </div>

        {error && <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">{error}</p>}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 bg-[#14141f] border border-[#1e1e30] transition-all"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={() => void confirm()}
            disabled={pending}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-lg disabled:cursor-wait disabled:opacity-60",
              isPermanent
                ? "bg-red-600 hover:bg-red-500"
                : "bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500"
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
