"use client";

import React from "react";
import { AudioClip, AudioTrack } from "@/lib/studio/audio/types";
import { Sliders, Volume2, Scissors, Copy, Trash2, Clock, Music } from "lucide-react";

interface AudioPropertiesPanelProps {
  selectedClip?: AudioClip;
  selectedTrack?: AudioTrack;
  playheadMs: number;
  onUpdateClip: (clipId: string, updates: Partial<AudioClip>) => void;
  onUpdateTrack: (trackId: string, updates: Partial<AudioTrack>) => void;
  onSplitClipAtPlayhead?: (clipId: string) => void;
  onDeleteClip?: (clipId: string) => void;
}

export function AudioPropertiesPanel({
  selectedClip,
  selectedTrack,
  playheadMs,
  onUpdateClip,
  onUpdateTrack,
  onSplitClipAtPlayhead,
  onDeleteClip,
}: AudioPropertiesPanelProps) {
  if (!selectedClip && !selectedTrack) {
    return (
      <div className="h-full flex items-center justify-center p-6 text-center text-slate-500 text-xs italic bg-[#0b0c16]">
        Selecione uma faixa ou clip na timeline para editar parâmetros e propriedades.
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#0b0c16] text-slate-300 text-xs overflow-y-auto p-4 space-y-5 select-none">
      {/* Clip Properties */}
      {selectedClip && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#1c1d32]">
            <div className="font-semibold text-white truncate max-w-[160px]">
              {selectedClip.name || "Clip Selecionado"}
            </div>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/20">
              CLIP
            </span>
          </div>

          {/* Temporal Boundaries */}
          <div className="space-y-2">
            <span className="text-[11px] font-semibold uppercase text-slate-400 flex items-center gap-1.5">
              <Clock size={13} className="text-blue-400" />
              Posicionamento Temporal
            </span>

            <div className="grid grid-cols-2 gap-2 font-mono">
              <div className="bg-[#121324] border border-[#1f213a] rounded-lg p-2 flex items-center justify-between">
                <span className="text-slate-500 text-[10px]">Início:</span>
                <input
                  type="number"
                  value={Math.round(selectedClip.timelineStartMs)}
                  onChange={(e) =>
                    onUpdateClip(selectedClip.id, { timelineStartMs: Math.max(0, parseInt(e.target.value) || 0) })
                  }
                  className="w-16 bg-transparent text-right text-white text-xs outline-none"
                />
              </div>

              <div className="bg-[#121324] border border-[#1f213a] rounded-lg p-2 flex items-center justify-between">
                <span className="text-slate-500 text-[10px]">Duração:</span>
                <span className="text-right text-white text-xs">
                  {Math.round((selectedClip.sourceEndMs - selectedClip.sourceStartMs) / 1000)}s
                </span>
              </div>
            </div>
          </div>

          {/* Non-destructive Trim bounds */}
          <div className="space-y-2 pt-2 border-t border-[#1c1d32]">
            <span className="text-[11px] font-semibold uppercase text-slate-400 flex items-center gap-1.5">
              <Scissors size={13} className="text-amber-400" />
              Recorte Não-Destrutivo (Trim)
            </span>

            <div className="grid grid-cols-2 gap-2 font-mono">
              <div className="bg-[#121324] border border-[#1f213a] rounded-lg p-2 flex items-center justify-between">
                <span className="text-slate-500 text-[10px]">Trim In:</span>
                <input
                  type="number"
                  value={Math.round(selectedClip.sourceStartMs)}
                  onChange={(e) =>
                    onUpdateClip(selectedClip.id, { sourceStartMs: Math.max(0, parseInt(e.target.value) || 0) })
                  }
                  className="w-16 bg-transparent text-right text-white text-xs outline-none"
                />
              </div>

              <div className="bg-[#121324] border border-[#1f213a] rounded-lg p-2 flex items-center justify-between">
                <span className="text-slate-500 text-[10px]">Trim Out:</span>
                <input
                  type="number"
                  value={Math.round(selectedClip.sourceEndMs)}
                  onChange={(e) =>
                    onUpdateClip(selectedClip.id, { sourceEndMs: Math.max(selectedClip.sourceStartMs + 100, parseInt(e.target.value) || 0) })
                  }
                  className="w-16 bg-transparent text-right text-white text-xs outline-none"
                />
              </div>
            </div>
          </div>

          {/* Gain & Fades */}
          <div className="space-y-3 pt-2 border-t border-[#1c1d32]">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <Volume2 size={12} /> Ganho do Clip
              </span>
              <span className="font-mono text-white">{Math.round((selectedClip.gain ?? 1.0) * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="200"
              value={Math.round((selectedClip.gain ?? 1.0) * 100)}
              onChange={(e) => onUpdateClip(selectedClip.id, { gain: (parseInt(e.target.value) || 0) / 100 })}
              className="w-full accent-blue-500 h-1.5 bg-[#1a1c32] rounded-lg cursor-pointer"
            />

            <div className="grid grid-cols-2 gap-2 pt-1 font-mono">
              <div className="bg-[#121324] border border-[#1f213a] rounded-lg p-2 flex items-center justify-between">
                <span className="text-slate-500 text-[10px]">Fade In (ms):</span>
                <input
                  type="number"
                  value={Math.round(selectedClip.fadeInMs || 0)}
                  onChange={(e) =>
                    onUpdateClip(selectedClip.id, { fadeInMs: Math.max(0, parseInt(e.target.value) || 0) })
                  }
                  className="w-12 bg-transparent text-right text-white text-xs outline-none"
                />
              </div>

              <div className="bg-[#121324] border border-[#1f213a] rounded-lg p-2 flex items-center justify-between">
                <span className="text-slate-500 text-[10px]">Fade Out:</span>
                <input
                  type="number"
                  value={Math.round(selectedClip.fadeOutMs || 0)}
                  onChange={(e) =>
                    onUpdateClip(selectedClip.id, { fadeOutMs: Math.max(0, parseInt(e.target.value) || 0) })
                  }
                  className="w-12 bg-transparent text-right text-white text-xs outline-none"
                />
              </div>
            </div>
          </div>

          {/* Clip Actions */}
          <div className="pt-3 border-t border-[#1c1d32] flex items-center gap-2">
            {onSplitClipAtPlayhead && (
              <button
                onClick={() => onSplitClipAtPlayhead(selectedClip.id)}
                className="flex-1 py-1.5 bg-[#141528] hover:bg-[#1f213a] text-slate-300 hover:text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border border-[#232544] transition"
                title="Dividir clip na posição atual da agulha (Playhead)"
              >
                <Scissors size={12} />
                Dividir na Agulha
              </button>
            )}

            {onDeleteClip && (
              <button
                onClick={() => onDeleteClip(selectedClip.id)}
                className="p-1.5 bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-500/30 rounded-lg transition"
                title="Remover Clip"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Track Properties */}
      {selectedTrack && !selectedClip && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#1c1d32]">
            <div className="font-semibold text-white truncate max-w-[160px]">{selectedTrack.name}</div>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-purple-500/15 text-purple-400 border border-purple-500/20">
              {selectedTrack.type}
            </span>
          </div>

          <div className="space-y-3">
            <span className="text-[11px] font-semibold uppercase text-slate-400 flex items-center gap-1.5">
              <Sliders size={13} className="text-purple-400" />
              Parâmetros da Faixa
            </span>

            <div>
              <span className="text-slate-400 text-[10px] block mb-1">Nome da Faixa</span>
              <input
                type="text"
                value={selectedTrack.name}
                onChange={(e) => onUpdateTrack(selectedTrack.id, { name: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-[#121324] border border-[#1f213a] rounded-lg text-white text-xs outline-none focus:border-purple-500"
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2">
              <span>Volume Master da Faixa</span>
              <span className="font-mono text-white">{Math.round((selectedTrack.volume ?? 1.0) * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="150"
              value={Math.round((selectedTrack.volume ?? 1.0) * 100)}
              onChange={(e) => onUpdateTrack(selectedTrack.id, { volume: (parseInt(e.target.value) || 0) / 100 })}
              className="w-full accent-purple-500 h-1.5 bg-[#1a1c32] rounded-lg cursor-pointer"
            />
          </div>
        </div>
      )}
    </div>
  );
}

