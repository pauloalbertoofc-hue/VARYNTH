"use client";

import React, { useState } from "react";
import { AudioExportFormat, AudioExportOptions, AudioTrack } from "@/lib/studio/audio/types";
import { audioService } from "@/lib/studio/audio/audio-service";
import { audioRenderEngine } from "@/lib/studio/audio/audio-render-engine";
import { Download, Check, X, Sliders, Music, AlertTriangle } from "lucide-react";

interface AudioExportModalProps {
  isOpen: boolean;
  artifactId: string;
  audioTitle: string;
  onClose: () => void;
  tracks?: AudioTrack[];
  selectedClipId?: string;
}

export function AudioExportModal({
  isOpen,
  artifactId,
  audioTitle,
  onClose,
  tracks = [],
  selectedClipId,
}: AudioExportModalProps) {
  const [format, setFormat] = useState<AudioExportFormat>("WAV");
  const [sampleRate, setSampleRate] = useState(44100);
  const [normalize, setNormalize] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exported, setExported] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [targetType, setTargetType] = useState<"FULL_MIX" | "SELECTED_REGION" | "STEMS" | "CLIP">("FULL_MIX");
  const [selectedTrackIds, setSelectedTrackIds] = useState<string[]>([]);
  const [startMs, setStartMs] = useState(0);
  const [endMs, setEndMs] = useState(0);
  const [exportError, setExportError] = useState<string>();

  if (!isOpen) return null;

  const handleExport = async () => {
    setIsExporting(true);
    setWarnings([]);
    setExportError(undefined);

    if (targetType === "STEMS" && selectedTrackIds.length === 0) {
      setIsExporting(false);
      setExportError("[AUDIO_EXPORT_TRACK_REQUIRED] Selecione ao menos uma faixa para exportar como stem.");
      return;
    }
    if (targetType === "SELECTED_REGION" && endMs <= startMs) {
      setIsExporting(false);
      setExportError("[AUDIO_EXPORT_REGION_INVALID] O fim da região deve ser maior que o início.");
      return;
    }

    const clipTarget = selectedClipId ? tracks.flatMap((track) => track.clips).find((clip) => clip.id === selectedClipId) : undefined;
    const options: AudioExportOptions = {
      format,
      sampleRate,
      normalize,
      bitDepth: 16,
      channels: 2,
      target: targetType === "FULL_MIX" ? { type: "FULL_MIX" } : targetType === "CLIP" ? { type: "CLIP", clipId: selectedClipId } : { type: "SELECTED_REGION", startMs, endMs },
    };

    if (targetType === "STEMS") {
      try {
        const stemResult = await audioService.exportStems(artifactId, { ...options, target: { type: "STEMS", trackIds: selectedTrackIds } }, "USER");
        if (!stemResult.success) { setExportError(stemResult.error || "[AUDIO_STEMS_EXPORT_FAILED] A exportação de stems falhou."); return; }
        const stems = stemResult.stems.filter((stem) => stem.result.success && stem.result.blob);
        if (stems.length !== selectedTrackIds.length) { setExportError("[AUDIO_STEMS_INCOMPLETE] Nem todas as faixas selecionadas produziram um arquivo."); return; }
        for (const stem of stems) {
          const trackName = tracks.find((track) => track.id === stem.trackId)?.name || stem.trackId;
          const safeName = trackName.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || stem.trackId;
          const url = URL.createObjectURL(stem.result.blob!); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `${audioTitle.toLowerCase().replace(/\s+/g, "-")}-${safeName}.wav`; document.body.appendChild(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
        }
        setExported(true);
      } catch (error) { setExportError(error instanceof Error ? error.message : String(error)); }
      finally { setIsExporting(false); }
      return;
    }
    const res = await audioService.exportAudio(artifactId, options, "USER");
    setIsExporting(false);

    if (res.success && res.blob) {
      if (res.warnings && res.warnings.length > 0) {
        setWarnings(res.warnings);
      }

      const url = URL.createObjectURL(res.blob);
      const a = document.createElement("a");
      a.href = url;
      const exportName = targetType === "CLIP" && clipTarget?.name ? clipTarget.name : audioTitle;
      const safeExportName = exportName.replace(/\.(wav|wave|mp3|ogg|m4a|aac|flac)$/i, "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "audio-export";
      a.download = `${safeExportName}.${format.toLowerCase()}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExported(true);
      setTimeout(() => {
        setExported(false);
        if (!res.warnings || res.warnings.length === 0) {
          onClose();
        }
      }, 1400);
    } else {
      alert(`Falha na exportação: ${res.error}`);
    }
  };

  const formats: AudioExportFormat[] = ["WAV", "MP3", "OGG"];

  return (
    <div role="presentation" className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--vly-world)]/80 p-4 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" aria-labelledby="audio-export-title" className="w-full max-w-md overflow-hidden rounded-2xl border border-[var(--vly-border-strong)] bg-[var(--vly-surface-floating)] shadow-2xl">
        <div className="px-6 py-4 border-b border-[var(--vly-border-subtle)] flex items-center justify-between bg-[var(--vly-surface-raised)]">
          <h3 id="audio-export-title" className="flex items-center gap-2 text-base font-bold text-[var(--vly-text-primary)]">
            <Download size={16} className="text-[var(--vly-info)]" />
            Exportar Mixagem de Áudio
          </h3>
          <button type="button" aria-label="Fechar exportação" onClick={onClose} className="vly-interactive rounded p-1 text-[var(--vly-text-muted)] hover:text-[var(--vly-text-primary)]">
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs">
          {/* Format Selector with Honest Capability Check */}
          <div>
            <label className="text-[11px] font-semibold text-[var(--vly-text-secondary)] uppercase tracking-wider block mb-2">
              Formato de Áudio
            </label>
            <div className="grid grid-cols-3 gap-2">
              {formats.map((fmt) => {
                const isSupported = audioRenderEngine.canExport(fmt);
                const isSelected = format === fmt;

                return (
                  <button
                    key={fmt}
                    type="button"
                    disabled={!isSupported}
                    onClick={() => setFormat(fmt)}
                    aria-pressed={isSelected}
                    className={`vly-interactive rounded-xl border p-2.5 text-center font-semibold ${
                      isSelected
                        ? "bg-[var(--vly-info)] border-[var(--vly-info)] text-[var(--vly-text-primary)]"
                        : "bg-[var(--vly-world)] border-[var(--vly-border-subtle)] text-[var(--vly-text-secondary)] hover:border-[var(--vly-border-strong)]"
                    } ${!isSupported ? "opacity-30 cursor-not-allowed" : ""}`}
                    title={!isSupported ? "Codec não disponível no runtime local" : ""}
                  >
                    {fmt}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sample Rate */}
          <div>
            <label className="text-[11px] font-semibold text-[var(--vly-text-secondary)] uppercase tracking-wider block mb-2">Destino</label>
            <div role="group" aria-label="Destino da exportação" className="grid grid-cols-2 gap-2 sm:grid-cols-4"><button type="button" aria-pressed={targetType === "FULL_MIX"} onClick={() => setTargetType("FULL_MIX")} className={`vly-interactive rounded-lg border p-2 text-xs ${targetType === "FULL_MIX" ? "border-[var(--vly-border-accent)] bg-[color-mix(in_srgb,var(--vly-accent)_18%,transparent)] text-[var(--vly-accent)]" : "border-[var(--vly-border-default)] text-[var(--vly-text-muted)]"}`}>Mix completo</button><button type="button" aria-pressed={targetType === "CLIP"} onClick={() => setTargetType("CLIP")} disabled={!selectedClipId} className={`vly-interactive rounded-lg border p-2 text-xs ${targetType === "CLIP" ? "border-[var(--vly-border-accent)] bg-[color-mix(in_srgb,var(--vly-accent)_18%,transparent)] text-[var(--vly-accent)]" : "border-[var(--vly-border-default)] text-[var(--vly-text-muted)] disabled:opacity-30"}`}>Clip selecionado</button><button type="button" aria-pressed={targetType === "SELECTED_REGION"} onClick={() => setTargetType("SELECTED_REGION")} className={`vly-interactive rounded-lg border p-2 text-xs ${targetType === "SELECTED_REGION" ? "border-[var(--vly-border-accent)] bg-[color-mix(in_srgb,var(--vly-accent)_18%,transparent)] text-[var(--vly-accent)]" : "border-[var(--vly-border-default)] text-[var(--vly-text-muted)]"}`}>Região</button><button type="button" aria-pressed={targetType === "STEMS"} onClick={() => setTargetType("STEMS")} className={`vly-interactive rounded-lg border p-2 text-xs ${targetType === "STEMS" ? "border-[var(--vly-border-accent)] bg-[color-mix(in_srgb,var(--vly-accent)_18%,transparent)] text-[var(--vly-accent)]" : "border-[var(--vly-border-default)] text-[var(--vly-text-muted)]"}`}>Stems</button></div>
            {targetType === "STEMS" && <div className="mt-2 space-y-1">{tracks.map((track) => <label key={track.id} className="flex items-center gap-2 text-[10px] text-slate-400"><input type="checkbox" checked={selectedTrackIds.includes(track.id)} onChange={(event) => setSelectedTrackIds((current) => event.target.checked ? [...current, track.id] : current.filter((id) => id !== track.id))} />{track.name}</label>)}</div>}
            {targetType === "SELECTED_REGION" && <div className="mt-2 grid grid-cols-2 gap-2"><label className="text-[10px] text-[var(--vly-text-muted)]">Início (ms)<input aria-label="Início da região em milissegundos" type="number" min="0" value={startMs} onChange={(event) => setStartMs(Number(event.target.value))} className="vly-field mt-1 w-full p-2" /></label><label className="text-[10px] text-[var(--vly-text-muted)]">Fim (ms)<input aria-label="Fim da região em milissegundos" type="number" min="1" value={endMs} onChange={(event) => setEndMs(Number(event.target.value))} className="vly-field mt-1 w-full p-2" /></label></div>}
          </div>

          {/* Sample Rate */}
          <div>
            <label className="text-[11px] font-semibold text-[var(--vly-text-secondary)] uppercase tracking-wider block mb-2">
              Taxa de Amostragem (Sample Rate)
            </label>
            <div className="grid grid-cols-2 gap-2 font-mono">
              {[44100, 48000].map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => setSampleRate(rate)}
                  className={`p-2 rounded-lg border text-xs ${
                    sampleRate === rate
                      ? "bg-[var(--vly-info)]/20 border-[var(--vly-info)] text-[var(--vly-info)] font-bold"
                      : "bg-[var(--vly-world)] border-[var(--vly-border-subtle)] text-[var(--vly-text-secondary)] hover:text-[var(--vly-text-primary)]"
                  }`}
                >
                  {rate / 1000} kHz ({rate === 44100 ? "CD / Padrão" : "Vídeo / Studio"})
                </button>
              ))}
            </div>
          </div>

          {/* Normalization Toggle */}
          <label className="flex items-center gap-2 pt-2 cursor-pointer text-[var(--vly-text-secondary)]">
            <input
              type="checkbox"
              checked={normalize}
              onChange={(e) => setNormalize(e.target.checked)}
              className="rounded accent-[var(--vly-accent)]"
            />
            <span>Normalizar Áudio na Exportação (-0.2 dBFS Peak)</span>
          </label>

          {/* Warnings Display */}
          {warnings.length > 0 && (
            <div className="p-3 bg-[var(--vly-warning)]/10 border border-[var(--vly-warning)]/40 rounded-xl space-y-1">
              <span className="font-semibold text-[var(--vly-warning)] flex items-center gap-1">
                <AlertTriangle size={13} /> Alerta de Renderização
              </span>
              {warnings.map((w, i) => (
                <p key={i} className="text-[11px] text-[var(--vly-warning)]/80">{w}</p>
              ))}
            </div>
          )}
          {exportError && <p role="alert" className="rounded-lg border border-[var(--vly-danger)]/40 bg-[var(--vly-danger)]/10 p-3 text-[11px] text-[var(--vly-danger)]">{exportError}</p>}

          {/* Actions */}
          <div className="pt-4 border-t border-[var(--vly-border-subtle)] flex items-center justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[var(--vly-surface-raised)] hover:bg-[var(--vly-surface-hover)] text-[var(--vly-text-secondary)] rounded-lg text-xs font-medium transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="px-5 py-2 bg-[var(--vly-accent)] hover:opacity-90 text-[var(--vly-accent-contrast)] rounded-lg text-xs font-semibold transition flex items-center gap-1.5 disabled:opacity-50"
            >
              {exported ? (
                <>
                  <Check size={14} className="text-[var(--vly-success)]" />
                  Mixagem Baixada!
                </>
              ) : isExporting ? (
                <span>Renderizando PCM...</span>
              ) : (
                <>
                  <Download size={14} />
                  Renderizar & Baixar
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
