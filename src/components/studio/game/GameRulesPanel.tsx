"use client";

import React, { useState } from "react";
import { GameRule, GameVariable } from "@/lib/studio/game/types";
import { Cpu, Plus, Trash2, ToggleLeft, ToggleRight, Variable, Play, Sparkles } from "lucide-react";

interface GameRulesPanelProps {
  rules: GameRule[];
  variables: GameVariable[];
  onAddRule: () => void;
  onToggleRule: (ruleId: string) => void;
  onDeleteRule: (ruleId: string) => void;
  onAddVariable: (name: string, type: "BOOLEAN" | "NUMBER" | "STRING", initialValue: any) => void;
  onDeleteVariable: (varId: string) => void;
  onOpenAthena: () => void;
}

export const GameRulesPanel: React.FC<GameRulesPanelProps> = ({
  rules,
  variables,
  onAddRule,
  onToggleRule,
  onDeleteRule,
  onAddVariable,
  onDeleteVariable,
  onOpenAthena,
}) => {
  const [activeTab, setActiveTab] = useState<"RULES" | "VARIABLES">("RULES");
  const [newVarName, setNewVarName] = useState("");
  const [newVarType, setNewVarType] = useState<"BOOLEAN" | "NUMBER" | "STRING">("NUMBER");
  const [newVarVal, setNewVarVal] = useState("0");

  return (
    <div className="h-full flex flex-col bg-[#0b0c16] text-slate-300 text-xs select-none">
      {/* Header & Tabs */}
      <div className="p-3 bg-[#0e0f1c] border-b border-[#1c1d30] flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-white uppercase text-[11px] tracking-wider">
          <Cpu size={14} className="text-emerald-400" />
          Lógica Declarativa & Estado
        </div>
        <div className="flex items-center bg-[#151628] p-0.5 rounded-lg border border-white/5 text-[11px]">
          <button
            onClick={() => setActiveTab("RULES")}
            className={`px-3 py-1 rounded-md transition ${activeTab === "RULES" ? "bg-emerald-600 text-white font-bold" : "text-slate-400 hover:text-white"}`}
          >
            Regras ({rules.length})
          </button>
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
                      {r.actions.map((a) => `${a.type}${a.variableId ? ` (${a.variableId} = ${a.value})` : ""}${a.targetSceneId ? ` (-> ${a.targetSceneId})` : ""}`).join(", ")}
                    </span>
                  </div>
                </div>
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
    </div>
  );
};
