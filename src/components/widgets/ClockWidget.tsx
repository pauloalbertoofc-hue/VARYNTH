"use client";

import { useEffect, useState } from "react";
import { Clock, ShieldCheck, Cpu } from "lucide-react";

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
      <div className="h-full min-h-[140px] flex items-center justify-center p-5 rounded-lg bg-[#0f0f1a] border border-[#1e1e30] clip-corner-sm">
        <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
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
    <div className="relative flex flex-col justify-between p-5 rounded-lg bg-[#0f0f1a] border border-[#1e1e30] clip-corner-sm overflow-hidden group hover:border-violet-500/40 transition-all duration-300">
      {/* Glow background accent */}
      <div className="absolute -right-8 -top-8 w-24 h-24 bg-violet-600/10 rounded-full blur-2xl pointer-events-none group-hover:bg-violet-600/20 transition-all" />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold text-violet-400 tracking-wider uppercase">
          <Clock size={14} />
          <span>Hora do Sistema</span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Online</span>
        </div>
      </div>

      <div className="my-3">
        <div className="text-3xl sm:text-4xl font-black text-slate-100 tracking-wider font-mono text-glow-accent">
          {hours}:{minutes}
          <span className="text-xl sm:text-2xl text-violet-400/80">:{seconds}</span>
        </div>
        <p className="text-xs text-slate-400 capitalize mt-1">
          {formattedDate}
        </p>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-[#1e1e30] text-[11px] text-slate-500">
        <span className="flex items-center gap-1">
          <Cpu size={12} className="text-violet-400" />
          <span>VARYNTH Core v0.1</span>
        </span>
        <span className="flex items-center gap-1 text-slate-400">
          <ShieldCheck size={12} className="text-emerald-400" />
          <span>Seguro</span>
        </span>
      </div>
    </div>
  );
}

