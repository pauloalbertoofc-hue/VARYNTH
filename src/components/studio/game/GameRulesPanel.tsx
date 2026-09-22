"use client";

import React, { useState } from "react";
import { ActionType, GameEntity, GameRule, GameScene, GameVariable, InputActionMapping, TriggerType } from "@/lib/studio/game/types";
import type { AudioEventDefinition } from "@/lib/studio/audio/game-audio-domain";
import { Cpu, Plus, Trash2, ToggleLeft, ToggleRight, Variable, Play, Sparkles, Undo2, Redo2 } from "lucide-react";

interface GameRulesPanelProps {
  rules: GameRule[];
  variables: GameVariable[];
  inputActions: InputActionMapping[];
  entities: GameEntity[];
  scenes: GameScene[];
  audioEvents?: AudioEventDefinition[];
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  onAddRule: () => void;
  onToggleRule: (ruleId: string) => void;
  onDeleteRule: (ruleId: string) => void;
  onUpdateRule: (ruleId: string, updates: Partial<GameRule>) => void;
  onAddVariable: (name: string, type: "BOOLEAN" | "NUMBER" | "STRING", initialValue: any) => void;
  onDeleteVariable: (varId: string) => void;
  onOpenAthena: () => void;
  onAddInputAction: (action: string, keys: string[]) => void;
  onDeleteInputAction: (action: string) => void;
}

export const GameRulesPanel: React.FC<GameRulesPanelProps> = ({
  rules,
  variables,
  inputActions,
  entities,
  scenes,
  audioEvents = [],
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onAddRule,
  onToggleRule,
  onDeleteRule,
  onUpdateRule,
  onAddVariable,
  onDeleteVariable,
  onOpenAthena,
  onAddInputAction,
  onDeleteInputAction,
}) => {
  const [activeTab, setActiveTab] = useState<"RULES" | "VARIABLES" | "INPUTS">("RULES");
  const [newVarName, setNewVarName] = useState("");
  const [newVarType, setNewVarType] = useState<"BOOLEAN" | "NUMBER" | "STRING">("NUMBER");
  const [newVarVal, setNewVarVal] = useState("0");
  const [newInputAction, setNewInputAction] = useState("");
  const [newInputKeys, setNewInputKeys] = useState("");

  return (
    <div className="h-full flex flex-col bg-[#0b0c16] text-slate-300 text-xs select-none">
      {/* Header & Tabs */}
      <div className="p-3 bg-[#0e0f1c] border-b border-[#1c1d30] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 font-bold text-white uppercase text-[11px] tracking-wider">
            <Cpu size={14} className="text-emerald-400" />
            Lógica Declarativa & Estado
          </div>

          {/* Undo / Redo Buttons */}
          {(onUndo || onRedo) && (
            <div className="flex items-center bg-[#151628] p-0.5 rounded-lg border border-white/5">
              {onUndo && (
                <button
                  onClick={onUndo}
                  disabled={canUndo === false}
                  className="p-1 text-slate-400 hover:text-white disabled:opacity-40 rounded transition"
                  title="Desfazer (Ctrl+Z)"
                >
                  <Undo2 size={12} />
                </button>
              )}
              {onRedo && (
                <button
                  onClick={onRedo}
                  disabled={canRedo === false}
                  className="p-1 text-slate-400 hover:text-white disabled:opacity-40 rounded transition"
                  title="Refazer (Ctrl+Y)"
                >
                  <Redo2 size={12} />
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center bg-[#151628] p-0.5 rounded-lg border border-white/5 text-[11px]">
          <button
            onClick={() => setActiveTab("RULES")}
            className={`px-3 py-1 rounded-md transition ${activeTab === "RULES" ? "bg-emerald-600 text-white font-bold" : "text-slate-400 hover:text-white"}`}
          >
            Regras ({rules.length})
          </button>
          <button onClick={() => setActiveTab("INPUTS")} className={`px-3 py-1 rounded-md transition ${activeTab === "INPUTS" ? "bg-emerald-600 text-white font-bold" : "text-slate-400 hover:text-white"}`}>Inputs ({inputActions.length})</button>
          <button
            onClick={() => setActiveTab("VARIABLES")}
            className={`px-3 py-1 rounded-md transition ${activeTab === "VARIABLES" ? "bg-emerald-600 text-white font-bold" : "text-slate-400 hover:text-white"}`}
          >
            Variáveis ({variables.length})
          </button>
        </div>
      </div>

      {/* RULES VIEW */}
      {activeTab === "RULES" && (
        <div className="flex-1 p-3 overflow-y-auto space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase text-slate-500 font-semibold tracking-wider">Regras da Cena Ativa</span>
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenAthena}
                className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded text-[11px] font-semibold flex items-center gap-1 border border-amber-500/30 transition"
              >
                <Sparkles size={12} /> Pedir Regra à Athena
              </button>
              <button
                onClick={onAddRule}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-semibold flex items-center gap-1 transition"
              >
                <Plus size={13} /> Nova Regra
              </button>
            </div>
          </div>

          {rules.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs italic bg-[#0e0f1c] rounded-xl border border-dashed border-[#1f2038]">
              Nenhuma regra configurada. Crie regras declarativas para adicionar interatividade ao seu jogo.
            </div>
          ) : (
            rules.map((r) => (
              <div
                key={r.id}
                className={`p-3 bg-[#111222] border rounded-xl space-y-2 transition ${
                  r.enabled ? "border-[#242644]" : "border-slate-800 opacity-60"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onToggleRule(r.id)}
                      className={r.enabled ? "text-emerald-400" : "text-slate-600"}
                      title={r.enabled ? "Desativar regra" : "Ativar regra"}
                    >
                      {r.enabled ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                    </button>
                    <span className="font-bold text-white text-xs">{r.name}</span>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm(`Excluir regra '${r.name}'?`)) onDeleteRule(r.id);
                    }}
                    className="p-1 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 rounded transition"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                {/* Trigger -> Conditions -> Actions Breakdown */}
                <div className="p-2.5 bg-[#0b0c16] rounded-lg border border-[#1b1c2e] font-mono text-[11px] space-y-1.5 text-slate-300">
                  <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                    <span className="text-[9px] uppercase px-1.5 py-0.5 bg-emerald-500/10 rounded border border-emerald-500/20">QUANDO</span>
                    <span>{r.trigger.type} {r.trigger.entityId ? `[${r.trigger.entityId}]` : ""} {r.trigger.actionName ? `[${r.trigger.actionName}]` : ""}</span>
                  </div>

                  {r.conditions.length > 0 && (
                    <div className="flex items-center gap-2 text-amber-400">
                      <span className="text-[9px] uppercase px-1.5 py-0.5 bg-amber-500/10 rounded border border-amber-500/20">SE</span>
                      <span>
                        {r.conditions.map((c, i) => `${c.variableId} ${c.operator} ${c.value}`).join(" E ")}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-blue-400">
                    <span className="text-[9px] uppercase px-1.5 py-0.5 bg-blue-500/10 rounded border border-blue-500/20">ENTÃO</span>
                    <span>
                      {r.actions.map((a) => `${a.type}${a.variableId ? ` (${a.variableId} = ${a.value})` : ""}${a.targetSceneId ? ` (-> ${a.targetSceneId})` : ""}${a.audioEventId ? ` (${a.audioEventId})` : ""}`).join(", ")}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <label className="text-[10px] text-slate-500">Evento
                    <select value={r.trigger.type} onChange={(e) => onUpdateRule(r.id, { trigger: { ...r.trigger, type: e.target.value as TriggerType } })} className="mt-1 w-full px-2 py-1 bg-[#18192c] border border-[#272844] rounded text-slate-200">
                      {["ON_START", "ON_CLICK", "ON_ACTION", "ON_COLLISION", "ON_VARIABLE_CHANGED", "ON_TIMER", "ON_ENTITY_CREATED", "ON_ENTITY_DESTROYED"].map(type => <option key={type} value={type}>{type}</option>)}
                    </select>
                  </label>
                  <label className="text-[10px] text-slate-500">Ação
                    <select value={r.actions[0]?.type || "SHOW_TEXT"} onChange={(e) => onUpdateRule(r.id, { actions: [{ ...(r.actions[0] || {}), type: e.target.value as ActionType }] })} className="mt-1 w-full px-2 py-1 bg-[#18192c] border border-[#272844] rounded text-slate-200">
                      {["SHOW_TEXT", "SET_VARIABLE", "ADD_VARIABLE", "MOVE_ENTITY", "SET_POSITION", "APPLY_FORCE", "SHOW_ENTITY", "HIDE_ENTITY", "PLAY_AUDIO", "CHANGE_SCENE", "EMIT_EVENT", "CREATE_ENTITY", "DESTROY_ENTITY", "WAIT", "END_GAME"].map(type => <option key={type} value={type}>{type}</option>)}
                    </select>
                  </label>
                </div>
                {r.actions[0] && <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#1b1c2e]">
                  {(["SET_VARIABLE", "ADD_VARIABLE"].includes(r.actions[0].type)) && <label className="text-[10px] text-slate-500">Variável<select value={r.actions[0].variableId || ""} onChange={(e) => onUpdateRule(r.id, { actions: [{ ...r.actions[0], variableId: e.target.value }] })} className="mt-1 w-full px-2 py-1 bg-[#18192c] border border-[#272844] rounded text-slate-200"><option value="">Selecionar</option>{variables.map(variable => <option key={variable.id} value={variable.id}>{variable.name}</option>)}</select></label>}
                  {(["MOVE_ENTITY", "SET_POSITION", "APPLY_FORCE", "SHOW_ENTITY", "HIDE_ENTITY", "DESTROY_ENTITY"].includes(r.actions[0].type)) && <label className="text-[10px] text-slate-500">Entidade<select value={r.actions[0].entityId || ""} onChange={(e) => onUpdateRule(r.id, { actions: [{ ...r.actions[0], entityId: e.target.value }] })} className="mt-1 w-full px-2 py-1 bg-[#18192c] border border-[#272844] rounded text-slate-200"><option value="">Selecionar</option>{entities.map(entity => <option key={entity.id} value={entity.id}>{entity.name}</option>)}</select></label>}
                  {r.actions[0].type === "CHANGE_SCENE" && <label className="text-[10px] text-slate-500">Cena destino<select value={r.actions[0].targetSceneId || ""} onChange={(e) => onUpdateRule(r.id, { actions: [{ ...r.actions[0], targetSceneId: e.target.value }] })} className="mt-1 w-full px-2 py-1 bg-[#18192c] border border-[#272844] rounded text-slate-200"><option value="">Selecionar</option>{scenes.map(scene => <option key={scene.id} value={scene.id}>{scene.name}</option>)}</select></label>}
                  {r.actions[0].type === "PLAY_AUDIO" && (audioEvents.length ? <label className="text-[10px] text-slate-500">Evento de áudio<select aria-label={`Evento de áudio da regra ${r.name}`} value={r.actions[0].audioEventId || ""} onChange={(e) => onUpdateRule(r.id, { actions: [{ ...r.actions[0], audioEventId: e.target.value || undefined, assetId: undefined }] })} className="mt-1 w-full px-2 py-1 bg-[#18192c] border border-[#272844] rounded text-slate-200"><option value="">Selecionar evento</option>{audioEvents.map(event => <option key={event.id} value={event.id}>{event.name}</option>)}</select></label> : <label className="text-[10px] text-slate-500">Asset ID (legado)<input aria-label={`Asset de áudio da regra ${r.name}`} value={r.actions[0].assetId || ""} onChange={(e) => onUpdateRule(r.id, { actions: [{ ...r.actions[0], assetId: e.target.value || undefined, audioEventId: undefined }] })} className="mt-1 w-full px-2 py-1 bg-[#18192c] border border-[#272844] rounded text-slate-200" placeholder="Importe um pacote Game Audio ou informe ID" /></label>)}
                  {(["SET_VARIABLE", "ADD_VARIABLE"].includes(r.actions[0].type)) && <label className="text-[10px] text-slate-500">Valor<input value={String(r.actions[0].value ?? "")} onChange={(e) => { const raw = e.target.value; const value = raw === "true" ? true : raw === "false" ? false : Number.isFinite(Number(raw)) && raw !== "" ? Number(raw) : raw; onUpdateRule(r.id, { actions: [{ ...r.actions[0], value }] }); }} className="mt-1 w-full px-2 py-1 bg-[#18192c] border border-[#272844] rounded text-slate-200" /></label>}
                </div>}
              </div>
            ))
          )}
        </div>
      )}

      {/* VARIABLES VIEW */}
      {activeTab === "VARIABLES" && (
        <div className="flex-1 p-3 overflow-y-auto space-y-3">
          <div className="p-3 bg-[#111222] border border-[#20223c] rounded-xl space-y-2">
            <span className="text-[10px] uppercase text-emerald-400 font-bold tracking-wider flex items-center gap-1">
              <Plus size={12} /> Criar Nova Variável de Estado
            </span>
            <div className="grid grid-cols-3 gap-2">
              <input
                type="text"
                placeholder="Nome (ex: score)"
                value={newVarName}
                onChange={(e) => setNewVarName(e.target.value)}
                className="px-2 py-1 bg-[#18192c] border border-[#272844] rounded text-white text-xs"
              />
              <select
                value={newVarType}
                onChange={(e) => setNewVarType(e.target.value as any)}
                className="px-2 py-1 bg-[#18192c] border border-[#272844] rounded text-white text-xs"
              >
                <option value="NUMBER">NUMBER</option>
                <option value="BOOLEAN">BOOLEAN</option>
                <option value="STRING">STRING</option>
              </select>
              <input
                type="text"
                placeholder="Valor Inicial"
                value={newVarVal}
                onChange={(e) => setNewVarVal(e.target.value)}
                className="px-2 py-1 bg-[#18192c] border border-[#272844] rounded text-white text-xs"
              />
            </div>
            <button
              onClick={() => {
                if (!newVarName.trim()) return;
                const parsedVal =
                  newVarType === "NUMBER"
                    ? parseFloat(newVarVal) || 0
                    : newVarType === "BOOLEAN"
                    ? newVarVal.toLowerCase() === "true"
                    : newVarVal;
                onAddVariable(newVarName.trim(), newVarType, parsedVal);
                setNewVarName("");
                setNewVarVal("0");
              }}
              className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold"
            >
              Adicionar Variável
            </button>
          </div>

          <div className="space-y-1.5">
            {variables.map((v) => (
              <div
                key={v.id}
                className="p-2.5 bg-[#111222] border border-[#1d1e34] rounded-lg flex items-center justify-between"
              >
                <div className="flex items-center gap-2 font-mono">
                  <Variable size={14} className="text-emerald-400" />
                  <span className="font-semibold text-white">{v.name}</span>
                  <span className="text-[10px] text-slate-500 uppercase">({v.type})</span>
                </div>
                <div className="flex items-center gap-3 font-mono text-xs">
                  <span className="text-emerald-300 font-bold">{String(v.initialValue)}</span>
                  <button
                    onClick={() => onDeleteVariable(v.id)}
                    className="text-slate-500 hover:text-rose-400 p-1"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "INPUTS" && <div className="flex-1 p-3 overflow-y-auto space-y-3">
        <div className="p-3 bg-[#111222] border border-[#20223c] rounded-xl space-y-2"><span className="text-[10px] uppercase text-emerald-400 font-bold">Nova ação de input</span><div className="grid grid-cols-2 gap-2"><input value={newInputAction} onChange={e => setNewInputAction(e.target.value)} placeholder="move_left" className="px-2 py-1 bg-[#18192c] border border-[#272844] rounded text-white"/><input value={newInputKeys} onChange={e => setNewInputKeys(e.target.value)} placeholder="KeyA, ArrowLeft" className="px-2 py-1 bg-[#18192c] border border-[#272844] rounded text-white"/></div><button onClick={() => { const action = newInputAction.trim(); const keys = newInputKeys.split(",").map(key => key.trim()).filter(Boolean); if (action && keys.length) { onAddInputAction(action, keys); setNewInputAction(""); setNewInputKeys(""); } }} className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-semibold">Adicionar mapeamento</button></div>
        {inputActions.map(mapping => <div key={mapping.action} className="p-2.5 bg-[#111222] border border-[#1d1e34] rounded-lg flex items-center justify-between"><div><span className="font-mono font-semibold text-white">{mapping.action}</span><span className="ml-3 text-slate-400 font-mono text-[11px]">{mapping.keys.join(" · ")}</span></div><button onClick={() => onDeleteInputAction(mapping.action)} className="text-slate-500 hover:text-rose-400"><Trash2 size={13}/></button></div>)}
      </div>}
    </div>
  );
};
