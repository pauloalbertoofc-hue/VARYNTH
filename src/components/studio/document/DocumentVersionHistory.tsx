"use client";

import React, { useState } from "react";
import { ArtifactVersion } from "@/lib/artifacts/types";
import { Clock, RotateCcw, User, Sparkles } from "lucide-react";

interface DocumentVersionHistoryProps {
  versions: ArtifactVersion[];
  currentVersionNumber: string;
  onRestoreVersion: (versionNumber: string) => void;
  onCompareVersions?: (v1: string, v2: string) => void;
}

export function DocumentVersionHistory({
  versions,
  currentVersionNumber,
  onRestoreVersion,
}: DocumentVersionHistoryProps) {
  const sortedVersions = [...versions].sort((a, b) => b.versionNumber - a.versionNumber);

  return (
    <div className="p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between pb-2 border-b border-[#1c1c2e]">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Histórico de Versões</span>
        <span className="text-[10px] text-slate-500 bg-[#161626] px-1.5 py-0.5 rounded">{versions.length} versões</span>
      </div>

      <div className="flex flex-col gap-2">
        {sortedVersions.map((ver) => {
          const isCurrent = `v${ver.versionNumber}.0` === currentVersionNumber || ver.versionNumber.toString() === currentVersionNumber;
          return (
            <div
              key={ver.versionId}
              className={`p-2.5 rounded-lg border text-xs transition ${
                isCurrent
                  ? "bg-blue-500/10 border-blue-500/30 text-white"
                  : "bg-[#121220] border-[#1e1e32] text-slate-300 hover:border-slate-600"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-semibold">
                  <Clock size={12} className={isCurrent ? "text-blue-400" : "text-slate-400"} />
                  <span>v{ver.versionNumber}.0</span>
                  {isCurrent && (
                    <span className="text-[9px] bg-blue-500/20 text-blue-300 px-1 py-0.2 rounded border border-blue-500/40">
                      Atual
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 text-[10px] text-slate-500">
                  {ver.createdBy === "ATHENA" ? (
                    <span className="flex items-center gap-0.5 text-amber-400">
                      <Sparkles size={10} /> Athena
                    </span>
                  ) : (
                    <span className="flex items-center gap-0.5">
                      <User size={10} /> Usuário
                    </span>
                  )}
                </div>
              </div>

              <p className="mt-1 text-[11px] text-slate-400 line-clamp-2">{ver.changeSummary || "Sem descrição."}</p>

              <div className="mt-2 pt-2 border-t border-[#1a1a2e] flex items-center justify-between">
                <span className="text-[9px] text-slate-500">
                  {new Date(ver.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>

                <div className="flex items-center gap-1">
                  {!isCurrent && (
                    <button
                      onClick={() => onRestoreVersion(ver.versionNumber.toString())}
                      className="px-2 py-0.5 bg-[#1e1e32] hover:bg-blue-600 hover:text-white rounded text-[10px] flex items-center gap-1 transition"
                      title="Restaurar esta versão (cria uma nova versão preservando o histórico via Alex Principle)"
                    >
                      <RotateCcw size={10} /> Restaurar
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

