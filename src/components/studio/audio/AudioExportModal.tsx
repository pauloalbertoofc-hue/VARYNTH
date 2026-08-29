"use client";

import React, { useState } from "react";
import { AudioExportFormat, AudioExportOptions } from "@/lib/studio/audio/types";
import { audioService } from "@/lib/studio/audio/audio-service";
import { audioRenderEngine } from "@/lib/studio/audio/audio-render-engine";
import { Download, Check, X, Sliders, Music, AlertTriangle } from "lucide-react";

interface AudioExportModalProps {
  isOpen: boolean;
  artifactId: string;
  audioTitle: string;
  onClose: () => void;
}

export function AudioExportModal({
  isOpen,
  artifactId,
  audioTitle,
  onClose,
}: AudioExportModalProps) {
  const [format, setFormat] = useState<AudioExportFormat>("WAV");
  const [sampleRate, setSampleRate] = useState(44100);
  const [normalize, setNormalize] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exported, setExported] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);

  if (!isOpen) return null;

  const handleExport = async () => {
    setIsExporting(true);
    setWarnings([]);

    const options: AudioExportOptions = {
      format,
      sampleRate,
      normalize,
      bitDepth: 16,
      channels: 2,
    };

    const res = await audioService.exportAudio(artifactId, options, "USER");
    setIsExporting(false);

    if (res.success && res.blob) {
      if (res.warnings && res.warnings.length > 0) {
        setWarnings(res.warnings);
      }

      const url = URL.createObjectURL(res.blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${audioTitle.toLowerCase().replace(/\s+/g, "-")}.${format.toLowerCase()}`;
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

