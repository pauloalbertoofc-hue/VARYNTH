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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md bg-[#0f0f1a] border border-red-500/50 rounded-2xl shadow-2xl p-6 space-y-5 clip-corner relative">
        <button
          onClick={() => {
            setTypedWord("");
            onClose();
          }}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-200"
        >
          <X size={16} />
        </button>

        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400 flex-shrink-0">
            <AlertTriangle size={24} />
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-bold text-white leading-snug">{title}</h3>
            {itemCount !== undefined && (
              <span className="text-[11px] px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 font-bold font-mono">
                {itemCount} {itemCount === 1 ? "item afetado" : "itens afetados"}
              </span>
            )}
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0a0a0f] border border-red-500/20 text-xs text-slate-300 leading-relaxed space-y-2">
          <p className="text-red-300 font-medium">{description}</p>
          <p className="text-slate-400">
            Para autorizar a destruição definitiva, digite <span className="text-white font-mono font-bold select-all">&quot;{expectedWord}&quot;</span> no campo abaixo:
          </p>
        </div>

        <div>
          <input
            type="text"
            placeholder={`Digite ${expectedWord} para confirmar...`}
            value={typedWord}
            onChange={(e) => setTypedWord(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#07070b] border border-[#2d2d4a] text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-red-500 uppercase text-center tracking-widest font-bold"
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
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 bg-[#14141f] border border-[#1e1e30] transition-all"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={!isMatch}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-lg",
              isMatch
                ? "bg-red-600 hover:bg-red-500 cursor-pointer glow-accent"
                : "bg-red-950/40 text-slate-500 border border-red-900/30 cursor-not-allowed opacity-50"
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
