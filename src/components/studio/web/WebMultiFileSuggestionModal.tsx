"use client";

import React from "react";
import { WebMultiFileChangeSet } from "@/lib/studio/web/types";
import { Sparkles, Check, X, FileCode, Plus, Minus, Edit3 } from "lucide-react";

interface WebMultiFileSuggestionModalProps {
  isOpen: boolean;
  changeSets: WebMultiFileChangeSet[];
  onAccept: (changeSetId: string) => void;
  onReject: (changeSetId: string) => void;
  onClose: () => void;
}

export function WebMultiFileSuggestionModal({
  isOpen,
  changeSets,
  onAccept,
  onReject,
  onClose,
}: WebMultiFileSuggestionModalProps) {
  if (!isOpen || changeSets.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#121324] border border-[#222442] rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1e2038] flex items-center justify-between bg-[#15162a]">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-amber-400" />
            <h3 className="font-bold text-base text-white">Proposta Multi-Arquivo da Athena</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded">
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {changeSets.map((cs) => (
            <div key={cs.id} className="bg-[#0b0c16] border border-[#1e203a] rounded-xl p-5 space-y-4">
              <div>
                <h4 className="font-bold text-sm text-amber-300">{cs.title}</h4>
                <p className="text-xs text-slate-400 mt-1">{cs.description}</p>
              </div>

              {/* Diffs List */}
              <div className="space-y-3">
                <span className="text-[11px] font-semibold uppercase text-slate-500 tracking-wider">
                  Arquivos Impactados ({cs.changes.length})
                </span>

                {cs.changes.map((diff, idx) => (
                  <div key={idx} className="bg-[#131428] border border-[#202240] rounded-lg p-3 text-xs space-y-2">
                    <div className="flex items-center justify-between font-mono">
                      <div className="flex items-center gap-2 text-blue-300 font-semibold">
                        <FileCode size={14} />
                        <span>{diff.path}</span>
                      </div>
                      <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded uppercase">
                        {diff.type}
                      </span>
                    </div>

                    <p className="text-slate-400 text-[11px] italic">{diff.explanation}</p>

                    {diff.oldContent && (
                      <div className="bg-[#1f1118] border border-red-500/30 p-2 rounded text-[11px] text-red-300 font-mono line-clamp-3">
                        <span className="text-[9px] text-red-400 uppercase font-bold block mb-1">Anterior:</span>
                        {diff.oldContent}
                      </div>
                    )}

                    <div className="bg-[#101b1e] border border-emerald-500/30 p-2 rounded text-[11px] text-emerald-300 font-mono line-clamp-4">
                      <span className="text-[9px] text-emerald-400 uppercase font-bold block mb-1">Proposto:</span>
                      {diff.newContent}
                    </div>
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
                  Aceitar Todas as Alterações
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

