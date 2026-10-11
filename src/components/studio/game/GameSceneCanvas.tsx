"use client";

import React, { useRef, useState } from "react";
import { GameDocumentState, GameEntity, GameScene } from "@/lib/studio/game/types";
import { Box, Layers, MousePointer, ZoomIn, ZoomOut } from "lucide-react";

interface GameSceneCanvasProps {
  documentState: GameDocumentState;
  activeScene?: GameScene;
  selectedEntityId?: string;
  onSelectEntity: (entityId: string) => void;
  onUpdateEntityTransform: (entityId: string, x: number, y: number) => void;
}

export const GameSceneCanvas: React.FC<GameSceneCanvasProps> = ({
  documentState,
  activeScene,
  selectedEntityId,
  onSelectEntity,
  onUpdateEntityTransform,
}) => {
  const [zoom, setZoom] = useState(1);
  const [grid, setGrid] = useState(32);
  const drag = useRef<{ id: string; ox: number; oy: number } | null>(null);
  const scene = activeScene || documentState.scenes.find((s) => s.id === documentState.entrySceneId);
  const sceneEntities = documentState.entities.filter((e) => e.sceneId === scene?.id).sort((a, b) => ((a.components.find(c => c.type === "TRANSFORM") as any)?.zIndex || 0) - ((b.components.find(c => c.type === "TRANSFORM") as any)?.zIndex || 0));

  return (
    <div className="relative flex h-full w-full select-none items-center justify-center overflow-auto bg-[var(--vly-world)] p-6">
      <div className="absolute right-3 top-3 z-40 flex gap-1 rounded-lg border border-[var(--vly-border-strong)] bg-[var(--vly-surface-floating)] p-1 shadow-[var(--vly-shadow-floating)]">
        <button onClick={() => setZoom(z => Math.min(2, z + .1))} title="Aumentar zoom" className="vly-interactive rounded p-1.5 text-[var(--vly-text-secondary)] hover:text-[var(--vly-text-primary)]"><ZoomIn size={14}/></button>
        <span className="px-1 py-1 font-mono text-[10px] text-[var(--vly-text-muted)]">{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom(z => Math.max(.5, z - .1))} title="Reduzir zoom" className="vly-interactive rounded p-1.5 text-[var(--vly-text-secondary)] hover:text-[var(--vly-text-primary)]"><ZoomOut size={14}/></button>
        <button onClick={() => setGrid(g => g === 32 ? 16 : 32)} className="vly-interactive rounded px-2 text-[10px] text-[var(--vly-success)]">Grid {grid}</button>
      </div>
      {/* 2D Canvas Container (800x600 virtual viewport) */}
      <div
        className="relative flex shrink-0 flex-col justify-between overflow-hidden rounded-xl border border-[var(--vly-border-strong)] shadow-[var(--vly-shadow-floating)]"
        style={{ width: 800 * zoom, height: 600 * zoom, backgroundColor: scene?.backgroundColor || "var(--vly-world)" }}
      >
        {/* Viewport Grid Overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-15"
          style={{
            backgroundImage:
              "linear-gradient(to right, var(--vly-border-subtle) 1px, transparent 1px), linear-gradient(to bottom, var(--vly-border-subtle) 1px, transparent 1px)",
            backgroundSize: `${grid * zoom}px ${grid * zoom}px`,
          }}
        />

        {/* Scene Info Header */}
        <div className="relative z-10 flex items-center justify-between border-b border-white/10 bg-black/40 p-3 text-xs text-[var(--vly-text-secondary)] backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Layers size={14} className="text-[var(--vly-success)]" />
            <span className="font-semibold text-[var(--vly-text-primary)]">{scene?.name || "Cena"}</span>
            <span className="text-[10px] text-[var(--vly-text-muted)]">({sceneEntities.length} entidades)</span>
          </div>
          <div className="flex items-center gap-3 font-mono text-[11px] text-[var(--vly-text-muted)]">
            <span>Res: 800×600</span>
            <span>2D Canvas Viewport</span>
          </div>
        </div>

        {/* Render Entities */}
        <div className="relative flex-1 w-full h-full">
          {sceneEntities.map((ent) => {
            const tr = ent.components.find((c) => c.type === "TRANSFORM");
            const sprite = ent.components.find((c) => c.type === "SPRITE");
            const textComp = ent.components.find((c) => c.type === "TEXT");
            const uiComp = ent.components.find((c) => c.type === "UI");

            const x = tr && tr.type === "TRANSFORM" ? tr.x : 100;
            const y = tr && tr.type === "TRANSFORM" ? tr.y : 100;
            const isSelected = ent.id === selectedEntityId;

            return (
              <div
                key={ent.id}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onSelectEntity(ent.id);
                  const rect = e.currentTarget.parentElement?.getBoundingClientRect();
                  if (rect) { drag.current = { id: ent.id, ox: (e.clientX - rect.left) / zoom - x, oy: (e.clientY - rect.top) / zoom - y }; e.currentTarget.setPointerCapture(e.pointerId); }
                }}
                onPointerMove={(e) => { if (!drag.current || drag.current.id !== ent.id) return; const rect = e.currentTarget.parentElement?.getBoundingClientRect(); if (!rect) return; const px = (e.clientX - rect.left) / zoom - drag.current.ox; const py = (e.clientY - rect.top) / zoom - drag.current.oy; onUpdateEntityTransform(ent.id, Math.round(px / grid) * grid, Math.round(py / grid) * grid); }}
                onPointerUp={() => { drag.current = null; }}
                role="button"
                tabIndex={0}
                aria-current={isSelected ? "true" : undefined}
                aria-label={`Selecionar entidade ${ent.name}`}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectEntity(ent.id);
                  }
                }}
                className={`absolute cursor-pointer transition-all ${
                  isSelected ? "ring-2 ring-emerald-400 ring-offset-2 ring-offset-black z-30" : "hover:ring-1 hover:ring-white/40 z-10"
                } ${!ent.active ? "opacity-40" : ""}`}
                hidden={tr?.visible === false}
                style={{
                  left: `${x * zoom}px`,
                  top: `${y * zoom}px`,
                  transform: `translate(-50%, -50%) rotate(${tr?.rotation || 0}deg) scale(${tr?.scaleX || 1},${tr?.scaleY || 1})`,
                  zIndex: tr?.zIndex || 0,
                }}
              >
                {/* Visual Representation */}
                {sprite && sprite.type === "SPRITE" ? (
                  <div
                    className="flex flex-col items-center justify-center rounded border border-[var(--vly-border-success)] bg-[var(--vly-success)]/30 p-2 text-center"
                    style={{ width: `${sprite.width}px`, height: `${sprite.height}px` }}
                  >
                    <Box size={20} className="mb-1 text-[var(--vly-success)]" />
                    <span className="line-clamp-1 text-[10px] font-bold text-[var(--vly-text-primary)]">{ent.name}</span>
                  </div>
                ) : textComp && textComp.type === "TEXT" ? (
                  <div
                    className="whitespace-nowrap rounded border border-[var(--vly-border-subtle)] bg-[var(--vly-world)]/50 px-3 py-1 text-center font-semibold"
                    style={{ color: textComp.color, fontSize: `${textComp.fontSize}px` }}
                  >
                    {textComp.text}
                  </div>
                ) : uiComp && uiComp.type === "UI" ? (
                  <button className="vly-interactive rounded-lg border border-[var(--vly-border-accent)] bg-[var(--vly-accent)] px-4 py-2 text-xs font-semibold text-[var(--vly-text-on-accent)] shadow-md transition hover:opacity-90">
                    {uiComp.text || ent.name}
                  </button>
                ) : (
                  <div className="flex items-center gap-2 rounded-lg border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-raised)] p-3">
                    <Box size={16} className="text-[var(--vly-text-muted)]" />
                    <span className="text-xs font-medium text-[var(--vly-text-primary)]">{ent.name}</span>
                  </div>
                )}

                {/* Entity Label Pin */}
                {isSelected && (
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-[var(--vly-success)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--vly-text-on-accent)] shadow">
                    {ent.name}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Viewport Footer */}
        <div className="relative z-10 flex items-center justify-between border-t border-[var(--vly-border-subtle)] bg-[var(--vly-world)]/40 p-2 text-[11px] text-[var(--vly-text-muted)] backdrop-blur-sm">
          <span className="flex items-center gap-1">
            <MousePointer size={12} className="text-[var(--vly-text-muted)]" /> Clique em uma entidade para inspecionar componentes e propriedades
          </span>
          <span className="font-mono">Fixed Timestep: 60Hz</span>
        </div>
      </div>
    </div>
  );
};
