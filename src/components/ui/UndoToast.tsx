"use client";

import { useState, useEffect, useRef } from "react";
import { RotateCcw, X, Trash2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface UndoToastEventDetail {
  id?: string;
  message: string;
  actionLabel?: string;
  onUndo: () => void;
  durationMs?: number;
}

export function showUndoToast(detail: UndoToastEventDetail) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("varynth_undo_toast", { detail }));
  }
}

export function UndoToast() {
  const [toast, setToast] = useState<UndoToastEventDetail | null>(null);
  const [progress, setProgress] = useState(100);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleEvent = (e: CustomEvent<UndoToastEventDetail>) => {
      const detail = e.detail;
      setToast(detail);
      setProgress(100);

      if (timerRef.current) clearTimeout(timerRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

      const duration = detail.durationMs || 6000;
      const step = 100;
      const decrement = (step / duration) * 100;

      progressIntervalRef.current = setInterval(() => {
        setProgress((prev) => Math.max(0, prev - decrement));
      }, step);

      timerRef.current = setTimeout(() => {
        setToast(null);
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      }, duration);
    };

    window.addEventListener("varynth_undo_toast" as any, handleEvent);

    return () => {
      window.removeEventListener("varynth_undo_toast" as any, handleEvent);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, []);

  if (!toast) return null;

  const handleUndo = () => {
    toast.onUndo();
    setToast(null);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 sm:left-6 sm:translate-x-0 z-[var(--vly-z-system)] animate-slide-up flex flex-col items-center" role="status" aria-live="polite">
      <div className="flex items-center gap-3 px-4 py-3 rounded-[var(--vly-radius-xl)] bg-[var(--vly-surface-floating)]/95 border border-[color-mix(in_srgb,var(--vly-warning)_42%,transparent)] shadow-[0_18px_50px_rgb(0_0_0_/_32%)] backdrop-blur-md text-xs text-[var(--vly-text-primary)] min-w-[320px] max-w-md">
        <div className="w-7 h-7 rounded-[var(--vly-radius-md)] bg-[color-mix(in_srgb,var(--vly-warning)_16%,transparent)] border border-[color-mix(in_srgb,var(--vly-warning)_30%,transparent)] flex items-center justify-center text-[var(--vly-warning)] flex-shrink-0">
          <Trash2 size={14} aria-hidden="true" />
        </div>

        <div className="flex-1 min-w-0 pr-1">
          <p className="truncate font-medium text-[var(--vly-text-primary)]">{toast.message}</p>
          <span className="text-[10px] text-[var(--vly-text-muted)] font-mono">Disponível na Lixeira por 10 dias</span>
        </div>

        <button
          type="button"
          onClick={handleUndo}
          aria-label={toast.actionLabel || "Desfazer ação"}
          className="vly-interactive flex items-center gap-1 px-3 py-1.5 rounded-[var(--vly-radius-md)] bg-[var(--vly-warning)] hover:bg-[var(--vly-accent-hover)] text-[var(--vly-accent-contrast)] font-bold text-xs flex-shrink-0"
        >
          <RotateCcw size={12} />
          <span>{toast.actionLabel || "Desfazer"}</span>
        </button>

        <button
          type="button"
          onClick={() => setToast(null)}
          aria-label="Fechar aviso de desfazer"
          className="vly-interactive text-[var(--vly-text-muted)] hover:text-[var(--vly-text-primary)] p-1"
        >
          <X size={14} />
        </button>
      </div>

      {/* Progress Line */}
      <div role="progressbar" aria-label="Tempo restante para desfazer" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)} className="w-[90%] h-0.5 bg-[color-mix(in_srgb,var(--vly-warning)_20%,transparent)] rounded-full overflow-hidden mt-0.5">
        <div
          className="h-full bg-[var(--vly-warning)] transition-all duration-100 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
