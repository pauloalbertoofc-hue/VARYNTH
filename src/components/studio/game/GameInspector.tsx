"use client";

import React from "react";
import { GameEntity, GameComponent, ComponentType } from "@/lib/studio/game/types";
import { gameComponentRegistry } from "@/lib/studio/game/component-registry";
import { Box, Plus, Trash2, Sliders, Tag } from "lucide-react";
import { StatePanel } from "@/components/ui/StatePanel";

interface GameInspectorProps {
  selectedEntity?: GameEntity;
  entities: GameEntity[];
  onUpdateEntity: (entityId: string, updates: Partial<GameEntity>) => void;
  onAddComponent: (entityId: string, component: GameComponent) => void;
  onRemoveComponent: (entityId: string, componentType: ComponentType) => void;
}

export const GameInspector: React.FC<GameInspectorProps> = ({
  selectedEntity,
  entities,
  onUpdateEntity,
  onAddComponent,
  onRemoveComponent,
}) => {
  if (!selectedEntity) {
    return (
      <div className="h-full flex items-center justify-center p-4 bg-[var(--vly-world)] text-xs">
        <StatePanel
          tone="empty"
          className="w-full border-0 bg-transparent"
          title="Nenhuma entidade selecionada"
          description="Selecione uma entidade na cena ou hierarquia para editar seus componentes."
        />
      </div>
    );
  }

  const descendantIds = new Set<string>();
  const collectDescendants = (parentId: string) => entities.filter((entity) => entity.parentEntityId === parentId).forEach((child) => { descendantIds.add(child.id); collectDescendants(child.id); });
  collectDescendants(selectedEntity.id);
  const parentCandidates = entities.filter((entity) => entity.id !== selectedEntity.id && !descendantIds.has(entity.id));

  const transform = selectedEntity.components.find((c) => c.type === "TRANSFORM");
  const sprite = selectedEntity.components.find((c) => c.type === "SPRITE");
  const textComp = selectedEntity.components.find((c) => c.type === "TEXT");
  const uiComp = selectedEntity.components.find((c) => c.type === "UI");
  const collider = selectedEntity.components.find((c) => c.type === "COLLIDER");
  const rigidBody = selectedEntity.components.find((c) => c.type === "RIGID_BODY");
  const animator = selectedEntity.components.find((c) => c.type === "ANIMATOR");
  const camera = selectedEntity.components.find((c) => c.type === "CAMERA");
  const health = selectedEntity.components.find((c) => c.type === "HEALTH");
  const behavior = selectedEntity.components.find((c) => c.type === "BEHAVIOR");

  return (
    <div className="h-full flex flex-col bg-[var(--vly-world)] text-[var(--vly-text-secondary)] text-xs overflow-y-auto select-none">
      {/* Header / Identity */}
      <div className="p-3 bg-[var(--vly-surface)] border-b border-[var(--vly-border-default)] space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-bold text-[var(--vly-text-primary)] uppercase text-[11px] tracking-wider flex items-center gap-1.5">
            <Sliders size={13} className="text-[var(--vly-success)]" /> Inspetor de Entidade
          </span>
          <label className="flex items-center gap-1.5 text-[11px] cursor-pointer">
            <input
              type="checkbox"
              checked={selectedEntity.active}
              onChange={(e) => onUpdateEntity(selectedEntity.id, { active: e.target.checked })}
              className="rounded accent-[var(--vly-success)]"
            />
            <span>Ativa</span>
          </label>
        </div>

        <div>
          <label className="text-[10px] uppercase text-[var(--vly-text-muted)] font-semibold block mb-1">Nome da Entidade</label>
          <input
            type="text"
            value={selectedEntity.name}
            onChange={(e) => onUpdateEntity(selectedEntity.id, { name: e.target.value })}
            className="vly-field w-full px-2.5 py-1.5 rounded-lg font-medium"
          />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap pt-1">
          <Tag size={11} className="text-[var(--vly-text-muted)]" />
          {selectedEntity.tags.map((tag, idx) => (
            <span key={idx} className="px-2 py-0.5 bg-[var(--vly-surface-raised)] text-[var(--vly-text-secondary)] rounded text-[10px] border border-[var(--vly-border-subtle)]">
              {tag}
            </span>
          ))}
        </div>
        <label className="text-[10px] uppercase text-[var(--vly-text-muted)] font-semibold block">Pai na hierarquia
          <select value={selectedEntity.parentEntityId || ""} onChange={(event) => onUpdateEntity(selectedEntity.id, { parentEntityId: event.target.value || undefined })} className="vly-field mt-1 w-full px-2 py-1.5 text-xs normal-case font-normal">
            <option value="">Sem pai</option>{parentCandidates.map((entity) => <option key={entity.id} value={entity.id}>{entity.name}</option>)}
          </select>
        </label>
      </div>

      {/* Components Container */}
      <div className="p-3 space-y-3 flex-1 overflow-y-auto">
        {/* TRANSFORM */}
        {transform && transform.type === "TRANSFORM" && (
          <div className="p-3 bg-[#111222] border border-[#1f2038] rounded-xl space-y-2.5">
            <div className="flex items-center justify-between text-white font-bold text-[11px]">
              <span>Transform 2D</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-500 block mb-0.5">Posição X (px)</label>
                <input
                  type="number"
                  value={transform.x}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    const comps = selectedEntity.components.map((c) =>
                      c.type === "TRANSFORM" ? { ...c, x: val } : c
                    );
                    onUpdateEntity(selectedEntity.id, { components: comps });
                  }}
                  className="w-full px-2 py-1 bg-[#18192c] border border-[#272844] rounded text-white font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 block mb-0.5">Posição Y (px)</label>
                <input
                  type="number"
                  value={transform.y}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    const comps = selectedEntity.components.map((c) =>
                      c.type === "TRANSFORM" ? { ...c, y: val } : c
                    );
                    onUpdateEntity(selectedEntity.id, { components: comps });
                  }}
                  className="w-full px-2 py-1 bg-[#18192c] border border-[#272844] rounded text-white font-mono"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[{ label: "Escala X", key: "scaleX" }, { label: "Escala Y", key: "scaleY" }, { label: "Rotação", key: "rotation" }, { label: "Z-index", key: "zIndex" }].map((field) => <label key={field.key} className="text-[10px] text-slate-500">{field.label}<input type="number" step={field.key.startsWith("scale") ? "0.1" : "1"} value={(transform as any)[field.key]} onChange={(event) => onUpdateEntity(selectedEntity.id, { components: selectedEntity.components.map((component) => component.type === "TRANSFORM" ? { ...component, [field.key]: Number(event.target.value) || 0 } : component) })} className="mt-0.5 w-full px-2 py-1 bg-[#18192c] border border-[#272844] rounded text-white font-mono"/></label>)}
            </div>
            <label className="flex gap-2 items-center text-[11px]"><input type="checkbox" checked={transform.visible !== false} onChange={(event) => onUpdateEntity(selectedEntity.id, { components: selectedEntity.components.map((component) => component.type === "TRANSFORM" ? { ...component, visible: event.target.checked } : component) })} /> Visível</label>
          </div>
        )}

        {/* SPRITE */}
        {sprite && sprite.type === "SPRITE" && (
          <div className="p-3 bg-[#111222] border border-[#1f2038] rounded-xl space-y-2.5">
            <div className="flex items-center justify-between text-white font-bold text-[11px]">
              <span>Sprite Visual</span>
              <button
                onClick={() => onRemoveComponent(selectedEntity.id, "SPRITE")}
                className="text-rose-400 hover:text-rose-300 p-0.5"
                title="Remover Componente"
              >
                <Trash2 size={12} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-500 block mb-0.5">Largura (px)</label>
                <input
                  type="number"
                  value={sprite.width}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 32;
                    const comps = selectedEntity.components.map((c) =>
                      c.type === "SPRITE" ? { ...c, width: val } : c
                    );
                    onUpdateEntity(selectedEntity.id, { components: comps });
                  }}
                  className="w-full px-2 py-1 bg-[#18192c] border border-[#272844] rounded text-white font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 block mb-0.5">Altura (px)</label>
                <input
                  type="number"
                  value={sprite.height}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 32;
                    const comps = selectedEntity.components.map((c) =>
                      c.type === "SPRITE" ? { ...c, height: val } : c
                    );
                    onUpdateEntity(selectedEntity.id, { components: comps });
                  }}
                  className="w-full px-2 py-1 bg-[#18192c] border border-[#272844] rounded text-white font-mono"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-slate-500 block mb-0.5">Asset ID</label>
              <input value={sprite.assetId} onChange={(e) => onUpdateEntity(selectedEntity.id, { components: selectedEntity.components.map((c) => c.type === "SPRITE" ? { ...c, assetId: e.target.value } : c) })} className="w-full px-2 py-1 bg-[#18192c] border border-[#272844] rounded text-white font-mono text-[11px]" placeholder="ID do asset anexado" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[10px] text-slate-500">Cor de fallback<input type="color" value={sprite.tint || "#38bdf8"} onChange={(event) => onUpdateEntity(selectedEntity.id, { components: selectedEntity.components.map((component) => component.type === "SPRITE" ? { ...component, tint: event.target.value } : component) })} className="mt-0.5 h-8 w-full bg-[#18192c] border border-[#272844] rounded" /></label>
              <label className="text-[10px] text-slate-500">Opacidade<input type="number" min="0" max="1" step="0.05" value={sprite.opacity ?? 1} onChange={(event) => onUpdateEntity(selectedEntity.id, { components: selectedEntity.components.map((component) => component.type === "SPRITE" ? { ...component, opacity: Math.max(0, Math.min(1, Number(event.target.value) || 0)) } : component) })} className="mt-0.5 w-full px-2 py-1 bg-[#18192c] border border-[#272844] rounded text-white" /></label>
            </div>
          </div>
        )}

        {selectedEntity.components.filter((component) => component.type === "AUDIO_SOURCE").map((audio) => audio.type === "AUDIO_SOURCE" && (
          <div key="audio-source" className="p-3 bg-[#111222] border border-[#1f2038] rounded-xl space-y-2">
            <div className="flex justify-between text-white font-bold text-[11px]"><span>Audio Source</span><button onClick={() => onRemoveComponent(selectedEntity.id, "AUDIO_SOURCE")} className="text-rose-400"><Trash2 size={12}/></button></div>
            <label className="text-[10px] text-slate-500 block">Asset ID<input value={audio.assetId} onChange={(e) => onUpdateEntity(selectedEntity.id, { components: selectedEntity.components.map((c) => c.type === "AUDIO_SOURCE" ? { ...c, assetId: e.target.value } : c) })} className="mt-1 w-full px-2 py-1 bg-[#18192c] border border-[#272844] rounded text-white font-mono text-[11px]" placeholder="ID do áudio anexado" /></label>
            <label className="text-[10px] text-slate-500 block">Volume<input type="number" min="0" max="1" step="0.05" value={audio.volume} onChange={(e) => onUpdateEntity(selectedEntity.id, { components: selectedEntity.components.map((c) => c.type === "AUDIO_SOURCE" ? { ...c, volume: Math.max(0, Math.min(1, Number(e.target.value) || 0)) } : c) })} className="mt-1 w-full px-2 py-1 bg-[#18192c] border border-[#272844] rounded text-white" /></label>
            <div className="flex gap-4"><label className="flex gap-2 items-center"><input type="checkbox" checked={audio.loop} onChange={(e) => onUpdateEntity(selectedEntity.id, { components: selectedEntity.components.map((c) => c.type === "AUDIO_SOURCE" ? { ...c, loop: e.target.checked } : c) })} /> Loop</label><label className="flex gap-2 items-center"><input type="checkbox" checked={audio.playOnStart || false} onChange={(e) => onUpdateEntity(selectedEntity.id, { components: selectedEntity.components.map((c) => c.type === "AUDIO_SOURCE" ? { ...c, playOnStart: e.target.checked } : c) })} /> Tocar ao iniciar</label></div>
          </div>
        ))}

        {/* TEXT */}
        {textComp && textComp.type === "TEXT" && (
          <div className="p-3 bg-[#111222] border border-[#1f2038] rounded-xl space-y-2.5">
            <div className="flex items-center justify-between text-white font-bold text-[11px]">
              <span>Texto / Label</span>
              <button
                onClick={() => onRemoveComponent(selectedEntity.id, "TEXT")}
                className="text-rose-400 hover:text-rose-300 p-0.5"
                title="Remover Componente"
              >
                <Trash2 size={12} />
              </button>
            </div>
            <div>
              <label className="text-[10px] text-slate-500 block mb-0.5">Conteúdo do Texto</label>
              <textarea
                value={textComp.text}
                onChange={(e) => {
                  const comps = selectedEntity.components.map((c) =>
                    c.type === "TEXT" ? { ...c, text: e.target.value } : c
                  );
                  onUpdateEntity(selectedEntity.id, { components: comps });
                }}
                rows={2}
                className="w-full px-2.5 py-1.5 bg-[#18192c] border border-[#272844] rounded text-white focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[10px] text-slate-500">Tamanho (px)<input type="number" min="1" value={textComp.fontSize} onChange={(event) => onUpdateEntity(selectedEntity.id, { components: selectedEntity.components.map((component) => component.type === "TEXT" ? { ...component, fontSize: Math.max(1, Number(event.target.value) || 1) } : component) })} className="mt-0.5 w-full px-2 py-1 bg-[#18192c] border border-[#272844] rounded text-white" /></label>
              <label className="text-[10px] text-slate-500">Cor<input type="color" value={textComp.color || "#ffffff"} onChange={(event) => onUpdateEntity(selectedEntity.id, { components: selectedEntity.components.map((component) => component.type === "TEXT" ? { ...component, color: event.target.value } : component) })} className="mt-0.5 h-8 w-full bg-[#18192c] border border-[#272844] rounded" /></label>
            </div>
          </div>
        )}

        {/* UI BUTTON */}
        {uiComp && uiComp.type === "UI" && (
          <div className="p-3 bg-[#111222] border border-[#1f2038] rounded-xl space-y-2.5">
            <div className="flex items-center justify-between text-white font-bold text-[11px]">
              <span>Elemento de UI ({uiComp.elementType})</span>
              <button
                onClick={() => onRemoveComponent(selectedEntity.id, "UI")}
                className="text-rose-400 hover:text-rose-300 p-0.5"
                title="Remover Componente"
              >
                <Trash2 size={12} />
              </button>
            </div>
            <div>
              <label className="text-[10px] text-slate-500 block mb-0.5">Texto / rótulo</label>
              <input
                type="text"
                value={uiComp.text || ""}
                onChange={(e) => {
                  const comps = selectedEntity.components.map((c) =>
                    c.type === "UI" ? { ...c, text: e.target.value } : c
                  );
                  onUpdateEntity(selectedEntity.id, { components: comps });
                }}
                className="w-full px-2 py-1 bg-[#18192c] border border-[#272844] rounded text-white"
              />
            </div>
            {uiComp.elementType === "PROGRESS_BAR" && (
              <div className="grid grid-cols-3 gap-2">
                <label className="col-span-3 text-[10px] text-slate-500">Variável vinculada
                  <input type="text" value={uiComp.variableId || ""} placeholder="var-health" onChange={(e) => onUpdateEntity(selectedEntity.id, { components: selectedEntity.components.map((component) => component.type === "UI" ? { ...component, variableId: e.target.value } : component) })} className="mt-0.5 w-full px-2 py-1 bg-[#18192c] border border-[#272844] rounded text-white" />
                </label>
                <label className="text-[10px] text-slate-500">Mínimo
                  <input type="number" value={uiComp.min ?? 0} onChange={(e) => onUpdateEntity(selectedEntity.id, { components: selectedEntity.components.map((component) => component.type === "UI" ? { ...component, min: Number(e.target.value) } : component) })} className="mt-0.5 w-full px-2 py-1 bg-[#18192c] border border-[#272844] rounded text-white" />
                </label>
                <label className="col-span-2 text-[10px] text-slate-500">Máximo
                  <input type="number" value={uiComp.max ?? 100} onChange={(e) => onUpdateEntity(selectedEntity.id, { components: selectedEntity.components.map((component) => component.type === "UI" ? { ...component, max: Number(e.target.value) } : component) })} className="mt-0.5 w-full px-2 py-1 bg-[#18192c] border border-[#272844] rounded text-white" />
                </label>
              </div>
            )}
          </div>
        )}

        {/* COLLIDER */}
        {collider && collider.type === "COLLIDER" && (
          <div className="p-3 bg-[#111222] border border-[#1f2038] rounded-xl space-y-2.5">
            <div className="flex items-center justify-between text-white font-bold text-[11px]">
              <span>Colisor 2D ({collider.shape})</span>
              <button
                onClick={() => onRemoveComponent(selectedEntity.id, "COLLIDER")}
                className="text-rose-400 hover:text-rose-300 p-0.5"
                title="Remover Componente"
              >
                <Trash2 size={12} />
              </button>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={collider.isTrigger || false}
                onChange={(e) => {
                  const comps = selectedEntity.components.map((c) =>
                    c.type === "COLLIDER" ? { ...c, isTrigger: e.target.checked } : c
                  );
                  onUpdateEntity(selectedEntity.id, { components: comps });
                }}
                className="rounded accent-emerald-500"
              />
              <span className="text-[11px]">Gatilho Sem Física Sólida (IsTrigger)</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[10px] text-slate-500">Largura (px)<input type="number" min="1" value={collider.width} onChange={(event) => onUpdateEntity(selectedEntity.id, { components: selectedEntity.components.map((component) => component.type === "COLLIDER" ? { ...component, width: Math.max(1, Number(event.target.value) || 1) } : component) })} className="mt-0.5 w-full px-2 py-1 bg-[#18192c] border border-[#272844] rounded text-white" /></label>
              <label className="text-[10px] text-slate-500">Altura (px)<input type="number" min="1" value={collider.height} onChange={(event) => onUpdateEntity(selectedEntity.id, { components: selectedEntity.components.map((component) => component.type === "COLLIDER" ? { ...component, height: Math.max(1, Number(event.target.value) || 1) } : component) })} className="mt-0.5 w-full px-2 py-1 bg-[#18192c] border border-[#272844] rounded text-white" /></label>
              <label className="text-[10px] text-slate-500">Camada<input type="number" min="1" value={collider.collisionLayer ?? 1} onChange={(event) => onUpdateEntity(selectedEntity.id, { components: selectedEntity.components.map((component) => component.type === "COLLIDER" ? { ...component, collisionLayer: Math.max(1, Number(event.target.value) || 1) } : component) })} className="mt-0.5 w-full px-2 py-1 bg-[#18192c] border border-[#272844] rounded text-white" /></label>
              <label className="text-[10px] text-slate-500">Máscara<input type="number" value={collider.collisionMask ?? -1} onChange={(event) => onUpdateEntity(selectedEntity.id, { components: selectedEntity.components.map((component) => component.type === "COLLIDER" ? { ...component, collisionMask: Number(event.target.value) || 0 } : component) })} className="mt-0.5 w-full px-2 py-1 bg-[#18192c] border border-[#272844] rounded text-white" /></label>
            </div>
          </div>
        )}

        {rigidBody && rigidBody.type === "RIGID_BODY" && <div className="p-3 bg-[#111222] border border-[#1f2038] rounded-xl space-y-2"><div className="flex justify-between text-white font-bold text-[11px]"><span>RigidBody 2D</span><button onClick={() => onRemoveComponent(selectedEntity.id, "RIGID_BODY")} className="text-rose-400"><Trash2 size={12}/></button></div><select value={rigidBody.mode} onChange={e => onUpdateEntity(selectedEntity.id, { components: selectedEntity.components.map(c => c.type === "RIGID_BODY" ? { ...c, mode: e.target.value as any } : c) })} className="w-full px-2 py-1 bg-[#18192c] border border-[#272844] rounded text-white"><option value="STATIC">Static</option><option value="DYNAMIC">Dynamic</option><option value="KINEMATIC">Kinematic</option></select><div className="grid grid-cols-2 gap-2"><label className="text-[10px] text-slate-500">Massa<input type="number" min="0.01" step="0.1" value={rigidBody.mass} onChange={e => onUpdateEntity(selectedEntity.id, { components: selectedEntity.components.map(c => c.type === "RIGID_BODY" ? { ...c, mass: Number(e.target.value) || 1 } : c) })} className="w-full px-2 py-1 bg-[#18192c] rounded text-white"/></label><label className="text-[10px] text-slate-500">Gravidade<input type="number" step="0.1" value={rigidBody.gravityScale} onChange={e => onUpdateEntity(selectedEntity.id, { components: selectedEntity.components.map(c => c.type === "RIGID_BODY" ? { ...c, gravityScale: Number(e.target.value) || 0 } : c) })} className="w-full px-2 py-1 bg-[#18192c] rounded text-white"/></label></div></div>}
        {animator && animator.type === "ANIMATOR" && <div className="p-3 bg-[#111222] border border-[#1f2038] rounded-xl space-y-2"><div className="flex justify-between text-white font-bold text-[11px]"><span>Animator ({animator.clips.length} clips)</span><button onClick={() => onRemoveComponent(selectedEntity.id, "ANIMATOR")} className="text-rose-400"><Trash2 size={12}/></button></div><label className="flex gap-2 items-center"><input type="checkbox" checked={animator.playing} onChange={e => onUpdateEntity(selectedEntity.id, { components: selectedEntity.components.map(c => c.type === "ANIMATOR" ? { ...c, playing: e.target.checked } : c) })}/> Reproduzir animação</label><p className="text-[10px] text-slate-500">Clips são serializáveis e podem ser vinculados a spritesheets.</p></div>}
        {camera && camera.type === "CAMERA" && <div className="p-3 bg-[#111222] border border-[#1f2038] rounded-xl space-y-2"><div className="flex justify-between text-white font-bold text-[11px]"><span>Camera 2D</span><button onClick={() => onRemoveComponent(selectedEntity.id, "CAMERA")} className="text-rose-400"><Trash2 size={12}/></button></div><label className="text-[10px] text-slate-500">Seguir entidade<select value={camera.followEntityId || ""} onChange={e => onUpdateEntity(selectedEntity.id, { components: selectedEntity.components.map(c => c.type === "CAMERA" ? { ...c, followEntityId: e.target.value || undefined } : c) })} className="mt-0.5 w-full px-2 py-1 bg-[#18192c] rounded text-white"><option value="">Esta entidade</option>{entities.filter(entity => entity.sceneId === selectedEntity.sceneId).map(entity => <option key={entity.id} value={entity.id}>{entity.name}</option>)}</select></label><div className="grid grid-cols-3 gap-2"><label className="text-[10px] text-slate-500">Zoom<input type="number" min="0.1" step="0.1" value={camera.zoom} onChange={e => onUpdateEntity(selectedEntity.id, { components: selectedEntity.components.map(c => c.type === "CAMERA" ? { ...c, zoom: Number(e.target.value) || 1 } : c) })} className="w-full px-2 py-1 bg-[#18192c] rounded text-white"/></label><label className="text-[10px] text-slate-500">Offset X<input type="number" value={camera.offsetX} onChange={e => onUpdateEntity(selectedEntity.id, { components: selectedEntity.components.map(c => c.type === "CAMERA" ? { ...c, offsetX: Number(e.target.value) || 0 } : c) })} className="w-full px-2 py-1 bg-[#18192c] rounded text-white"/></label><label className="text-[10px] text-slate-500">Offset Y<input type="number" value={camera.offsetY} onChange={e => onUpdateEntity(selectedEntity.id, { components: selectedEntity.components.map(c => c.type === "CAMERA" ? { ...c, offsetY: Number(e.target.value) || 0 } : c) })} className="w-full px-2 py-1 bg-[#18192c] rounded text-white"/></label></div><label className="text-[10px] text-slate-500">Suavização<input type="number" min="0" max="1" step="0.05" value={camera.smoothing} onChange={e => onUpdateEntity(selectedEntity.id, { components: selectedEntity.components.map(c => c.type === "CAMERA" ? { ...c, smoothing: Math.max(0, Math.min(1, Number(e.target.value) || 0)) } : c) })} className="w-full px-2 py-1 bg-[#18192c] rounded text-white"/></label></div>}
        {health && health.type === "HEALTH" && <div className="p-3 bg-[#111222] border border-[#1f2038] rounded-xl space-y-2"><div className="flex justify-between text-white font-bold text-[11px]"><span>Vida</span><button onClick={() => onRemoveComponent(selectedEntity.id, "HEALTH")} className="text-rose-400"><Trash2 size={12}/></button></div><label className="text-[10px] text-slate-500">Variável de vida<input value={health.variableId} onChange={e => onUpdateEntity(selectedEntity.id, { components: selectedEntity.components.map(c => c.type === "HEALTH" ? { ...c, variableId: e.target.value } : c) })} className="w-full px-2 py-1 bg-[#18192c] rounded text-white"/></label><label className="text-[10px] text-slate-500">Máximo<input type="number" min="1" value={health.max} onChange={e => onUpdateEntity(selectedEntity.id, { components: selectedEntity.components.map(c => c.type === "HEALTH" ? { ...c, max: Number(e.target.value) || 1 } : c) })} className="w-full px-2 py-1 bg-[#18192c] rounded text-white"/></label></div>}
        {behavior && behavior.type === "BEHAVIOR" && <div className="p-3 bg-[#111222] border border-[#1f2038] rounded-xl space-y-2"><div className="flex justify-between text-white font-bold text-[11px]"><span>Comportamento</span><button onClick={() => onRemoveComponent(selectedEntity.id, "BEHAVIOR")} className="text-rose-400"><Trash2 size={12}/></button></div><label className="text-[10px] text-slate-500">Identificador<input value={behavior.behaviorId} onChange={e => onUpdateEntity(selectedEntity.id, { components: selectedEntity.components.map(c => c.type === "BEHAVIOR" ? { ...c, behaviorId: e.target.value } : c) })} className="w-full px-2 py-1 bg-[#18192c] rounded text-white"/></label><label className="flex gap-2 items-center"><input type="checkbox" checked={behavior.enabled} onChange={e => onUpdateEntity(selectedEntity.id, { components: selectedEntity.components.map(c => c.type === "BEHAVIOR" ? { ...c, enabled: e.target.checked } : c) })}/> Ativo</label></div>}

        {/* Add Component Action */}
        <div className="pt-2">
          <select
            onChange={(e) => {
              const compType = e.target.value as ComponentType;
              const component = gameComponentRegistry.createDefault(compType);
              if (component && !selectedEntity.components.some(c => c.type === compType)) onAddComponent(selectedEntity.id, component);
              e.target.value = "";
            }}
            defaultValue=""
            className="w-full px-3 py-2 bg-[#181a30] hover:bg-[#1e213d] border border-emerald-500/30 rounded-xl text-emerald-300 font-semibold cursor-pointer text-xs transition focus:outline-none"
          >
            <option value="" disabled>+ Adicionar Componente</option>
            {gameComponentRegistry.all().filter(def => !selectedEntity.components.some(c => c.type === def.type)).map(def => <option key={def.type} value={def.type}>{def.label}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
};
