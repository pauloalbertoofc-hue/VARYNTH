"use client";

import React from "react";
import { VideoScene } from "@/lib/studio/video/types";
import { Film, Clock, Plus, LayoutGrid, List } from "lucide-react";
import { formatTimecode } from "@/lib/studio/temporal/temporal-core";
import { StatePanel } from "@/components/ui/StatePanel";

interface VideoScenePanelProps {
  scenes: VideoScene[];
  selectedSceneId?: string;
  isStoryboardMode: boolean;
  onToggleStoryboard: () => void;
  onSelectScene: (sceneId: string) => void;
  onAddScene?: () => void;
}

export function VideoScenePanel({
  scenes,
  selectedSceneId,
  isStoryboardMode,
  onToggleStoryboard,
  onSelectScene,
  onAddScene,
}: VideoScenePanelProps) {
  return (
    <div className="flex h-full select-none flex-col overflow-hidden bg-[var(--vly-surface)] text-xs text-[var(--vly-text-primary)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--vly-border-default)] bg-[var(--vly-surface-raised)] px-4 py-2.5">
        <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--vly-text-primary)]">
          <Film size={14} className="text-[var(--vly-info)]" />
          Cenas Semânticas ({scenes.length})
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onToggleStoryboard}
            aria-pressed={isStoryboardMode}
            className={`p-1.5 rounded-lg border transition ${
              isStoryboardMode
                ? "bg-[var(--vly-info)] border-[var(--vly-border-info)] text-[var(--vly-text-on-accent)]"
                : "bg-[var(--vly-surface-raised)] border-[var(--vly-border-subtle)] text-[var(--vly-text-muted)] hover:text-[var(--vly-text-primary)]"
            }`}
            title={isStoryboardMode ? "Modo Lista de Cenas" : "Modo Storyboard Visual"}
          >
            {isStoryboardMode ? <List size={13} /> : <LayoutGrid size={13} />}
          </button>

          {onAddScene && (
            <button
              onClick={onAddScene}
              className="vly-interactive rounded-lg border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-raised)] p-1.5 text-[var(--vly-info)] hover:border-[var(--vly-border-info)]"
              title="Criar Nova Cena"
            >
              <Plus size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Content: List or Storyboard Cards */}
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {scenes.length === 0 && <StatePanel tone="empty" title="Nenhuma cena" description="Crie uma cena para organizar a narrativa do vídeo." action={onAddScene ? <button type="button" onClick={onAddScene} className="vly-interactive rounded border border-[var(--vly-border-accent)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--vly-accent)]">Nova cena</button> : undefined} />}
        {isStoryboardMode ? (
          <div className="grid grid-cols-2 gap-2">
            {scenes.map((scene, idx) => {
              const isSelected = scene.id === selectedSceneId;
              const durationSec = Math.round((scene.endMs - scene.startMs) / 1000);

              return (
                <div
                  key={scene.id}
                  onClick={() => onSelectScene(scene.id)}
                  onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelectScene(scene.id); } }}
                  role="button"
                  tabIndex={0}
                  aria-current={isSelected ? "page" : undefined}
                  className={`p-2.5 rounded-xl border cursor-pointer transition flex flex-col justify-between aspect-video ${
                    isSelected
                      ? "bg-[var(--vly-info)]/15 border-[var(--vly-border-info)] text-[var(--vly-text-primary)] shadow-lg"
                      : "bg-[var(--vly-surface)] border-[var(--vly-border-subtle)] text-[var(--vly-text-secondary)] hover:border-[var(--vly-border-strong)]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs truncate max-w-[100px]">{scene.name}</span>
                    <span className="rounded bg-[var(--vly-info)]/10 px-1.5 py-0.5 font-mono text-[9px] text-[var(--vly-info)]">
                      {durationSec}s
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[10px] text-[var(--vly-text-muted)]">
                    {scene.description || `Cena ${idx + 1} da linha do tempo`}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          scenes.map((scene, idx) => {
            const isSelected = scene.id === selectedSceneId;
            const startTc = formatTimecode(scene.startMs);
            const endTc = formatTimecode(scene.endMs);

            return (
              <div
                key={scene.id}
                onClick={() => onSelectScene(scene.id)}
                onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelectScene(scene.id); } }}
                role="button"
                tabIndex={0}
                aria-current={isSelected ? "page" : undefined}
                className={`p-2.5 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                  isSelected
                    ? "bg-[var(--vly-info)]/15 border-[var(--vly-border-info)] text-[var(--vly-text-primary)] font-medium"
                    : "bg-[var(--vly-world)] border-transparent text-[var(--vly-text-muted)] hover:bg-[var(--vly-surface)] hover:text-[var(--vly-text-primary)]"
                }`}
              >
                <div className="overflow-hidden max-w-[65%]">
                  <div className="truncate text-xs font-semibold text-[var(--vly-text-primary)]">{scene.name}</div>
                  <div className="mt-0.5 truncate text-[10px] text-[var(--vly-text-muted)]">
                    {scene.description || `Intervalo de cena semântica`}
                  </div>
                </div>

                <div className="flex items-center gap-1 font-mono text-[10px] text-[var(--vly-text-muted)]">
                  <Clock size={10} />
                  <span>{startTc}</span>
                  <span className="text-[var(--vly-text-muted)]">→</span>
                  <span>{endTc}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
