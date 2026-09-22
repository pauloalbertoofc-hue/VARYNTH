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
    <div className="flex items-center justify-between px-4 py-2 bg-[#0e0f1c] border-b border-[#1c1d32] text-xs text-slate-300 select-none">
      {/* Left: Transport Buttons */}
      <div className="flex items-center gap-1.5">
        <button onClick={onRecord} className={`px-2 py-1.5 rounded-lg border ${playbackState === "BUFFERING" ? "bg-rose-600 text-white border-rose-400" : "bg-[#141528] text-rose-300 border-[#232544]"}`} title="Gravar pelo microfone">● REC</button><button onClick={onAddMarker} className="px-2 py-1.5 rounded-lg border border-[#232544] bg-[#141528] text-amber-300" title="Adicionar marker no playhead">⚑</button>
        <button
          onClick={onJumpToStart}
          className="p-1.5 bg-[#141528] hover:bg-[#1f213a] text-slate-400 hover:text-white rounded-lg border border-[#232544] transition"
          title="Ir para o Início (Home)"
        >
          <SkipBack size={13} />
        </button>

        {playbackState === "PLAYING" ? (
          <button
            onClick={onPause}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-semibold flex items-center gap-1 shadow-lg shadow-amber-500/20 transition"
            title="Pausar (Espaço)"
          >
            <Pause size={13} />
            Pausar
          </button>
        ) : (
          <button
            onClick={onPlay}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold flex items-center gap-1 shadow-lg shadow-blue-500/20 transition"
            title="Reproduzir (Espaço)"
          >
            <Play size={13} />
            Tocar
          </button>
        )}

        <button
          onClick={onStop}
          className="p-1.5 bg-[#141528] hover:bg-[#1f213a] text-slate-400 hover:text-white rounded-lg border border-[#232544] transition"
          title="Parar e Retornar"
        >
          <Square size={13} />
        </button>

        <button
          onClick={onJumpToEnd}
          className="p-1.5 bg-[#141528] hover:bg-[#1f213a] text-slate-400 hover:text-white rounded-lg border border-[#232544] transition"
          title="Ir para o Fim (End)"
        >
          <SkipForward size={13} />
        </button>

        {/* Timecode Digital Display */}
        <div className="ml-2 px-2.5 py-1 bg-black/60 border border-[#222442] rounded-lg font-mono text-[11px] text-blue-400 flex items-center gap-1.5">
          <span className="font-bold text-white">{formatTimecode(playheadMs)}</span>
          <span className="text-slate-600">/</span>
          <span className="text-slate-400">{formatTimecode(totalDurationMs)}</span>
        </div>

        {/* Undo / Redo Buttons */}
        {(onUndo || onRedo) && (
          <div className="flex items-center ml-2 bg-[#141528] p-0.5 rounded-lg border border-[#232544]">
            {onUndo && (
              <button
                onClick={onUndo}
                disabled={canUndo === false}
                className="p-1.5 text-slate-400 hover:text-white disabled:opacity-40 disabled:hover:text-slate-400 rounded transition"
                title="Desfazer (Ctrl+Z)"
              >
                <Undo2 size={13} />
              </button>
            )}
            {onRedo && (
              <button
                onClick={onRedo}
                disabled={canRedo === false}
                className="p-1.5 text-slate-400 hover:text-white disabled:opacity-40 disabled:hover:text-slate-400 rounded transition"
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
          className="px-2.5 py-1.5 bg-[#141528] hover:bg-[#1f213a] text-slate-300 hover:text-white rounded-lg flex items-center gap-1.5 transition border border-[#232544]"
          title="Adicionar Nova Faixa de Áudio"
        >
          <Plus size={13} className="text-blue-400" />
          Nova Faixa
        </button>

        <button
          onClick={onImportAudio}
          className="px-2.5 py-1.5 bg-[#141528] hover:bg-[#1f213a] text-slate-300 hover:text-white rounded-lg flex items-center gap-1.5 transition border border-[#232544]"
          title="Importar Arquivo de Áudio"
        >
          <Upload size={13} className="text-emerald-400" />
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
              ? "bg-blue-600/20 border-blue-500 text-blue-300"
              : "bg-[#141528] border-[#232544] text-slate-500 hover:text-slate-300"
          }`}
          title={snapToGrid ? "Ajuste Magnético (Snap) Ativo" : "Snap Desativado"}
        >
          <Grid size={13} />
        </button>

        {/* Zoom Controls */}
        <div className="flex items-center bg-[#141528] p-0.5 rounded-lg border border-[#232544]">
          <button
            onClick={onZoomOut}
            className="p-1.5 text-slate-400 hover:text-white transition"
            title="Diminuir Zoom Temporal"
          >
            <ZoomOut size={13} />
          </button>
          <span className="px-1.5 font-mono text-[10px] text-slate-400">{zoom}px/s</span>
          <button
            onClick={onZoomIn}
            className="p-1.5 text-slate-400 hover:text-white transition"
            title="Aumentar Zoom Temporal"
          >
            <ZoomIn size={13} />
          </button>
          <button
            onClick={onFitTimeline}
            className="p-1.5 text-slate-400 hover:text-white transition"
            title="Ajustar Projeto à Tela"
          >
            <Maximize2 size={13} />
          </button>
        </div>

        {/* Athena Audio Assistant */}
        <button
          onClick={onAskAthena}
          className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs flex items-center gap-1.5 transition"
          title="Assistente de Áudio da Athena"
        >
          <Sparkles size={12} />
          Athena Áudio
        </button>
      </div>
    </div>
  );
}
