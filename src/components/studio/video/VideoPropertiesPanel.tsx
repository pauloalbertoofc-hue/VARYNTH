"use client";

import React from "react";
import { VideoClip, VideoScene, SubtitleCue, VideoTrack } from "@/lib/studio/video/types";
import { Sliders, Scissors, Move, RotateCw, Eye, Clock, Type, Film, Trash2 } from "lucide-react";

interface VideoPropertiesPanelProps {
  selectedClip?: VideoClip;
  selectedScene?: VideoScene;
  selectedTrack?: VideoTrack;
  playheadMs: number;
  onUpdateClip: (clipId: string, updates: Partial<VideoClip>) => void;
  onUpdateScene?: (sceneId: string, updates: Partial<VideoScene>) => void;
  onSplitClipAtPlayhead?: (clipId: string) => void;
  onDeleteClip?: (clipId: string) => void;
}

export function VideoPropertiesPanel({
  selectedClip,
  selectedScene,
  selectedTrack,
  playheadMs,
  onUpdateClip,
  onUpdateScene,
  onSplitClipAtPlayhead,
  onDeleteClip,
}: VideoPropertiesPanelProps) {
  if (!selectedClip && !selectedScene && !selectedTrack) {
    return (
      <div className="h-full flex items-center justify-center p-6 text-center text-slate-500 text-xs italic bg-[#0b0c16]">
        Selecione um clip, cena ou faixa para visualizar e editar parâmetros de vídeo.
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
              {selectedClip.name || selectedClip.textContent || "Clip Selecionado"}
            </div>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/20">
              {selectedClip.type}
            </span>
          </div>

          {/* Temporal Boundaries */}
          <div className="space-y-2">
            <span className="text-[11px] font-semibold uppercase text-slate-400 flex items-center gap-1.5">
              <Clock size={13} className="text-blue-400" />
              Posição Temporal (Timeline)
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

          {/* Visual Transform */}
          {selectedClip.transform && (
            <div className="space-y-3 pt-2 border-t border-[#1c1d32]">
              <span className="text-[11px] font-semibold uppercase text-slate-400 flex items-center gap-1.5">
                <Move size={13} className="text-purple-400" />
                Transformação Visual
              </span>

              {/* Opacity */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1"><Eye size={11} /> Opacidade</span>
                  <span className="font-mono text-white">{Math.round((selectedClip.transform.opacity ?? 1) * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={Math.round((selectedClip.transform.opacity ?? 1) * 100)}
                  onChange={(e) =>
                    onUpdateClip(selectedClip.id, {
                      transform: { ...selectedClip.transform, opacity: parseInt(e.target.value) / 100 },
                    })
                  }
                  className="w-full accent-purple-500 h-1.5 bg-[#1a1c32] rounded cursor-pointer"
                />
              </div>

              {/* Scale & Rotation */}
              <div className="grid grid-cols-2 gap-2 font-mono">
                <div className="bg-[#121324] border border-[#1f213a] rounded-lg p-2 flex items-center justify-between">
                  <span className="text-slate-500 text-[10px]">Escala:</span>
                  <span className="text-white text-xs">{selectedClip.transform.scaleX || 1}x</span>
                </div>
                <div className="bg-[#121324] border border-[#1f213a] rounded-lg p-2 flex items-center justify-between">
                  <span className="text-slate-500 text-[10px]">Rotação:</span>
                  <span className="text-white text-xs">{selectedClip.transform.rotation || 0}°</span>
                </div>
              </div>
            </div>
          )}

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

          {/* Clip Actions */}
          <div className="pt-3 border-t border-[#1c1d32] flex items-center gap-2">
            {onSplitClipAtPlayhead && (
              <button
                onClick={() => onSplitClipAtPlayhead(selectedClip.id)}
                className="flex-1 py-1.5 bg-[#141528] hover:bg-[#1f213a] text-slate-300 hover:text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border border-[#232544] transition"
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

      {/* Scene Properties */}
      {selectedScene && !selectedClip && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#1c1d32]">
            <div className="font-semibold text-white truncate max-w-[160px]">{selectedScene.name}</div>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/20">
              CENA
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <span className="text-slate-400 text-[10px] block mb-1">Título da Cena</span>
              <input
                type="text"
                value={selectedScene.name}
                onChange={(e) => onUpdateScene && onUpdateScene(selectedScene.id, { name: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-[#121324] border border-[#1f213a] rounded-lg text-white text-xs outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <span className="text-slate-400 text-[10px] block mb-1">Descrição / Contexto Narrativo</span>
              <textarea
                rows={3}
                value={selectedScene.description || ""}
                onChange={(e) => onUpdateScene && onUpdateScene(selectedScene.id, { description: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-[#121324] border border-[#1f213a] rounded-lg text-white text-xs outline-none focus:border-amber-500 resize-none"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

