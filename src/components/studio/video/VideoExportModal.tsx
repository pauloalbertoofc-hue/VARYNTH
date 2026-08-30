"use client";

import React, { useState } from "react";
import { VideoExportFormat, VideoRenderProfile, VideoExportOptions } from "@/lib/studio/video/types";
import { videoService } from "@/lib/studio/video/video-service";
import { videoRenderEngine } from "@/lib/studio/video/video-render-engine";
import { Download, Check, X, Film, AlertTriangle } from "lucide-react";
import { FPS_30, FPS_24, FPS_29_97, FPS_60 } from "@/lib/studio/temporal/temporal-core";

interface VideoExportModalProps {
  isOpen: boolean;
  artifactId: string;
  videoTitle: string;
  onClose: () => void;
}

export function VideoExportModal({
  isOpen,
  artifactId,
  videoTitle,
  onClose,
}: VideoExportModalProps) {
  const [format, setFormat] = useState<VideoExportFormat>("MP4");
  const [resolution, setResolution] = useState<"720p" | "1080p" | "4K">("1080p");
  const [profile, setProfile] = useState<VideoRenderProfile>("STANDARD");
  const [fpsName, setFpsName] = useState<"24" | "29.97" | "30" | "60">("30");
  const [isExporting, setIsExporting] = useState(false);
  const [exported, setExported] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);

  if (!isOpen) return null;

  const getDimensions = () => {
    switch (resolution) {
      case "720p":
        return { width: 1280, height: 720 };
      case "4K":
        return { width: 3840, height: 2160 };
      default:
        return { width: 1920, height: 1080 };
    }
  };

  const getFrameRate = () => {
    switch (fpsName) {
      case "24":
        return FPS_24;
      case "29.97":
        return FPS_29_97;
      case "60":
        return FPS_60;
      default:
        return FPS_30;
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    setWarnings([]);

    const options: VideoExportOptions = {
      format,
      resolution: getDimensions(),
      frameRate: getFrameRate(),
      profile,
      includeAudio: true,
    };

    const res = await videoService.exportVideo(artifactId, options, "USER");
    setIsExporting(false);

    if (res.success && res.blob) {
      if (res.warnings && res.warnings.length > 0) {
        setWarnings(res.warnings);
      }

      const url = URL.createObjectURL(res.blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${videoTitle.toLowerCase().replace(/\s+/g, "-")}.${format.toLowerCase()}`;
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
      alert(`Falha na renderização de vídeo: ${res.error}`);
    }
  };

  const formats: VideoExportFormat[] = ["MP4", "WEBM"];
  const is4KSupported = videoRenderEngine.canExport(format, "4K");

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#121324] border border-[#222442] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-[#1e2038] flex items-center justify-between bg-[#15162a]">
          <h3 className="font-bold text-base text-white flex items-center gap-2">
            <Film size={16} className="text-blue-400" />
            Exportar Render de Vídeo
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded">
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs">
          {/* Format Selector with Honest Capability Check */}
          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
              Formato & Container
            </label>
            <div className="grid grid-cols-2 gap-2">
              {formats.map((fmt) => {
                const isSupported = videoRenderEngine.canExport(fmt);
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
                  >
                    {fmt} {fmt === "MP4" ? "(H.264 / AAC)" : "(VP8 / Opus)"}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Resolution Selector */}
          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
              Resolução de Render
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["720p", "1080p", "4K"] as const).map((res) => {
                const isAllowed = res === "4K" ? is4KSupported : true;
                const isSelected = resolution === res;

                return (
                  <button
                    key={res}
                    type="button"
                    disabled={!isAllowed}
                    onClick={() => setResolution(res)}
                    className={`p-2 rounded-lg border text-xs font-semibold ${
                      isSelected
                        ? "bg-blue-600/20 border-blue-500 text-blue-300 font-bold"
                        : "bg-[#0b0c16] border-[#1d1f36] text-slate-400 hover:text-white"
                    } ${!isAllowed ? "opacity-30 cursor-not-allowed" : ""}`}
                    title={!isAllowed ? "Resolução 4K desabilitada pelo limite de memória do runtime" : ""}
                  >
                    {res} {res === "1080p" ? "(FHD)" : res === "720p" ? "(HD)" : "(UHD)"}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Frame Rate */}
          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
              Taxa de Quadros (FPS)
            </label>
            <div className="grid grid-cols-4 gap-2 font-mono">
              {(["24", "29.97", "30", "60"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setFpsName(r)}
                  className={`p-1.5 rounded-lg border text-center text-xs ${
                    fpsName === r
                      ? "bg-blue-600/20 border-blue-500 text-blue-300 font-bold"
                      : "bg-[#0b0c16] border-[#1d1f36] text-slate-400 hover:text-white"
                  }`}
                >
                  {r} fps
                </button>
              ))}
            </div>
          </div>

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
                  Vídeo Renderizado!
                </>
              ) : isExporting ? (
                <span>Renderizando Frames...</span>
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

