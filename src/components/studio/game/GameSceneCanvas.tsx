"use client";

import React from "react";
import { GameDocumentState, GameEntity, GameScene } from "@/lib/studio/game/types";
import { Box, Layers, MousePointer } from "lucide-react";

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
  const scene = activeScene || documentState.scenes.find((s) => s.id === documentState.entrySceneId);
  const sceneEntities = documentState.entities.filter((e) => e.sceneId === scene?.id);

  return (
    <div className="relative w-full h-full bg-[#090a12] overflow-hidden flex items-center justify-center p-6 select-none">
      {/* 2D Canvas Container (800x600 virtual viewport) */}
      <div
        className="relative w-[800px] h-[600px] rounded-xl border border-[#232742] shadow-2xl overflow-hidden flex flex-col justify-between"
        style={{ backgroundColor: scene?.backgroundColor || "#0f172a" }}
      >
        {/* Viewport Grid Overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-15"
          style={{
            backgroundImage:
              "linear-gradient(to right, #475569 1px, transparent 1px), linear-gradient(to bottom, #475569 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        {/* Scene Info Header */}
        <div className="relative z-10 p-3 bg-black/40 backdrop-blur-sm border-b border-white/10 flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <Layers size={14} className="text-emerald-400" />
            <span className="font-semibold text-white">{scene?.name || "Cena"}</span>
            <span className="text-[10px] text-slate-400">({sceneEntities.length} entidades)</span>
          </div>
          <div className="flex items-center gap-3 font-mono text-[11px] text-slate-400">
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
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectEntity(ent.id);
                }}
                className={`absolute cursor-pointer transition-all ${
                  isSelected ? "ring-2 ring-emerald-400 ring-offset-2 ring-offset-black z-30" : "hover:ring-1 hover:ring-white/40 z-10"
                } ${!ent.active ? "opacity-40" : ""}`}
                style={{
                  left: `${x}px`,
                  top: `${y}px`,
                  transform: "translate(-50%, -50%)",
                }}
              >
                {/* Visual Representation */}
                {sprite && sprite.type === "SPRITE" ? (
                  <div
                    className="bg-emerald-600/30 border border-emerald-500/50 rounded flex flex-col items-center justify-center p-2 text-center"
                    style={{ width: `${sprite.width}px`, height: `${sprite.height}px` }}
                  >
                    <Box size={20} className="text-emerald-400 mb-1" />
                    <span className="text-[10px] font-bold text-white line-clamp-1">{ent.name}</span>
                  </div>
                ) : textComp && textComp.type === "TEXT" ? (
                  <div
                    className="font-semibold text-center whitespace-nowrap px-3 py-1 bg-black/50 rounded border border-white/10"
                    style={{ color: textComp.color, fontSize: `${textComp.fontSize}px` }}
                  >
                    {textComp.text}
                  </div>
                ) : uiComp && uiComp.type === "UI" ? (
                  <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md border border-indigo-400/30">
                    {uiComp.text || ent.name}
                  </button>
                ) : (
                  <div className="p-3 bg-[#1e293b] border border-slate-600 rounded-lg flex items-center gap-2">
                    <Box size={16} className="text-slate-400" />
                    <span className="text-xs font-medium text-white">{ent.name}</span>
                  </div>
                )}

                {/* Entity Label Pin */}
                {isSelected && (
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-emerald-500 text-slate-950 font-bold text-[9px] uppercase tracking-wider rounded whitespace-nowrap shadow">
                    {ent.name}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Viewport Footer */}
        <div className="relative z-10 p-2 bg-black/40 backdrop-blur-sm border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <MousePointer size={12} className="text-slate-400" /> Clique em uma entidade para inspecionar componentes e propriedades
          </span>
          <span className="font-mono">Fixed Timestep: 60Hz</span>
        </div>
      </div>
    </div>
  );
};
