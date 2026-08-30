"use client";

import React from "react";
import { GAME_TEMPLATES, GameTemplate } from "@/lib/studio/game/game-templates";
import { X, Gamepad2, ArrowRight } from "lucide-react";

interface GameTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (templateId: string, name: string) => void;
}

export const GameTemplatesModal: React.FC<GameTemplatesModalProps> = ({
  isOpen,
  onClose,
  onSelectTemplate,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6 select-none">
      <div className="w-full max-w-3xl bg-[#0e0f1d] border border-[#262846] rounded-2xl flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-[#121426] border-b border-[#20223c] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gamepad2 size={18} className="text-emerald-400" />
            <h3 className="font-bold text-sm text-white">Criar Novo Projeto de Jogo</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg text-slate-400">
            <X size={18} />
          </button>
        </div>

        {/* Templates Grid */}
        <div className="p-5 overflow-y-auto max-h-[70vh] grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {GAME_TEMPLATES.map((tmpl) => (
            <div
              key={tmpl.id}
              onClick={() => {
                onSelectTemplate(tmpl.id, tmpl.name);
                onClose();
              }}
              className="p-4 bg-[#141528] hover:bg-[#1a1c36] border border-[#22243e] hover:border-emerald-500/40 rounded-xl cursor-pointer transition flex flex-col justify-between gap-3 group"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    {tmpl.gameType}
                  </span>
                </div>
                <h4 className="font-bold text-sm text-white mt-2 group-hover:text-emerald-300 transition">
                  {tmpl.name}
                </h4>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                  {tmpl.description}
                </p>
              </div>

              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs text-slate-500">
                <span className="font-mono text-[11px]">Template 2D</span>
                <span className="flex items-center gap-1 text-emerald-400 group-hover:translate-x-1 transition font-semibold">
                  Iniciar <ArrowRight size={13} />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

