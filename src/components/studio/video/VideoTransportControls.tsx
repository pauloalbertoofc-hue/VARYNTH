"use client";

import React from "react";
import {
  Play,
  Pause,
  Square,
  SkipBack,
  SkipForward,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Grid,
  Plus,
  Upload,
  Sparkles,
  Film,
  Undo2,
  Redo2,
} from "lucide-react";
import { VideoPlaybackState } from "@/lib/studio/video/types";
import { FrameRate, formatTimecode } from "@/lib/studio/temporal/temporal-core";

interface VideoTransportControlsProps {
  playbackState: VideoPlaybackState;
  playheadMs: number;
  totalDurationMs: number;
  frameRate: FrameRate;
  zoom: number;
  snapToGrid: boolean;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onJumpToStart: () => void;
  onJumpToEnd: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitTimeline: () => void;
  onToggleSnap: () => void;
  onAddTrack: () => void;
  onAddScene: () => void;
  onImportVideo: () => void;
  onAskAthena: () => void;
}

export function VideoTransportControls({
  playbackState,
  playheadMs,
  totalDurationMs,
  frameRate,
  zoom,
  snapToGrid,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onPlay,
  onPause,
  onStop,
  onJumpToStart,
  onJumpToEnd,
  onZoomIn,
  onZoomOut,
  onFitTimeline,
  onToggleSnap,
  onAddTrack,
  onAddScene,
  onImportVideo,
  onAskAthena,
}: VideoTransportControlsProps) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--vly-border-subtle)] bg-[var(--vly-surface)] px-4 py-2 text-xs text-[var(--vly-text-secondary)] select-none">
      {/* Left: Transport Buttons */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={onJumpToStart}
          className="vly-interactive rounded-lg border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-raised)] p-1.5 text-[var(--vly-text-muted)] transition hover:text-[var(--vly-text-primary)]"
          title="Ir para o Início"
        >
          <SkipBack size={13} />
        </button>

        {playbackState === "PLAYING" ? (
          <button
            onClick={onPause}
            className="vly-interactive flex items-center gap-1 rounded-lg bg-[var(--vly-warning)] px-3 py-1.5 font-semibold text-[var(--vly-text-on-accent)] shadow-lg transition hover:opacity-90"
          >
            <Pause size={13} />
            Pausar
          </button>
        ) : (
          <button
            onClick={onPlay}
            className="vly-interactive flex items-center gap-1 rounded-lg bg-[var(--vly-accent)] px-3 py-1.5 font-semibold text-[var(--vly-text-on-accent)] shadow-lg transition hover:opacity-90"
          >
            <Play size={13} />
            Tocar
          </button>
        )}

        <button
          onClick={onStop}
          className="vly-interactive rounded-lg border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-raised)] p-1.5 text-[var(--vly-text-muted)] transition hover:text-[var(--vly-text-primary)]"
          title="Parar"
        >
          <Square size={13} />
        </button>

        <button
          onClick={onJumpToEnd}
          className="vly-interactive rounded-lg border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-raised)] p-1.5 text-[var(--vly-text-muted)] transition hover:text-[var(--vly-text-primary)]"
          title="Ir para o Fim"
        >
          <SkipForward size={13} />
        </button>

        {/* SMPTE Timecode Digital Display */}
        <div className="ml-2 flex items-center gap-1.5 rounded-lg border border-[var(--vly-border-subtle)] bg-[var(--vly-world)]/60 px-2.5 py-1 font-mono text-[11px] text-[var(--vly-info)]">
          <span className="font-bold text-[var(--vly-text-primary)]">
            {formatTimecode(playheadMs, { fps: frameRate, showFrames: true })}
          </span>
          <span className="text-[var(--vly-text-muted)]">/</span>
          <span className="text-[var(--vly-text-secondary)]">
            {formatTimecode(totalDurationMs, { fps: frameRate, showFrames: true })}
          </span>
        </div>

        {/* Undo / Redo Buttons */}
        {(onUndo || onRedo) && (
          <div className="ml-2 flex items-center rounded-lg border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-raised)] p-0.5">
            {onUndo && (
              <button
                onClick={onUndo}
                disabled={canUndo === false}
                className="vly-interactive rounded p-1.5 text-[var(--vly-text-muted)] transition hover:text-[var(--vly-text-primary)] disabled:opacity-40"
                title="Desfazer (Ctrl+Z)"
              >
                <Undo2 size={13} />
              </button>
            )}
            {onRedo && (
              <button
                onClick={onRedo}
                disabled={canRedo === false}
                className="vly-interactive rounded p-1.5 text-[var(--vly-text-muted)] transition hover:text-[var(--vly-text-primary)] disabled:opacity-40"
                title="Refazer (Ctrl+Y)"
              >
                <Redo2 size={13} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Center: Add Track / Scene / Import */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={onAddScene}
          className="vly-interactive flex items-center gap-1.5 rounded-lg border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-raised)] px-2.5 py-1.5 text-[var(--vly-text-secondary)] transition hover:text-[var(--vly-text-primary)]"
        >
          <Film size={13} className="text-[var(--vly-warning)]" />
          Nova Cena
        </button>

        <button
          onClick={onAddTrack}
          className="vly-interactive flex items-center gap-1.5 rounded-lg border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-raised)] px-2.5 py-1.5 text-[var(--vly-text-secondary)] transition hover:text-[var(--vly-text-primary)]"
        >
          <Plus size={13} className="text-[var(--vly-accent)]" />
          Nova Faixa
        </button>

        <button
          onClick={onImportVideo}
          className="vly-interactive flex items-center gap-1.5 rounded-lg border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-raised)] px-2.5 py-1.5 text-[var(--vly-text-secondary)] transition hover:text-[var(--vly-text-primary)]"
        >
          <Upload size={13} className="text-[var(--vly-success)]" />
          Importar Mídia
        </button>
      </div>

      {/* Right: Zoom & Grid Snap & Athena Assistant */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleSnap}
          className={`p-1.5 rounded-lg border transition ${
            snapToGrid
              ? "bg-[var(--vly-accent)]/20 border-[var(--vly-border-accent)] text-[var(--vly-accent)]"
              : "bg-[var(--vly-surface-raised)] border-[var(--vly-border-subtle)] text-[var(--vly-text-muted)] hover:text-[var(--vly-text-secondary)]"
          }`}
          title={snapToGrid ? "Ajuste Magnético (Snap) Ativo" : "Snap Desativado"}
        >
          <Grid size={13} />
        </button>

        <div className="flex items-center rounded-lg border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-raised)] p-0.5">
          <button onClick={onZoomOut} className="vly-interactive p-1.5 text-[var(--vly-text-muted)] transition hover:text-[var(--vly-text-primary)]">
            <ZoomOut size={13} />
          </button>
          <span className="px-1.5 font-mono text-[10px] text-[var(--vly-text-muted)]">{zoom}px/s</span>
          <button onClick={onZoomIn} className="vly-interactive p-1.5 text-[var(--vly-text-muted)] transition hover:text-[var(--vly-text-primary)]">
            <ZoomIn size={13} />
          </button>
          <button onClick={onFitTimeline} className="vly-interactive p-1.5 text-[var(--vly-text-muted)] transition hover:text-[var(--vly-text-primary)]">
            <Maximize2 size={13} />
          </button>
        </div>

        <button
          onClick={onAskAthena}
          className="vly-interactive flex items-center gap-1.5 rounded-lg border border-[var(--vly-border-warning)] bg-[var(--vly-warning)]/10 px-2.5 py-1.5 text-xs text-[var(--vly-warning)] transition hover:bg-[var(--vly-warning)]/20"
        >
          <Sparkles size={12} />
          Athena Vídeo
        </button>
      </div>
    </div>
  );
}

