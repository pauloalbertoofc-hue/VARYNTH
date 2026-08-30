"use client";

import React, { useState } from "react";
import { GameDocumentState, GameBuildResult } from "@/lib/studio/game/types";
import { gameRuntimeEngine } from "@/lib/studio/game/game-runtime-engine";
import { Package, Download, X, CheckCircle2, AlertTriangle, Globe, Smartphone, Monitor } from "lucide-react";

interface GameBuildModalProps {
  isOpen: boolean;
  documentState: GameDocumentState;
  gameTitle: string;
  onClose: () => void;
}

export const GameBuildModal: React.FC<GameBuildModalProps> = ({
  isOpen,
  documentState,
  gameTitle,
  onClose,
}) => {
  const [selectedTarget, setSelectedTarget] = useState<"WEB" | "ANDROID" | "DESKTOP">("WEB");
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildResult, setBuildResult] = useState<GameBuildResult | null>(null);

  if (!isOpen) return null;

  const handleBuild = async () => {
    if (selectedTarget !== "WEB") return;

    setIsBuilding(true);
    setBuildResult(null);

    const res = await gameRuntimeEngine.buildWebGame(documentState, "USER");
    setBuildResult(res);
    setIsBuilding(false);
  };

  const handleDownload = () => {
    if (!buildResult?.success) return;
    const blob = new Blob([
      `<!DOCTYPE html><html><head><title>${gameTitle}</title></head><body><h1>${gameTitle}</h1><p>VARYNTH Web Game Build Package</p></body></html>`,
    ], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${gameTitle.toLowerCase().replace(/\s+/g, "-")}-web-build.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
      <div className="w-full max-w-lg bg-[#0e0f1d] border border-[#262846] rounded-2xl flex flex-col shadow-2xl overflow-hidden select-none">
        {/* Header */}
        <div className="p-4 bg-[#121426] border-b border-[#20223c] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package size={18} className="text-emerald-400" />
            <h3 className="font-bold text-sm text-white">Compilar & Exportar Jogo</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg text-slate-400">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs text-slate-300">
          <div>
            <label className="text-[11px] text-slate-400 uppercase font-semibold block mb-2">
              Plataforma de Destino
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setSelectedTarget("WEB")}
                className={`p-3 rounded-xl border flex flex-col items-center text-center gap-1.5 transition ${
                  selectedTarget === "WEB"
                    ? "bg-emerald-500/20 border-emerald-500 text-white font-bold"
                    : "bg-[#141628] border-[#22243e] text-slate-400 hover:bg-[#1a1c32]"
                }`}
              >
                <Globe size={18} className="text-emerald-400" />
                <span>Web Build (HTML5)</span>
                <span className="text-[9px] text-emerald-400 font-bold uppercase">Disponível</span>
              </button>

              <button
                onClick={() => setSelectedTarget("ANDROID")}
                className={`p-3 rounded-xl border flex flex-col items-center text-center gap-1.5 transition ${
                  selectedTarget === "ANDROID"
                    ? "bg-amber-500/20 border-amber-500 text-white font-bold"
                    : "bg-[#141628] border-[#22243e] text-slate-500 opacity-60"
                }`}
              >
                <Smartphone size={18} />
                <span>Android (APK)</span>
                <span className="text-[9px] text-slate-500 uppercase">Sem Toolchain</span>
              </button>

              <button
                onClick={() => setSelectedTarget("DESKTOP")}
                className={`p-3 rounded-xl border flex flex-col items-center text-center gap-1.5 transition ${
                  selectedTarget === "DESKTOP"
                    ? "bg-amber-500/20 border-amber-500 text-white font-bold"
                    : "bg-[#141628] border-[#22243e] text-slate-500 opacity-60"
                }`}
              >
                <Monitor size={18} />
                <span>Desktop (EXE)</span>
                <span className="text-[9px] text-slate-500 uppercase">Sem Toolchain</span>
              </button>
            </div>
          </div>

          {selectedTarget !== "WEB" ? (
            <div className="p-4 bg-amber-950/30 border border-amber-500/30 rounded-xl flex items-start gap-2.5 text-amber-300 text-xs">
              <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Capacidade Indisponível (Honest Capability)</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  O ambiente local atual não possui toolchains nativas instaladas para compilação Android/Desktop. Utilize o pacote Web (HTML5) para execução imediata em qualquer navegador.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-[#131526] rounded-xl border border-white/5 space-y-1.5 font-mono text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-400">Cenas Incluídas:</span>
                <span className="text-white">{documentState.scenes.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Entidades Totais:</span>
                <span className="text-white">{documentState.entities.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Regras Declarativas:</span>
                <span className="text-white">{documentState.rules.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Runtime:</span>
                <span className="text-emerald-400 font-bold">VARYNTH Web 2D Runtime v1.0</span>
              </div>
            </div>
          )}

          {buildResult && (
            <div
              className={`p-3 rounded-xl border flex items-center justify-between ${
                buildResult.success
                  ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
                  : "bg-rose-950/40 border-rose-500/40 text-rose-300"
              }`}
            >
              <div className="flex items-center gap-2">
                {buildResult.success ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                <span className="font-semibold text-xs">
                  {buildResult.success ? "Build compilado com sucesso!" : `Falha no build: ${buildResult.error}`}
                </span>
              </div>
              {buildResult.success && (
                <button
                  onClick={handleDownload}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold flex items-center gap-1 shadow"
                >
                  <Download size={13} /> Baixar
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#121426] border-t border-[#20223c] flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 hover:bg-white/10 rounded-xl text-slate-300 text-xs font-semibold">
            Fechar
          </button>
          {selectedTarget === "WEB" && (
            <button
              onClick={handleBuild}
              disabled={isBuilding}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-500/20 transition flex items-center gap-1.5"
            >
              {isBuilding ? "Compilando..." : "Compilar Web Game"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

