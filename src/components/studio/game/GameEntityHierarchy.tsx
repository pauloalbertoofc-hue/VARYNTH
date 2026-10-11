"use client";

import React from "react";
import { GameScene, GameEntity } from "@/lib/studio/game/types";
import { Layers, Plus, Trash2, Eye, EyeOff, Box, Copy, Pencil } from "lucide-react";
import { StatePanel } from "@/components/ui/StatePanel";

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
  onDuplicateEntity: (entityId: string) => void;
  onRenameScene: (sceneId: string, name: string) => void;
  onDuplicateScene: (sceneId: string) => void;
  onDeleteScene: (sceneId: string) => void;
  entrySceneId: string;
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
  onDuplicateEntity,
  onRenameScene,
  onDuplicateScene,
  onDeleteScene,
  entrySceneId,
}) => {
  const currentScene = scenes.find((s) => s.id === activeSceneId) || scenes[0];
  const sceneEntities = entities.filter((e) => e.sceneId === currentScene?.id);

  return (
    <div className="flex h-full select-none flex-col bg-[var(--vly-surface)] text-xs text-[var(--vly-text-primary)]">
      {/* Scenes Header */}
      <div className="flex items-center justify-between border-b border-[var(--vly-border-default)] bg-[var(--vly-surface-raised)] p-3">
        <div className="flex items-center gap-2 font-bold text-[var(--vly-text-primary)] uppercase text-[11px] tracking-wider">
          <Layers size={14} className="text-[var(--vly-success)]" />
          Cenas do Jogo ({scenes.length})
        </div>
        <button
          onClick={onAddScene}
          className="vly-interactive p-1 hover:bg-[var(--vly-surface-hover)] rounded text-[var(--vly-success)] hover:opacity-90 transition"
          title="Adicionar Nova Cena"
        >
          <Plus size={15} />
        </button>
      </div>

      {/* Scenes List */}
      <div className="max-h-36 space-y-1 overflow-y-auto border-b border-[var(--vly-border-default)] p-2">
        {scenes.map((sc) => {
          const isSelected = sc.id === currentScene?.id;
          return (
            <div
              key={sc.id}
              onClick={() => onSelectScene(sc.id)}
              onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelectScene(sc.id); } }}
              role="button"
              tabIndex={0}
              aria-current={isSelected ? "page" : undefined}
              className={`p-2 rounded-lg cursor-pointer flex items-center justify-between transition ${
                isSelected ? "bg-[var(--vly-success)]/20 text-[var(--vly-text-primary)] border border-[var(--vly-border-success)]" : "hover:bg-[var(--vly-surface-hover)] text-[var(--vly-text-secondary)]"
              }`}
            >
              <span className="font-semibold line-clamp-1">{sc.name}{sc.id === entrySceneId ? " • Startup" : ""}</span>
              <div className="flex items-center gap-1 text-[10px] opacity-70 font-mono"><span>{entities.filter((e) => e.sceneId === sc.id).length} ents</span><button onClick={(e) => { e.stopPropagation(); const name = prompt("Nome da cena", sc.name); if (name?.trim()) onRenameScene(sc.id, name.trim()); }} title="Renomear cena"><Pencil size={11}/></button><button onClick={(e) => { e.stopPropagation(); onDuplicateScene(sc.id); }} title="Duplicar cena"><Copy size={11}/></button>{sc.id !== entrySceneId && <button onClick={(e) => { e.stopPropagation(); if (confirm(`Excluir cena '${sc.name}' e suas entidades?`)) onDeleteScene(sc.id); }} title="Excluir cena" className="hover:text-rose-400"><Trash2 size={11}/></button>}</div>
            </div>
          );
        })}
      </div>

      {/* Entity Tree Header */}
      <div className="flex items-center justify-between border-b border-[var(--vly-border-default)] bg-[var(--vly-surface-raised)] p-3">
        <div className="flex items-center gap-2 font-bold text-[var(--vly-text-primary)] uppercase text-[11px] tracking-wider">
          <Box size={14} className="text-[var(--vly-success)]" />
          Hierarquia de Entidades
        </div>
        {currentScene && (
          <button
            onClick={() => onAddEntity(currentScene.id)}
            className="vly-interactive p-1 hover:bg-[var(--vly-surface-hover)] rounded text-[var(--vly-success)] hover:opacity-90 transition flex items-center gap-1 text-[11px]"
            title="Adicionar Entidade na Cena"
          >
            <Plus size={14} /> Nova Entidade
          </button>
        )}
      </div>

      {/* Entities List */}
      <div className="flex-1 space-y-1 overflow-y-auto p-2">
        {sceneEntities.length === 0 ? (
          <StatePanel tone="empty" title="Cena sem entidades" description="Clique em Nova Entidade para adicionar o primeiro objeto." action={currentScene ? <button type="button" onClick={() => onAddEntity(currentScene.id)} className="vly-interactive rounded border border-[var(--vly-border-accent)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--vly-accent)]">Nova entidade</button> : undefined} />
        ) : (
          sceneEntities.map((ent) => {
            const isSelected = ent.id === selectedEntityId;
            return (
              <div
                key={ent.id}
                onClick={() => onSelectEntity(ent.id)}
                onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelectEntity(ent.id); } }}
                role="button"
                tabIndex={0}
                aria-current={isSelected ? "page" : undefined}
                className={`p-2 rounded-lg cursor-pointer flex items-center justify-between transition group ${
                  isSelected ? "border border-[var(--vly-border-accent)] bg-[var(--vly-surface-active)] font-medium text-[var(--vly-text-primary)]" : "text-[var(--vly-text-secondary)] hover:bg-[var(--vly-surface-hover)]"
                } ${!ent.active ? "opacity-40" : ""}`}
              >
                <div className="flex items-center gap-2">
                  <Box size={13} className={isSelected ? "text-[var(--vly-success)]" : "text-[var(--vly-text-muted)]"} />
                  <span className="line-clamp-1">{ent.name}</span>
                </div>
                <div className="flex items-center gap-1 opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicateEntity(ent.id);
                    }}
                    className="p-1 hover:bg-[#232438] rounded text-slate-400 hover:text-emerald-300"
                    title="Duplicar Entidade"
                  >
                    <Copy size={12} />
                  </button>
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
