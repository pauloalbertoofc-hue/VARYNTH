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
  Undo2,
  Redo2,
} from "lucide-react";
import { AudioPlaybackState } from "@/lib/studio/audio/types";

interface AudioTransportControlsProps {
  playbackState: AudioPlaybackState;
  playbackError?: string | null;
  playheadMs: number;
  totalDurationMs: number;
  zoom: number; // Pixels per second
  snapToGrid: boolean;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onRecord?: () => void;
  onJumpToStart: () => void;
  onJumpToEnd: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitTimeline: () => void;
  onToggleSnap: () => void;
  onAddTrack: () => void;
  onImportAudio: () => void;
  onAskAthena: () => void;
  onAddMarker?: () => void;
}

export function AudioTransportControls({
  playbackState,
  playbackError,
  playheadMs,
  totalDurationMs,
  zoom,
  snapToGrid,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onPlay,
  onPause,
  onStop,
  onRecord,
  onJumpToStart,
  onJumpToEnd,
  onZoomIn,
  onZoomOut,
  onFitTimeline,
  onToggleSnap,
  onAddTrack,
  onImportAudio,
  onAskAthena,
  onAddMarker,
}: AudioTransportControlsProps) {
  const formatTimecode = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    const millis = Math.floor(ms % 1000);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${millis.toString().padStart(3, "0")}`;
  };

  return (
    <div role="toolbar" aria-label="Controles de transporte do Audio Studio" className="flex items-center justify-between gap-3 border-b border-[var(--vly-border-default)] bg-[var(--vly-surface)] px-4 py-2 text-xs text-[var(--vly-text-secondary)] select-none">
      {playbackError && <p role="alert" className="min-w-0 flex-1 truncate text-rose-300" title={playbackError}>{playbackError}</p>}
      {/* Left: Transport Buttons */}
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={onRecord} aria-label="Gravar pelo microfone" className={`vly-interactive rounded-lg border px-2 py-1.5 ${playbackState === "BUFFERING" ? "border-[var(--vly-border-danger)] bg-[var(--vly-danger)] text-white" : "border-[var(--vly-border-default)] bg-[var(--vly-surface-raised)] text-[var(--vly-danger)]"}`}>● REC</button><button type="button" onClick={onAddMarker} aria-label="Adicionar marcador no playhead" className="vly-interactive rounded-lg border border-[var(--vly-border-default)] bg-[var(--vly-surface-raised)] px-2 py-1.5 text-[var(--vly-warning)]">⚑</button>
        <button
          onClick={onJumpToStart}
          className="vly-interactive rounded-lg border border-[var(--vly-border-default)] bg-[var(--vly-surface-raised)] p-1.5 text-[var(--vly-text-muted)] hover:text-[var(--vly-text-primary)]"
          title="Ir para o Início (Home)"
        >
          <SkipBack size={13} />
        </button>

        {playbackState === "PLAYING" ? (
          <button
            onClick={onPause}
            className="vly-interactive flex items-center gap-1 rounded-lg bg-[var(--vly-warning)] px-3 py-1.5 font-semibold text-[var(--vly-accent-contrast)]"
            title="Pausar (Espaço)"
          >
            <Pause size={13} />
            Pausar
          </button>
        ) : (
          <button
            onClick={onPlay}
            className="vly-interactive flex items-center gap-1 rounded-lg bg-[var(--vly-accent)] px-3 py-1.5 font-semibold text-[var(--vly-accent-contrast)]"
            title="Reproduzir (Espaço)"
          >
            <Play size={13} />
            Tocar
          </button>
        )}

        <button
          onClick={onStop}
          className="vly-interactive rounded-lg border border-[var(--vly-border-default)] bg-[var(--vly-surface-raised)] p-1.5 text-[var(--vly-text-muted)] hover:text-[var(--vly-text-primary)]"
          title="Parar e Retornar"
        >
          <Square size={13} />
        </button>

        <button
          onClick={onJumpToEnd}
          className="vly-interactive rounded-lg border border-[var(--vly-border-default)] bg-[var(--vly-surface-raised)] p-1.5 text-[var(--vly-text-muted)] hover:text-[var(--vly-text-primary)]"
          title="Ir para o Fim (End)"
        >
          <SkipForward size={13} />
        </button>

        {/* Timecode Digital Display */}
        <div aria-label={`Tempo ${formatTimecode(playheadMs)} de ${formatTimecode(totalDurationMs)}`} className="ml-2 flex items-center gap-1.5 rounded-lg border border-[var(--vly-border-default)] bg-[var(--vly-surface-floating)] px-2.5 py-1 font-mono text-[11px] text-[var(--vly-accent)]">
          <span className="font-bold text-[var(--vly-text-primary)]">{formatTimecode(playheadMs)}</span>
          <span className="text-[var(--vly-text-disabled)]">/</span>
          <span className="text-[var(--vly-text-secondary)]">{formatTimecode(totalDurationMs)}</span>
        </div>

        {/* Undo / Redo Buttons */}
        {(onUndo || onRedo) && (
          <div aria-label="Histórico de edição" className="ml-2 flex items-center rounded-lg border border-[var(--vly-border-default)] bg-[var(--vly-surface-raised)] p-0.5">
            {onUndo && (
              <button
                onClick={onUndo}
                disabled={canUndo === false}
                aria-label="Desfazer"
                className="vly-interactive rounded p-1.5 text-[var(--vly-text-muted)] hover:text-[var(--vly-text-primary)] disabled:opacity-40"
                title="Desfazer (Ctrl+Z)"
              >
                <Undo2 size={13} />
              </button>
            )}
            {onRedo && (
              <button
                onClick={onRedo}
                disabled={canRedo === false}
                aria-label="Refazer"
                className="vly-interactive rounded p-1.5 text-[var(--vly-text-muted)] hover:text-[var(--vly-text-primary)] disabled:opacity-40"
                title="Refazer (Ctrl+Y)"
              >
                <Redo2 size={13} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Center: Track Creation & Audio Import */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={onAddTrack}
          className="vly-interactive flex items-center gap-1.5 rounded-lg border border-[var(--vly-border-default)] bg-[var(--vly-surface-raised)] px-2.5 py-1.5 text-[var(--vly-text-secondary)] hover:text-[var(--vly-text-primary)]"
          title="Adicionar Nova Faixa de Áudio"
        >
          <Plus size={13} className="text-[var(--vly-accent)]" />
          Nova Faixa
        </button>

        <button
          onClick={onImportAudio}
          className="vly-interactive flex items-center gap-1.5 rounded-lg border border-[var(--vly-border-default)] bg-[var(--vly-surface-raised)] px-2.5 py-1.5 text-[var(--vly-text-secondary)] hover:text-[var(--vly-text-primary)]"
          title="Importar Arquivo de Áudio"
        >
          <Upload size={13} className="text-[var(--vly-success)]" />
          Importar Áudio
        </button>
      </div>

      {/* Right: Zoom & Grid Snap & Athena Assistant */}
      <div className="flex items-center gap-2">
        {/* Snapping toggle */}
        <button
          onClick={onToggleSnap}
          className={`p-1.5 rounded-lg border transition ${
            snapToGrid
            ? "border-[var(--vly-border-accent)] bg-[color-mix(in_srgb,var(--vly-accent)_18%,transparent)] text-[var(--vly-accent)]"
              : "border-[var(--vly-border-default)] bg-[var(--vly-surface-raised)] text-[var(--vly-text-muted)] hover:text-[var(--vly-text-secondary)]"
          }`}
          title={snapToGrid ? "Ajuste Magnético (Snap) Ativo" : "Snap Desativado"}
        >
          <Grid size={13} />
        </button>

        {/* Zoom Controls */}
        <div aria-label="Controles de zoom temporal" className="flex items-center rounded-lg border border-[var(--vly-border-default)] bg-[var(--vly-surface-raised)] p-0.5">
          <button
            onClick={onZoomOut}
            aria-label="Diminuir zoom"
            className="vly-interactive p-1.5 text-[var(--vly-text-muted)] hover:text-[var(--vly-text-primary)]"
            title="Diminuir Zoom Temporal"
          >
            <ZoomOut size={13} />
          </button>
          <span className="px-1.5 font-mono text-[10px] text-[var(--vly-text-muted)]">{zoom}px/s</span>
          <button
            onClick={onZoomIn}
            aria-label="Aumentar zoom"
            className="vly-interactive p-1.5 text-[var(--vly-text-muted)] hover:text-[var(--vly-text-primary)]"
            title="Aumentar Zoom Temporal"
          >
            <ZoomIn size={13} />
          </button>
          <button
            onClick={onFitTimeline}
            aria-label="Ajustar timeline à tela"
            className="vly-interactive p-1.5 text-[var(--vly-text-muted)] hover:text-[var(--vly-text-primary)]"
            title="Ajustar Projeto à Tela"
          >
            <Maximize2 size={13} />
          </button>
        </div>

        {/* Athena Audio Assistant */}
        <button
          onClick={onAskAthena}
          className="vly-interactive flex items-center gap-1.5 rounded-lg border border-[var(--vly-border-warning)] bg-[var(--vly-surface-warning)] px-2.5 py-1.5 text-xs text-[var(--vly-warning)]"
          title="Assistente de Áudio da Athena"
        >
          <Sparkles size={12} />
          Athena Áudio
        </button>
      </div>
    </div>
  );
}
