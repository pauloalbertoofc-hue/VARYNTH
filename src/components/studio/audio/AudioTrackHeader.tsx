"use client";

import React from "react";
import { AudioTrack } from "@/lib/studio/audio/types";
import { Volume2, VolumeX, Mic, Music, Sparkles, Radio } from "lucide-react";

interface AudioTrackHeaderProps {
  track: AudioTrack;
  isSelected: boolean;
  onSelect: () => void;
  onToggleMute: () => void;
  onToggleSolo: () => void;
  onUpdateVolume: (volume: number) => void;
  onUpdatePan: (pan: number) => void;
}

export function AudioTrackHeader({
  track,
  isSelected,
  onSelect,
  onToggleMute,
  onToggleSolo,
  onUpdateVolume,
  onUpdatePan,
}: AudioTrackHeaderProps) {
  const getTrackIcon = () => {
    switch (track.type) {
      case "VOICE":
        return <Mic size={12} className="text-[var(--vly-info)]" />;
      case "MUSIC":
        return <Music size={12} className="text-[var(--vly-accent)]" />;
      case "SFX":
        return <Sparkles size={12} className="text-[var(--vly-warning)]" />;
      default:
        return <Radio size={12} className="text-[var(--vly-text-muted)]" />;
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Faixa de áudio ${track.name}`}
      aria-current={isSelected ? "true" : undefined}
      onClick={onSelect}
      onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(); } }}
      style={{
        borderLeftColor: track.color || "var(--vly-accent)",
      }}
      className={`vly-interactive flex h-24 w-28 select-none flex-col justify-between border-b border-r border-l-4 border-[var(--vly-border-default)] p-1.5 sm:w-60 sm:p-2.5 ${
        isSelected
        ? "border-l-[var(--vly-accent)] bg-[var(--vly-surface-raised)] shadow-inner"
          : "bg-[var(--vly-surface)] hover:bg-[var(--vly-surface-hover)]"
      }`}
    >
      {/* Top Row: Track Name & Type */}
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1 overflow-hidden min-w-0">
          {getTrackIcon()}
          <button
            type="button"
            aria-label={`Selecionar faixa ${track.name}`}
            onClick={(event) => { event.stopPropagation(); onSelect(); }}
            className="max-w-[50px] truncate text-left text-[11px] font-semibold text-[var(--vly-text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--vly-accent)] sm:max-w-[120px] sm:text-xs"
          >
            {track.name}
          </button>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Mute Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleMute();
            }}
            aria-pressed={track.muted}
            aria-label={track.muted ? "Ativar faixa" : "Silenciar faixa"}
            className={`vly-interactive flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold touch-manipulation ${
              track.muted
                ? "bg-[var(--vly-danger)] text-[var(--vly-accent-contrast)] shadow-sm"
                : "bg-[var(--vly-surface-raised)] text-[var(--vly-text-muted)] hover:text-[var(--vly-text-primary)]"
            }`}
            title="Mute (Silenciar Faixa)"
          >
            M
          </button>

          {/* Solo Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleSolo();
            }}
            aria-pressed={track.solo}
            aria-label={track.solo ? "Desativar solo" : "Isolar faixa"}
            className={`vly-interactive flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold touch-manipulation ${
              track.solo
                ? "bg-[var(--vly-warning)] text-[var(--vly-accent-contrast)] shadow-sm font-extrabold"
                : "bg-[var(--vly-surface-raised)] text-[var(--vly-text-muted)] hover:text-[var(--vly-text-primary)]"
            }`}
            title="Solo (Isolar Faixa)"
          >
            S
          </button>
        </div>
      </div>

      {/* Sliders Row: Volume & Pan (compact on mobile) */}
      <div className="space-y-1 text-[10px] text-[var(--vly-text-muted)]">
        <div className="flex items-center justify-between gap-1.5">
          <span className="hidden sm:flex items-center gap-1 text-[9px] w-8">
            <Volume2 size={10} /> Vol
          </span>
          <input
            type="range"
            min="0"
            max="150"
            aria-label={`Volume da faixa ${track.name}`}
            value={Math.round((track.volume ?? 1.0) * 100)}
            onChange={(e) => onUpdateVolume(parseInt(e.target.value) / 100)}
            onClick={(e) => e.stopPropagation()}
            className="vly-interactive h-1 w-full cursor-pointer rounded bg-[var(--vly-surface-raised)] accent-[var(--vly-accent)]"
          />
          <span className="w-6 text-right font-mono text-[9px] text-[var(--vly-text-secondary)] sm:w-7">
            {Math.round((track.volume ?? 1.0) * 100)}%
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-[9px] w-8">Pan</span>
          <input
            type="range"
            min="-100"
            max="100"
            aria-label={`Pan da faixa ${track.name}`}
            value={Math.round((track.pan ?? 0) * 100)}
            onChange={(e) => onUpdatePan(parseInt(e.target.value) / 100)}
            onClick={(e) => e.stopPropagation()}
            className="vly-interactive h-1 w-full cursor-pointer rounded bg-[var(--vly-surface-raised)] accent-[var(--vly-accent)]"
          />
          <span className="w-7 text-right font-mono text-[9px] text-[var(--vly-text-secondary)]">
            {(track.pan ?? 0) === 0 ? "C" : (track.pan ?? 0) < 0 ? `L${Math.abs(Math.round((track.pan ?? 0) * 100))}` : `R${Math.round((track.pan ?? 0) * 100)}`}
          </span>
        </div>
      </div>
    </div>
  );
}
