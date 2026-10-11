"use client";

import { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw, Flame, Coffee, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Surface } from "@/components/ui/Surface";

type TimerMode = "focus" | "shortBreak" | "longBreak";

const MODE_CONFIG: Record<
  TimerMode,
  { label: string; duration: number; color: string; icon: React.ElementType }
> = {
  focus: {
    label: "Foco",
    duration: 25 * 60,
    color: "text-[var(--vly-accent)] border-[var(--vly-border-accent)] bg-[var(--vly-accent)]/10",
    icon: Flame,
  },
  shortBreak: {
    label: "Pausa Curta",
    duration: 5 * 60,
    color: "text-[var(--vly-info)] border-[var(--vly-border-info)] bg-[var(--vly-info)]/10",
    icon: Coffee,
  },
  longBreak: {
    label: "Pausa Longa",
    duration: 15 * 60,
    color: "text-[var(--vly-success)] border-[var(--vly-border-success)] bg-[var(--vly-success)]/10",
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
    <Surface tone="panel" role="article" aria-label="Timer de produtividade" className="relative flex flex-col justify-between p-5 clip-corner-sm group vly-interactive">
      {/* Header with Modes */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 text-xs font-semibold text-[var(--vly-accent)] tracking-wider uppercase">
          <Icon size={14} />
          <span>Timer de Produtividade</span>
        </div>
        <div role="group" aria-label="Modo do timer" className="flex items-center gap-1 bg-[var(--vly-surface-raised)] p-1 rounded-md border border-[var(--vly-border-subtle)]">
          {(Object.keys(MODE_CONFIG) as TimerMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => handleModeChange(m)}
              aria-pressed={mode === m}
              className={cn(
                "vly-interactive px-2 py-0.5 rounded text-[11px] font-medium transition-all",
                mode === m
                  ? "border border-[var(--vly-border-accent)] bg-[var(--vly-accent)]/20 text-[var(--vly-accent)]"
                  : "text-[var(--vly-text-secondary)] hover:text-[var(--vly-text-primary)]"
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
          <div role="timer" aria-live="polite" aria-label={`${currentConfig.label}: ${formatTime(timeLeft)}`} className="text-4xl font-black text-[var(--vly-text-primary)] font-mono tracking-tight text-glow-accent">
            {formatTime(timeLeft)}
          </div>
          <p className="text-xs text-[var(--vly-text-secondary)] mt-1">
            {isActive ? "Em andamento..." : "Pausado"} · {completedSessions} sessões concluídas
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTimer}
            aria-label={isActive ? "Pausar timer" : "Iniciar timer"}
            className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center transition-all",
              isActive
                ? "bg-[var(--vly-warning)]/20 text-[var(--vly-warning)] border border-[var(--vly-border-warning)] hover:bg-[var(--vly-warning)]/30"
                : "bg-[var(--vly-accent)] text-[var(--vly-accent-contrast)] hover:opacity-90 glow-accent"
            )}
            title={isActive ? "Pausar" : "Iniciar"}
          >
            {isActive ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
          </button>
          <button
            type="button"
            onClick={resetTimer}
            aria-label="Reiniciar timer"
            className="vly-interactive w-10 h-10 rounded-lg flex items-center justify-center bg-[var(--vly-surface-raised)] text-[var(--vly-text-secondary)] border border-[var(--vly-border-subtle)] hover:text-[var(--vly-text-primary)] hover:border-[var(--vly-border-strong)] transition-all"
            title="Reiniciar"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div role="progressbar" aria-label="Progresso do timer" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)} className="w-full bg-[var(--vly-surface-raised)] h-1.5 rounded-full overflow-hidden border border-[var(--vly-border-subtle)]">
        <div
          className="h-full bg-gradient-to-r from-[var(--vly-accent)] to-[var(--vly-info)] transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </Surface>
  );
}
