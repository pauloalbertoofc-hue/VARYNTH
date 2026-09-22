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
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#121324] border border-[#222442] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-[#1e2038] flex items-center justify-between bg-[#15162a]">
          <h3 className="font-bold text-base text-white flex items-center gap-2">
            <Download size={16} className="text-blue-400" />
            Exportar Mixagem de Áudio
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded">
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs">
          {/* Format Selector with Honest Capability Check */}
          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
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
                    className={`p-2.5 rounded-xl border text-center font-semibold transition ${
                      isSelected
                        ? "bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-500/20"
                        : "bg-[#0b0c16] border-[#1d1f36] text-slate-300 hover:border-slate-500"
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
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">Destino</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4"><button type="button" onClick={() => setTargetType("FULL_MIX")} className={`rounded-lg border p-2 text-xs ${targetType === "FULL_MIX" ? "border-blue-500 bg-blue-600/20 text-blue-200" : "border-[#1d1f36] text-slate-400"}`}>Mix completo</button><button type="button" onClick={() => setTargetType("CLIP")} disabled={!selectedClipId} className={`rounded-lg border p-2 text-xs ${targetType === "CLIP" ? "border-blue-500 bg-blue-600/20 text-blue-200" : "border-[#1d1f36] text-slate-400 disabled:opacity-30"}`}>Clip selecionado</button><button type="button" onClick={() => setTargetType("SELECTED_REGION")} className={`rounded-lg border p-2 text-xs ${targetType === "SELECTED_REGION" ? "border-blue-500 bg-blue-600/20 text-blue-200" : "border-[#1d1f36] text-slate-400"}`}>Região</button><button type="button" onClick={() => setTargetType("STEMS")} className={`rounded-lg border p-2 text-xs ${targetType === "STEMS" ? "border-blue-500 bg-blue-600/20 text-blue-200" : "border-[#1d1f36] text-slate-400"}`}>Stems</button></div>
            {targetType === "STEMS" && <div className="mt-2 space-y-1">{tracks.map((track) => <label key={track.id} className="flex items-center gap-2 text-[10px] text-slate-400"><input type="checkbox" checked={selectedTrackIds.includes(track.id)} onChange={(event) => setSelectedTrackIds((current) => event.target.checked ? [...current, track.id] : current.filter((id) => id !== track.id))} />{track.name}</label>)}</div>}
            {targetType === "SELECTED_REGION" && <div className="mt-2 grid grid-cols-2 gap-2"><label className="text-[10px] text-slate-500">Início (ms)<input type="number" min="0" value={startMs} onChange={(event) => setStartMs(Number(event.target.value))} className="mt-1 w-full rounded border border-[#303650] bg-[#0b0c16] p-2 text-white" /></label><label className="text-[10px] text-slate-500">Fim (ms)<input type="number" min="1" value={endMs} onChange={(event) => setEndMs(Number(event.target.value))} className="mt-1 w-full rounded border border-[#303650] bg-[#0b0c16] p-2 text-white" /></label></div>}
          </div>

          {/* Sample Rate */}
          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
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
                      ? "bg-blue-600/20 border-blue-500 text-blue-300 font-bold"
                      : "bg-[#0b0c16] border-[#1d1f36] text-slate-400 hover:text-white"
                  }`}
                >
                  {rate / 1000} kHz ({rate === 44100 ? "CD / Padrão" : "Vídeo / Studio"})
                </button>
              ))}
            </div>
          </div>

          {/* Normalization Toggle */}
          <label className="flex items-center gap-2 pt-2 cursor-pointer text-slate-300">
            <input
              type="checkbox"
              checked={normalize}
              onChange={(e) => setNormalize(e.target.checked)}
              className="rounded accent-blue-500"
            />
            <span>Normalizar Áudio na Exportação (-0.2 dBFS Peak)</span>
          </label>

          {/* Warnings Display */}
          {warnings.length > 0 && (
            <div className="p-3 bg-amber-950/40 border border-amber-500/40 rounded-xl space-y-1">
              <span className="font-semibold text-amber-300 flex items-center gap-1">
                <AlertTriangle size={13} /> Alerta de Renderização
              </span>
              {warnings.map((w, i) => (
                <p key={i} className="text-[11px] text-amber-200/80">{w}</p>
              ))}
            </div>
          )}
          {exportError && <p role="alert" className="rounded-lg border border-rose-500/40 bg-rose-950/30 p-3 text-[11px] text-rose-200">{exportError}</p>}

          {/* Actions */}
          <div className="pt-4 border-t border-[#1e2038] flex items-center justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[#1a1b2e] hover:bg-[#252740] text-slate-300 rounded-lg text-xs font-medium transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-blue-500/20 transition flex items-center gap-1.5 disabled:opacity-50"
            >
              {exported ? (
                <>
                  <Check size={14} className="text-emerald-300" />
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
