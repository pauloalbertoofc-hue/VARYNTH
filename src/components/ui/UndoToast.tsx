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
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 sm:left-6 sm:translate-x-0 z-50 animate-slide-up flex flex-col items-center">
      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#0f0f1a]/95 border border-orange-500/40 shadow-2xl backdrop-blur-md text-xs text-slate-100 min-w-[320px] max-w-md">
        <div className="w-7 h-7 rounded-lg bg-orange-600/20 border border-orange-500/30 flex items-center justify-center text-orange-400 flex-shrink-0">
          <Trash2 size={14} />
        </div>

        <div className="flex-1 min-w-0 pr-1">
          <p className="truncate font-medium text-slate-200">{toast.message}</p>
          <span className="text-[10px] text-slate-400 font-mono">Disponível na Lixeira por 10 dias</span>
        </div>

        <button
          onClick={handleUndo}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs glow-accent transition-all duration-150 flex-shrink-0"
        >
          <RotateCcw size={12} />
          <span>{toast.actionLabel || "Desfazer"}</span>
        </button>

        <button
          onClick={() => setToast(null)}
          className="text-slate-500 hover:text-slate-300 p-1 transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {/* Progress Line */}
      <div className="w-[90%] h-0.5 bg-orange-500/20 rounded-full overflow-hidden mt-0.5">
        <div
          className="h-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-100 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

