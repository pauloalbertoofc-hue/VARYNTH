"use client";

import React, { useState } from "react";
import { ImageExportFormat, ImageExportOptions } from "@/lib/studio/image/types";
import { imageService } from "@/lib/studio/image/image-service";
import { imageRenderEngine } from "@/lib/studio/image/image-render-engine";
import { Download, Check, X, Sliders, Image as ImageIcon } from "lucide-react";

interface ImageExportModalProps {
  isOpen: boolean;
  artifactId: string;
  imageTitle: string;
  onClose: () => void;
}

export function ImageExportModal({
  isOpen,
  artifactId,
  imageTitle,
  onClose,
}: ImageExportModalProps) {
  const [format, setFormat] = useState<ImageExportFormat>("PNG");
  const [quality, setQuality] = useState(0.92);
  const [scale, setScale] = useState(1);
  const [transparent, setTransparent] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exported, setExported] = useState(false);

  if (!isOpen) return null;

  const handleExport = async () => {
    setIsExporting(true);
    const options: ImageExportOptions = {
      format,
      quality,
      scale,
      transparentBackground: format === "PNG" || format === "WEBP" ? transparent : false,
    };

    const res = await imageService.exportImage(artifactId, options, "USER");
    setIsExporting(false);

    if (res.success && res.dataUrl) {
      const a = document.createElement("a");
      a.href = res.dataUrl;
      a.download = `${imageTitle.toLowerCase().replace(/\s+/g, "-")}.${format.toLowerCase()}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setExported(true);
      setTimeout(() => {
        setExported(false);
        onClose();
      }, 1200);
    } else {
      alert(`Falha na exportação: ${res.error}`);
    }
  };

  const formats: ImageExportFormat[] = ["PNG", "JPEG", "WEBP"];

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#121324] border border-[#222442] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-[#1e2038] flex items-center justify-between bg-[#15162a]">
          <h3 className="font-bold text-base text-white flex items-center gap-2">
            <Download size={16} className="text-blue-400" />
            Exportar Composição Visual
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded">
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs">
          {/* Format Selector */}
          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
              Formato de Saída
            </label>
            <div className="grid grid-cols-3 gap-2">
              {formats.map((fmt) => {
                const isSupported = imageRenderEngine.canExport(fmt);
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
                    {fmt}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Scale Resolution */}
          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
              Escala de Resolução
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 4].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setScale(s)}
                  className={`p-2 rounded-lg border font-mono text-xs ${
                    scale === s
                      ? "bg-blue-600/20 border-blue-500 text-blue-300 font-bold"
                      : "bg-[#0b0c16] border-[#1d1f36] text-slate-400 hover:text-white"
                  }`}
                >
                  {s}x ({s === 1 ? "Padrão" : s === 2 ? "2K/HD" : "4K Ultra"})
                </button>
              ))}
            </div>
          </div>

          {/* Quality Slider (JPEG & WEBP) */}
          {(format === "JPEG" || format === "WEBP") && (
            <div className="space-y-1 pt-1">
              <div className="flex items-center justify-between text-slate-400">
                <span>Qualidade da Compressão</span>
                <span className="font-mono text-white">{Math.round(quality * 100)}%</span>
              </div>
              <input
                type="range"
                min="20"
                max="100"
                value={Math.round(quality * 100)}
                onChange={(e) => setQuality(parseInt(e.target.value) / 100)}
                className="w-full accent-blue-500 h-1.5 bg-[#1a1c32] rounded-lg cursor-pointer"
              />
            </div>
          )}

          {/* Transparent Background (PNG / WEBP) */}
          {(format === "PNG" || format === "WEBP") && (
            <label className="flex items-center gap-2 pt-2 cursor-pointer text-slate-300">
              <input
                type="checkbox"
                checked={transparent}
                onChange={(e) => setTransparent(e.target.checked)}
                className="rounded accent-blue-500"
              />
              <span>Fundo Transparente (remover cor do canvas)</span>
            </label>
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
                  Baixado com Sucesso!
                </>
              ) : isExporting ? (
                <span>Renderizando...</span>
              ) : (
                <>
                  <Download size={14} />
                  Exportar Imagem
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

