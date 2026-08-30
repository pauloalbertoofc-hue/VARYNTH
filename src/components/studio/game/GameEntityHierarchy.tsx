"use client";

import React from "react";
import { GameScene, GameEntity } from "@/lib/studio/game/types";
import { Layers, Plus, Trash2, Eye, EyeOff, Box } from "lucide-react";

interface GameEntityHierarchyProps {
  scenes: GameScene[];
  entities: GameEntity[];
  activeSceneId?: string;
  selectedEntityId?: string;
  onSelectScene: (sceneId: string) => void;
  onSelectEntity: (entityId: string) => void;
  onAddScene: () => void;
  onAddEntity: (sceneId: string) => void;
  onDeleteEntity: (entityId: string) => void;
  onToggleEntityActive: (entityId: string) => void;
}

export const GameEntityHierarchy: React.FC<GameEntityHierarchyProps> = ({
  scenes,
  entities,
  activeSceneId,
  selectedEntityId,
  onSelectScene,
  onSelectEntity,
  onAddScene,
  onAddEntity,
  onDeleteEntity,
  onToggleEntityActive,
}) => {
  const currentScene = scenes.find((s) => s.id === activeSceneId) || scenes[0];
  const sceneEntities = entities.filter((e) => e.sceneId === currentScene?.id);

  return (
    <div className="h-full flex flex-col bg-[#0b0c16] text-slate-300 text-xs select-none">
      {/* Scenes Header */}
      <div className="p-3 border-b border-[#1c1d30] flex items-center justify-between bg-[#0e0f1c]">
        <div className="flex items-center gap-2 font-bold text-white uppercase text-[11px] tracking-wider">
          <Layers size={14} className="text-emerald-400" />
          Cenas do Jogo ({scenes.length})
        </div>
        <button
          onClick={onAddScene}
          className="p-1 hover:bg-[#1a1b2e] rounded text-emerald-400 hover:text-emerald-300 transition"
          title="Adicionar Nova Cena"
        >
          <Plus size={15} />
        </button>
      </div>

      {/* Scenes List */}
      <div className="p-2 border-b border-[#1c1d30] max-h-36 overflow-y-auto space-y-1">
        {scenes.map((sc) => {
          const isSelected = sc.id === currentScene?.id;
          return (
            <div
              key={sc.id}
              onClick={() => onSelectScene(sc.id)}
              className={`p-2 rounded-lg cursor-pointer flex items-center justify-between transition ${
                isSelected ? "bg-emerald-500/20 text-white border border-emerald-500/30" : "hover:bg-[#151628] text-slate-400"
              }`}
            >
              <span className="font-semibold line-clamp-1">{sc.name}</span>
              <span className="text-[10px] opacity-60 font-mono">
                {entities.filter((e) => e.sceneId === sc.id).length} ents
              </span>
            </div>
          );
        })}
      </div>

      {/* Entity Tree Header */}
      <div className="p-3 border-b border-[#1c1d30] flex items-center justify-between bg-[#0e0f1c]">
        <div className="flex items-center gap-2 font-bold text-white uppercase text-[11px] tracking-wider">
          <Box size={14} className="text-emerald-400" />
          Hierarquia de Entidades
        </div>
        {currentScene && (
          <button
            onClick={() => onAddEntity(currentScene.id)}
            className="p-1 hover:bg-[#1a1b2e] rounded text-emerald-400 hover:text-emerald-300 transition flex items-center gap-1 text-[11px]"
            title="Adicionar Entidade na Cena"
          >
            <Plus size={14} /> Nova Entidade
          </button>
        )}
      </div>

      {/* Entities List */}
      <div className="flex-1 p-2 overflow-y-auto space-y-1">
        {sceneEntities.length === 0 ? (
          <div className="p-6 text-center text-slate-500 text-xs italic">
            Nenhuma entidade nesta cena. Clique em &quot;Nova Entidade&quot; para adicionar.
          </div>
        ) : (
          sceneEntities.map((ent) => {
            const isSelected = ent.id === selectedEntityId;
            return (
              <div
                key={ent.id}
                onClick={() => onSelectEntity(ent.id)}
                className={`p-2 rounded-lg cursor-pointer flex items-center justify-between transition group ${
                  isSelected ? "bg-emerald-500/20 text-white border border-emerald-500/30 font-medium" : "hover:bg-[#151628] text-slate-300"
                } ${!ent.active ? "opacity-40" : ""}`}
              >
                <div className="flex items-center gap-2">
                  <Box size={13} className={isSelected ? "text-emerald-400" : "text-slate-500"} />
                  <span className="line-clamp-1">{ent.name}</span>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleEntityActive(ent.id);
                    }}
                    className="p-1 hover:bg-[#232438] rounded text-slate-400 hover:text-white"
                    title={ent.active ? "Desativar" : "Ativar"}
                  >
                    {ent.active ? <Eye size={12} /> : <EyeOff size={12} />}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Excluir entidade '${ent.name}'?`)) {
                        onDeleteEntity(ent.id);
                      }
                    }}
                    className="p-1 hover:bg-rose-500/20 rounded text-slate-400 hover:text-rose-400"
                    title="Excluir Entidade"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

