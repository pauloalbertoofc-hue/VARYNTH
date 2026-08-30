"use client";

import React from "react";
import { GameChangeSet } from "@/lib/studio/game/types";
import { Sparkles, Check, X, Layers, Box, Cpu, Variable, FileText } from "lucide-react";

interface GameChangeSetModalProps {
  isOpen: boolean;
  changeSets: GameChangeSet[];
  onAccept: (changeSetId: string) => void;
  onReject: (changeSetId: string) => void;
  onClose: () => void;
}

export const GameChangeSetModal: React.FC<GameChangeSetModalProps> = ({
  isOpen,
  changeSets,
  onAccept,
  onReject,
  onClose,
}) => {
  if (!isOpen || changeSets.length === 0) return null;

  const currentCS = changeSets[0];
  const plan = currentCS.plan;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6 select-none">
      <div className="w-full max-w-2xl bg-[#0e0f1d] border border-[#282a4a] rounded-2xl flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-[#121426] border-b border-[#20223c] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-amber-400" />
            <div>
              <h3 className="font-bold text-sm text-white">{currentCS.title}</h3>
              <span className="text-[11px] text-slate-400">{currentCS.summary}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg text-slate-400">
            <X size={18} />
          </button>
        </div>

        {/* Plan Body */}
        <div className="p-5 overflow-y-auto max-h-[65vh] space-y-4 text-xs text-slate-300">
          {plan && (
            <div className="p-4 bg-[#141528] rounded-xl border border-[#22243e] space-y-3">
              <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider flex items-center gap-1">
                <FileText size={12} /> Plano de Criação Audiovisual & Lógico (GDD Draft)
              </span>

              <div>
                <span className="text-[10px] uppercase text-slate-500 font-semibold block">Conceito do Jogo</span>
                <p className="text-slate-200 mt-0.5">{plan.concept}</p>
              </div>

              <div>
                <span className="text-[10px] uppercase text-slate-500 font-semibold block">Loop de Jogabilidade (Gameplay Loop)</span>
                <p className="text-slate-200 mt-0.5">{plan.gameplayLoop}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5">
                <div>
                  <span className="text-[10px] uppercase text-slate-500 font-semibold block mb-1 flex items-center gap-1">
                    <Layers size={11} className="text-emerald-400" /> Cenas Planejadas ({plan.scenes.length})
                  </span>
                  <ul className="space-y-1 text-[11px]">
                    {plan.scenes.map((s, idx) => (
                      <li key={idx} className="p-1.5 bg-[#0e0f1c] rounded border border-white/5">
                        <strong className="text-white">{s.name}:</strong> {s.description}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <span className="text-[10px] uppercase text-slate-500 font-semibold block mb-1 flex items-center gap-1">
                    <Variable size={11} className="text-blue-400" /> Variáveis de Estado ({plan.variables.length})
                  </span>
                  <ul className="space-y-1 text-[11px]">
                    {plan.variables.map((v, idx) => (
                      <li key={idx} className="p-1.5 bg-[#0e0f1c] rounded border border-white/5 font-mono">
                        <span className="text-emerald-300 font-bold">{v.name}</span>: {v.type} ({String(v.initialValue)})
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Operations List */}
          <div className="space-y-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Operações a serem aplicadas atomicamente ({currentCS.operations.length})
            </span>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {currentCS.operations.map((op, idx) => (
                <div
                  key={idx}
                  className="p-2 bg-[#121324] rounded-lg border border-white/5 font-mono text-[11px] flex items-center justify-between text-slate-300"
                >
                  <span className="text-emerald-400 font-bold">{op.type}</span>
                  <span className="text-slate-400 truncate max-w-xs">
                    {op.type === "CREATE_SCENE" ? op.scene.name : op.type === "CREATE_ENTITY" ? op.entity.name : op.type === "CREATE_RULE" ? op.rule.name : op.type === "CREATE_VARIABLE" ? op.variable.name : "..."}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="p-4 bg-[#121426] border-t border-[#20223c] flex items-center justify-between">
          <button
            onClick={() => onReject(currentCS.id)}
            className="px-4 py-2 hover:bg-rose-500/20 text-rose-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <X size={14} /> Rejeitar Proposta
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 hover:bg-white/10 rounded-xl text-slate-300 text-xs font-semibold"
            >
              Fechar
            </button>
            <button
              onClick={() => onAccept(currentCS.id)}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 transition"
            >
              <Check size={14} /> Aceitar & Aplicar Atomicamente
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

