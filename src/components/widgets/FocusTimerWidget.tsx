"use client";

import { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw, Flame, Coffee, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type TimerMode = "focus" | "shortBreak" | "longBreak";

const MODE_CONFIG: Record<
  TimerMode,
  { label: string; duration: number; color: string; icon: React.ElementType }
> = {
  focus: {
    label: "Foco",
    duration: 25 * 60,
    color: "text-violet-400 border-violet-500/30 bg-violet-500/10",
    icon: Flame,
  },
  shortBreak: {
    label: "Pausa Curta",
    duration: 5 * 60,
    color: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10",
    icon: Coffee,
  },
  longBreak: {
    label: "Pausa Longa",
    duration: 15 * 60,
    color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
    icon: Sparkles,
  },
};

export function FocusTimerWidget() {
  const [mode, setMode] = useState<TimerMode>("focus");
  const [timeLeft, setTimeLeft] = useState(MODE_CONFIG.focus.duration);
  const [isActive, setIsActive] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const currentConfig = MODE_CONFIG[mode];
  const Icon = currentConfig.icon;

  useEffect(() => {
    if (isActive) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setIsActive(false);
            if (mode === "focus") {
              setCompletedSessions((c) => c + 1);
            }
            playBeep();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, mode]);

  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.5);
    } catch {
      // Audio not permitted without interaction or unsupported
    }
  };

  const handleModeChange = (newMode: TimerMode) => {
    setIsActive(false);
    setMode(newMode);
    setTimeLeft(MODE_CONFIG[newMode].duration);
  };

  const toggleTimer = () => {
    setIsActive((prev) => !prev);
  };

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(MODE_CONFIG[mode].duration);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const progress = ((currentConfig.duration - timeLeft) / currentConfig.duration) * 100;

  return (
    <div className="relative flex flex-col justify-between p-5 rounded-lg bg-[#0f0f1a] border border-[#1e1e30] clip-corner-sm group hover:border-violet-500/40 transition-all duration-300">
      {/* Header with Modes */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 text-xs font-semibold text-violet-400 tracking-wider uppercase">
          <Icon size={14} />
          <span>Timer de Produtividade</span>
        </div>
        <div className="flex items-center gap-1 bg-[#14141f] p-1 rounded-md border border-[#1e1e30]">
          {(Object.keys(MODE_CONFIG) as TimerMode[]).map((m) => (
            <button
              key={m}
              onClick={() => handleModeChange(m)}
              className={cn(
                "px-2 py-0.5 rounded text-[11px] font-medium transition-all",
                mode === m
                  ? "bg-violet-600/30 text-violet-300 border border-violet-500/40"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              {MODE_CONFIG[m].label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Display */}
      <div className="my-4 flex items-center justify-between gap-4">
        <div>
          <div className="text-4xl font-black text-slate-100 font-mono tracking-tight text-glow-accent">
            {formatTime(timeLeft)}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {isActive ? "Em andamento..." : "Pausado"} · {completedSessions} sessões concluídas
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTimer}
            className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center transition-all",
              isActive
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30"
                : "bg-violet-600 text-white hover:bg-violet-500 glow-accent"
            )}
            title={isActive ? "Pausar" : "Iniciar"}
          >
            {isActive ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
          </button>
          <button
            onClick={resetTimer}
            className="w-10 h-10 rounded-lg flex items-center justify-center bg-[#14141f] text-slate-400 border border-[#1e1e30] hover:text-slate-200 hover:border-slate-600 transition-all"
            title="Reiniciar"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-[#14141f] h-1.5 rounded-full overflow-hidden border border-[#1e1e30]">
        <div
          className="h-full bg-gradient-to-r from-violet-600 to-cyan-400 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

