"use client";

import React from "react";
import { DocumentSuggestion } from "@/lib/studio/document/types";
import { Sparkles, Check, X } from "lucide-react";

interface DocumentSuggestionPanelProps {
  suggestions: DocumentSuggestion[];
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
}

export function DocumentSuggestionPanel({
  suggestions,
  onAccept,
  onReject,
}: DocumentSuggestionPanelProps) {
  const pending = suggestions.filter((s) => s.status === "PENDING");

  return (
    <div className="p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between pb-2 border-b border-[#1c1c2e]">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-400">
          <Sparkles size={13} />
          <span>Sugestões da Athena</span>
        </div>
        <span className="text-[10px] text-amber-400/80 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
          {pending.length} pendentes
        </span>
      </div>

      {pending.length === 0 ? (
        <p className="text-xs text-slate-500 italic mt-1">
          Nenhuma sugestão pendente no momento. Selecione um trecho e peça revisões à Athena.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {pending.map((sug) => (
            <div key={sug.id} className="p-3 bg-[#131322] border border-[#22223c] rounded-lg text-xs flex flex-col gap-2">
              {sug.rationale && (
                <p className="text-[11px] text-amber-300/90 italic">
                  &quot;{sug.rationale}&quot;
                </p>
              )}

              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase text-rose-400 font-semibold">Original:</span>
                <p className="text-[11px] text-slate-400 line-through bg-rose-500/5 p-1.5 rounded border border-rose-500/20 font-mono">
                  {sug.originalText}
                </p>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase text-emerald-400 font-semibold">Proposto:</span>
                <p className="text-[11px] text-slate-200 bg-emerald-500/5 p-1.5 rounded border border-emerald-500/20 font-mono">
                  {sug.proposedText}
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  onClick={() => onReject(sug.id)}
                  className="px-2 py-1 bg-[#1a1a2e] hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 rounded text-[11px] flex items-center gap-1 transition"
                >
                  <X size={12} /> Rejeitar
                </button>
                <button
                  onClick={() => onAccept(sug.id)}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] flex items-center gap-1 font-medium transition"
                >
                  <Check size={12} /> Aceitar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

