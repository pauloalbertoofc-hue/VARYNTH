"use client";

import React from "react";
import { VideoClip, VideoScene, SubtitleCue, VideoTrack } from "@/lib/studio/video/types";
import { Sliders, Scissors, Move, RotateCw, Eye, Clock, Type, Film, Trash2 } from "lucide-react";
import { StatePanel } from "@/components/ui/StatePanel";

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
      <StatePanel tone="empty" title="Nenhum elemento selecionado" description="Selecione um clip, cena ou faixa para visualizar e editar parâmetros de vídeo." className="h-full rounded-none border-0 bg-[var(--vly-surface)]" />
    );
  }

  return (
    <div className="flex h-full select-none flex-col space-y-5 overflow-y-auto bg-[var(--vly-surface)] p-4 text-xs text-[var(--vly-text-primary)]">
      {/* Clip Properties */}
      {selectedClip && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--vly-border-subtle)] pb-2">
            <div className="max-w-[160px] truncate font-semibold text-[var(--vly-text-primary)]">
              {selectedClip.name || selectedClip.textContent || "Clip Selecionado"}
            </div>
            <span className="rounded border border-[var(--vly-border-info)] bg-[var(--vly-info)]/10 px-2 py-0.5 font-mono text-[10px] uppercase text-[var(--vly-info)]">
              {selectedClip.type}
            </span>
          </div>

          {/* Temporal Boundaries */}
          <div className="space-y-2">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase text-[var(--vly-text-muted)]">
              <Clock size={13} className="text-[var(--vly-info)]" />
              Posição Temporal (Timeline)
            </span>
            <div className="grid grid-cols-2 gap-2 font-mono">
              <div className="flex items-center justify-between rounded-lg border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-raised)] p-2">
                <span className="text-[10px] text-[var(--vly-text-muted)]">Início:</span>
                <input
                  type="number"
                  value={Math.round(selectedClip.timelineStartMs)}
                  onChange={(e) =>
                    onUpdateClip(selectedClip.id, { timelineStartMs: Math.max(0, parseInt(e.target.value) || 0) })
                  }
                  className="vly-field w-16 bg-transparent text-right text-xs outline-none"
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-raised)] p-2">
                <span className="text-[10px] text-[var(--vly-text-muted)]">Duração:</span>
                <span className="text-right text-xs text-[var(--vly-text-primary)]">
                  {Math.round((selectedClip.sourceEndMs - selectedClip.sourceStartMs) / 1000)}s
                </span>
              </div>
            </div>
          </div>

          {/* Visual Transform */}
          {selectedClip.transform && (
            <div className="space-y-3 border-t border-[var(--vly-border-subtle)] pt-2">
              <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase text-[var(--vly-text-muted)]">
                <Move size={13} className="text-[var(--vly-accent)]" />
                Transformação Visual
              </span>

              {/* Opacity */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-[var(--vly-text-muted)]">
                  <span className="flex items-center gap-1"><Eye size={11} /> Opacidade</span>
                  <span className="font-mono text-[var(--vly-text-primary)]">{Math.round((selectedClip.transform.opacity ?? 1) * 100)}%</span>
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
                  className="h-1.5 w-full cursor-pointer rounded bg-[var(--vly-surface-raised)] accent-[var(--vly-accent)]"
                />
              </div>

              {/* Scale & Rotation */}
              <div className="grid grid-cols-2 gap-2 font-mono">
                <div className="flex items-center justify-between rounded-lg border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-raised)] p-2">
                  <span className="text-[10px] text-[var(--vly-text-muted)]">Escala:</span>
                  <span className="text-xs text-[var(--vly-text-primary)]">{selectedClip.transform.scaleX || 1}x</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-raised)] p-2">
                  <span className="text-[10px] text-[var(--vly-text-muted)]">Rotação:</span>
                  <span className="text-xs text-[var(--vly-text-primary)]">{selectedClip.transform.rotation || 0}°</span>
                </div>
              </div>
            </div>
          )}

          {/* Non-destructive Trim bounds */}
          <div className="space-y-2 border-t border-[var(--vly-border-subtle)] pt-2">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase text-[var(--vly-text-muted)]">
              <Scissors size={13} className="text-[var(--vly-warning)]" />
              Recorte Não-Destrutivo (Trim)
            </span>

            <div className="grid grid-cols-2 gap-2 font-mono">
              <div className="flex items-center justify-between rounded-lg border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-raised)] p-2">
                <span className="text-[10px] text-[var(--vly-text-muted)]">Trim In:</span>
                <input
                  type="number"
                  value={Math.round(selectedClip.sourceStartMs)}
                  onChange={(e) =>
                    onUpdateClip(selectedClip.id, { sourceStartMs: Math.max(0, parseInt(e.target.value) || 0) })
                  }
                  className="vly-field w-16 bg-transparent text-right text-xs outline-none"
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-raised)] p-2">
                <span className="text-[10px] text-[var(--vly-text-muted)]">Trim Out:</span>
                <input
                  type="number"
                  value={Math.round(selectedClip.sourceEndMs)}
                  onChange={(e) =>
                    onUpdateClip(selectedClip.id, { sourceEndMs: Math.max(selectedClip.sourceStartMs + 100, parseInt(e.target.value) || 0) })
                  }
                  className="vly-field w-16 bg-transparent text-right text-xs outline-none"
                />
              </div>
            </div>
          </div>

          {/* Clip Actions */}
          <div className="flex items-center gap-2 border-t border-[var(--vly-border-subtle)] pt-3">
            {onSplitClipAtPlayhead && (
              <button
                onClick={() => onSplitClipAtPlayhead(selectedClip.id)}
                className="vly-interactive flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-raised)] py-1.5 text-xs font-semibold text-[var(--vly-text-secondary)] transition hover:text-[var(--vly-text-primary)]"
              >
                <Scissors size={12} />
                Dividir na Agulha
              </button>
            )}

            {onDeleteClip && (
              <button
                onClick={() => onDeleteClip(selectedClip.id)}
                className="vly-interactive rounded-lg border border-[var(--vly-border-danger)] bg-[var(--vly-danger)]/10 p-1.5 text-[var(--vly-danger)] transition hover:bg-[var(--vly-danger)]/20"
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
          <div className="flex items-center justify-between border-b border-[var(--vly-border-subtle)] pb-2">
            <div className="max-w-[160px] truncate font-semibold text-[var(--vly-text-primary)]">{selectedScene.name}</div>
            <span className="rounded border border-[var(--vly-border-warning)] bg-[var(--vly-warning)]/10 px-2 py-0.5 font-mono text-[10px] uppercase text-[var(--vly-warning)]">
              CENA
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <span className="mb-1 block text-[10px] text-[var(--vly-text-muted)]">Título da Cena</span>
              <input
                type="text"
                value={selectedScene.name}
                onChange={(e) => onUpdateScene && onUpdateScene(selectedScene.id, { name: e.target.value })}
                className="vly-field w-full px-2.5 py-1.5 text-xs outline-none focus:border-[var(--vly-border-warning)]"
              />
            </div>

            <div>
              <span className="mb-1 block text-[10px] text-[var(--vly-text-muted)]">Descrição / Contexto Narrativo</span>
              <textarea
                rows={3}
                value={selectedScene.description || ""}
                onChange={(e) => onUpdateScene && onUpdateScene(selectedScene.id, { description: e.target.value })}
                className="vly-field w-full resize-none px-2.5 py-1.5 text-xs outline-none focus:border-[var(--vly-border-warning)]"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
