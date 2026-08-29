"use client";

import React from "react";
import { AudioChangeSet } from "@/lib/studio/audio/types";
import { Sparkles, Check, X, Scissors, Volume2, Move, Plus } from "lucide-react";

interface AudioChangeSetModalProps {
  isOpen: boolean;
  changeSets: AudioChangeSet[];
  onAccept: (changeSetId: string) => void;
  onReject: (changeSetId: string) => void;
  onClose: () => void;
}

export function AudioChangeSetModal({
  isOpen,
  changeSets,
  onAccept,
  onReject,
  onClose,
}: AudioChangeSetModalProps) {
  if (!isOpen || changeSets.length === 0) return null;

  const getOpIcon = (type: string) => {
    switch (type) {
      case "TRIM_CLIP":
        return <Scissors size={13} className="text-amber-400" />;
      case "MOVE_CLIP":
        return <Move size={13} className="text-blue-400" />;
      case "SET_CLIP_GAIN":
      case "UPDATE_TRACK":
        return <Volume2 size={13} className="text-emerald-400" />;
      default:
        return <Plus size={13} className="text-purple-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#121324] border border-[#222442] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1e2038] flex items-center justify-between bg-[#15162a]">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-amber-400" />
            <h3 className="font-bold text-base text-white">Proposta de Áudio da Athena</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded">
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {changeSets.map((cs) => (
            <div key={cs.id} className="bg-[#0b0c16] border border-[#1e203a] rounded-xl p-5 space-y-4">
              <div>
                <h4 className="font-bold text-sm text-amber-300">{cs.title}</h4>
                <p className="text-xs text-slate-400 mt-1">{cs.summary}</p>
              </div>

              {/* Operations List */}
              <div className="space-y-2">
                <span className="text-[11px] font-semibold uppercase text-slate-500 tracking-wider">
                  Operações Temporais ({cs.operations.length})
                </span>

                {cs.operations.map((op, idx) => (
                  <div
                    key={idx}
                    className="bg-[#131428] border border-[#202240] rounded-lg p-2.5 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      {getOpIcon(op.type)}
                      <span className="font-mono text-blue-300 font-semibold">{op.type}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {"clipId" in op ? `Clip: ${op.clipId}` : "trackId" in op ? `Faixa: ${op.trackId}` : "Timeline Global"}
                    </span>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-[#1c1d34] flex items-center justify-end gap-2">
                <button
                  onClick={() => onReject(cs.id)}
                  className="px-4 py-1.5 bg-[#1a1b30] hover:bg-red-500/20 text-slate-300 hover:text-red-300 border border-slate-700 hover:border-red-500/40 rounded-lg text-xs font-medium transition flex items-center gap-1.5"
                >
                  <X size={13} />
                  Rejeitar Proposta
                </button>
                <button
                  onClick={() => onAccept(cs.id)}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-emerald-600/20 transition flex items-center gap-1.5"
                >
                  <Check size={13} />
                  Aceitar Proposta
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

