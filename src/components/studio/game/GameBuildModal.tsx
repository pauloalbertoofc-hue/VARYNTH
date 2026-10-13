"use client";

import React, { useState } from "react";
import { GameDocumentState, GameBuildResult } from "@/lib/studio/game/types";
import { gameRuntimeEngine } from "@/lib/studio/game/game-runtime-engine";
import { assetManager } from "@/lib/artifacts/asset-manager";
import { Package, Download, X, CheckCircle2, AlertTriangle, Globe, Smartphone, Monitor } from "lucide-react";
import { Surface } from "@/components/ui/Surface";

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

  const handleDownload = async () => {
    if (!buildResult?.success) return;
    const data = buildResult.assetId ? await assetManager.getAssetData(buildResult.assetId) : null;
    if (!data) return;
    const blob = typeof data === "string" ? await (await fetch(data)).blob() : data instanceof Blob ? data : new Blob([data], { type: "application/zip" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${gameTitle.toLowerCase().replace(/\s+/g, "-")}-web-build.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--vly-world)]/80 p-6 backdrop-blur-md">
      <Surface tone="floating" className="flex w-full max-w-lg flex-col overflow-hidden rounded-2xl shadow-2xl select-none">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--vly-border-subtle)] bg-[var(--vly-surface)] p-4">
          <div className="flex items-center gap-2">
            <Package size={18} className="text-[var(--vly-success)]" />
            <h3 className="text-sm font-bold text-[var(--vly-text-primary)]">Compilar & Exportar Jogo</h3>
          </div>
          <button onClick={onClose} className="vly-interactive rounded-lg p-1 text-[var(--vly-text-muted)] hover:text-[var(--vly-text-primary)]">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4 p-5 text-xs text-[var(--vly-text-secondary)]">
          <div>
            <label className="mb-2 block text-[11px] font-semibold uppercase text-[var(--vly-text-muted)]">
              Plataforma de Destino
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setSelectedTarget("WEB")}
                className={`p-3 rounded-xl border flex flex-col items-center text-center gap-1.5 transition ${
                  selectedTarget === "WEB"
                    ? "bg-[var(--vly-success)]/20 border-[var(--vly-border-success)] text-[var(--vly-text-primary)] font-bold"
                    : "bg-[var(--vly-surface-raised)] border-[var(--vly-border-subtle)] text-[var(--vly-text-muted)] hover:border-[var(--vly-border-strong)]"
                }`}
              >
                <Globe size={18} className="text-[var(--vly-success)]" />
                <span>Web Build (HTML5)</span>
                <span className="text-[9px] font-bold uppercase text-[var(--vly-success)]">Disponível</span>
              </button>

              <button
                onClick={() => setSelectedTarget("ANDROID")}
                className={`p-3 rounded-xl border flex flex-col items-center text-center gap-1.5 transition ${
                  selectedTarget === "ANDROID"
                    ? "bg-[var(--vly-warning)]/20 border-[var(--vly-border-warning)] text-[var(--vly-text-primary)] font-bold"
                    : "bg-[var(--vly-surface-raised)] border-[var(--vly-border-subtle)] text-[var(--vly-text-muted)] opacity-60"
                }`}
              >
                <Smartphone size={18} />
                <span>Android (APK)</span>
                <span className="text-[9px] text-[var(--vly-text-muted)] uppercase">Sem Toolchain</span>
              </button>

              <button
                onClick={() => setSelectedTarget("DESKTOP")}
                className={`p-3 rounded-xl border flex flex-col items-center text-center gap-1.5 transition ${
                  selectedTarget === "DESKTOP"
                    ? "bg-[var(--vly-warning)]/20 border-[var(--vly-border-warning)] text-[var(--vly-text-primary)] font-bold"
                    : "bg-[var(--vly-surface-raised)] border-[var(--vly-border-subtle)] text-[var(--vly-text-muted)] opacity-60"
                }`}
              >
                <Monitor size={18} />
                <span>Desktop (EXE)</span>
                <span className="text-[9px] text-[var(--vly-text-muted)] uppercase">Sem Toolchain</span>
              </button>
            </div>
          </div>

          {selectedTarget !== "WEB" ? (
            <div className="flex items-start gap-2.5 rounded-xl border border-[var(--vly-border-warning)] bg-[var(--vly-warning)]/10 p-4 text-xs text-[var(--vly-warning)]">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-[var(--vly-warning)]" />
              <div>
                <p className="font-bold">Capacidade Indisponível (Honest Capability)</p>
                <p className="mt-1 text-[11px] text-[var(--vly-text-muted)]">
                  O ambiente local atual não possui toolchains nativas instaladas para compilação Android/Desktop. Utilize o pacote Web (HTML5) para execução imediata em qualquer navegador.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5 rounded-xl border border-[var(--vly-border-subtle)] bg-[var(--vly-surface)] p-3 font-mono text-[11px]">
              <div className="flex justify-between">
                <span className="text-[var(--vly-text-muted)]">Cenas Incluídas:</span>
                <span className="text-[var(--vly-text-primary)]">{documentState.scenes.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--vly-text-muted)]">Entidades Totais:</span>
                <span className="text-[var(--vly-text-primary)]">{documentState.entities.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--vly-text-muted)]">Regras Declarativas:</span>
                <span className="text-[var(--vly-text-primary)]">{documentState.rules.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--vly-text-muted)]">Runtime:</span>
                <span className="font-bold text-[var(--vly-success)]">VARYNTH Web 2D Runtime v1.0</span>
              </div>
            </div>
          )}

          {buildResult && (
            <div
              className={`p-3 rounded-xl border flex items-center justify-between ${
                buildResult.success
                  ? "bg-[var(--vly-success)]/10 border-[var(--vly-border-success)] text-[var(--vly-success)]"
                  : "bg-[var(--vly-danger)]/10 border-[var(--vly-border-danger)] text-[var(--vly-danger)]"
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
                  className="vly-interactive flex items-center gap-1 rounded bg-[var(--vly-success)] px-3 py-1 text-xs font-semibold text-[var(--vly-text-on-accent)] shadow hover:opacity-90"
                >
                  <Download size={13} /> Baixar
                </button>
              )}
            </div>
          )}
          {buildResult?.success && buildResult.warnings?.length ? (
            <div className="rounded-xl border border-[var(--vly-border-warning)] bg-[var(--vly-warning)]/10 p-3 text-[11px] text-[var(--vly-warning)]">
              <div className="flex items-start gap-2"><AlertTriangle size={14} className="mt-0.5 shrink-0" /><div><p className="font-semibold">Build concluído com avisos</p><ul className="mt-1 list-disc space-y-1 pl-4">{buildResult.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></div></div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-[var(--vly-border-subtle)] bg-[var(--vly-surface)] p-4">
          <button onClick={onClose} className="vly-interactive rounded-xl px-4 py-2 text-xs font-semibold text-[var(--vly-text-secondary)] hover:text-[var(--vly-text-primary)]">
            Fechar
          </button>
          {selectedTarget === "WEB" && (
            <button
              onClick={handleBuild}
              disabled={isBuilding}
              className="vly-interactive flex items-center gap-1.5 rounded-xl bg-[var(--vly-success)] px-5 py-2 text-xs font-bold text-[var(--vly-text-on-accent)] shadow-lg disabled:opacity-50 transition hover:opacity-90"
            >
              {isBuilding ? "Compilando..." : "Compilar Web Game"}
            </button>
          )}
        </div>
      </Surface>
    </div>
  );
};
