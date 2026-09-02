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
    <div className="flex items-center justify-between px-4 py-2 bg-[#0e0f1c] border-b border-[#1c1d32] text-xs text-slate-300 select-none">
      {/* Left: Transport Buttons */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={onJumpToStart}
          className="p-1.5 bg-[#141528] hover:bg-[#1f213a] text-slate-400 hover:text-white rounded-lg border border-[#232544] transition"
          title="Ir para o Início"
        >
          <SkipBack size={13} />
        </button>

        {playbackState === "PLAYING" ? (
          <button
            onClick={onPause}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-semibold flex items-center gap-1 shadow-lg shadow-amber-500/20 transition"
          >
            <Pause size={13} />
            Pausar
          </button>
        ) : (
          <button
            onClick={onPlay}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold flex items-center gap-1 shadow-lg shadow-blue-500/20 transition"
          >
            <Play size={13} />
            Tocar
          </button>
        )}

        <button
          onClick={onStop}
          className="p-1.5 bg-[#141528] hover:bg-[#1f213a] text-slate-400 hover:text-white rounded-lg border border-[#232544] transition"
          title="Parar"
        >
          <Square size={13} />
        </button>

        <button
          onClick={onJumpToEnd}
          className="p-1.5 bg-[#141528] hover:bg-[#1f213a] text-slate-400 hover:text-white rounded-lg border border-[#232544] transition"
          title="Ir para o Fim"
        >
          <SkipForward size={13} />
        </button>

        {/* SMPTE Timecode Digital Display */}
        <div className="ml-2 px-2.5 py-1 bg-black/60 border border-[#222442] rounded-lg font-mono text-[11px] text-blue-400 flex items-center gap-1.5">
          <span className="font-bold text-white">
            {formatTimecode(playheadMs, { fps: frameRate, showFrames: true })}
          </span>
          <span className="text-slate-600">/</span>
          <span className="text-slate-400">
            {formatTimecode(totalDurationMs, { fps: frameRate, showFrames: true })}
          </span>
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

      {/* Center: Add Track / Scene / Import */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={onAddScene}
          className="px-2.5 py-1.5 bg-[#141528] hover:bg-[#1f213a] text-slate-300 hover:text-white rounded-lg flex items-center gap-1.5 transition border border-[#232544]"
        >
          <Film size={13} className="text-amber-400" />
          Nova Cena
        </button>

        <button
          onClick={onAddTrack}
          className="px-2.5 py-1.5 bg-[#141528] hover:bg-[#1f213a] text-slate-300 hover:text-white rounded-lg flex items-center gap-1.5 transition border border-[#232544]"
        >
          <Plus size={13} className="text-blue-400" />
          Nova Faixa
        </button>

        <button
          onClick={onImportVideo}
          className="px-2.5 py-1.5 bg-[#141528] hover:bg-[#1f213a] text-slate-300 hover:text-white rounded-lg flex items-center gap-1.5 transition border border-[#232544]"
        >
          <Upload size={13} className="text-emerald-400" />
          Importar Mídia
        </button>
      </div>

      {/* Right: Zoom & Grid Snap & Athena Assistant */}
      <div className="flex items-center gap-2">
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

        <div className="flex items-center bg-[#141528] p-0.5 rounded-lg border border-[#232544]">
          <button onClick={onZoomOut} className="p-1.5 text-slate-400 hover:text-white transition">
            <ZoomOut size={13} />
          </button>
          <span className="px-1.5 font-mono text-[10px] text-slate-400">{zoom}px/s</span>
          <button onClick={onZoomIn} className="p-1.5 text-slate-400 hover:text-white transition">
            <ZoomIn size={13} />
          </button>
          <button onClick={onFitTimeline} className="p-1.5 text-slate-400 hover:text-white transition">
            <Maximize2 size={13} />
          </button>
        </div>

        <button
          onClick={onAskAthena}
          className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs flex items-center gap-1.5 transition"
        >
          <Sparkles size={12} />
          Athena Vídeo
        </button>
      </div>
    </div>
  );
}

