"use client";

import { useEffect, useState } from "react";
import { Clock, ShieldCheck, Cpu } from "lucide-react";
import { Surface } from "@/components/ui/Surface";

export function ClockWidget() {
  const [time, setTime] = useState<Date | null>(null);

  useEffect(() => {
    setTime(new Date());
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!time) {
    return (
      <Surface tone="panel" role="status" aria-label="Carregando hora do sistema" aria-busy="true" className="h-full min-h-[140px] flex items-center justify-center p-5 clip-corner-sm">
        <div className="w-5 h-5 border-2 border-[var(--vly-accent)] border-t-transparent rounded-full animate-spin" />
      </Surface>
    );
  }

  const hours = String(time.getHours()).padStart(2, "0");
  const minutes = String(time.getMinutes()).padStart(2, "0");
  const seconds = String(time.getSeconds()).padStart(2, "0");

  const formattedDate = time.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <Surface tone="panel" role="article" aria-label="Hora do sistema" className="relative flex flex-col justify-between p-5 clip-corner-sm overflow-hidden group vly-interactive">
      {/* Glow background accent */}
      <div className="absolute -right-8 -top-8 w-24 h-24 bg-[var(--vly-accent)]/10 rounded-full blur-2xl pointer-events-none group-hover:bg-[var(--vly-accent)]/20 transition-all" />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold text-[var(--vly-accent)] tracking-wider uppercase">
          <Clock size={14} />
          <span>Hora do Sistema</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-[var(--vly-border-success)] bg-[var(--vly-success)]/10 px-2 py-0.5 text-[10px] font-medium text-[var(--vly-success)]">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--vly-success)]" />
          <span>Online</span>
        </div>
      </div>

      <div className="my-3">
        <div className="text-3xl sm:text-4xl font-black text-[var(--vly-text-primary)] tracking-wider font-mono text-glow-accent">
          {hours}:{minutes}
          <span className="text-xl text-[var(--vly-accent)] sm:text-2xl">:{seconds}</span>
        </div>
        <p className="text-xs text-[var(--vly-text-secondary)] capitalize mt-1">
          {formattedDate}
        </p>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-[var(--vly-border-subtle)] text-[11px] text-[var(--vly-text-muted)]">
        <span className="flex items-center gap-1">
          <Cpu size={12} className="text-[var(--vly-accent)]" />
          <span>VARYNTH Core v0.1</span>
        </span>
        <span className="flex items-center gap-1 text-[var(--vly-text-secondary)]">
          <ShieldCheck size={12} className="text-[var(--vly-success)]" />
          <span>Seguro</span>
        </span>
      </div>
    </Surface>
  );
}
