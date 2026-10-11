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
  onImported?: () => void;
}

export function ImageExportModal({
  isOpen,
  artifactId,
  imageTitle,
  onClose,
  onImported,
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

  const handleExportUniversalDocument = () => {
    const visualDocument = imageService.exportVisualDocument(artifactId);
    if (!visualDocument) {
      alert("Não foi possível ler o documento visual.");
      return;
    }
    const blob = new Blob([JSON.stringify(visualDocument, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${imageTitle.toLowerCase().replace(/\s+/g, "-")}.varynth-visual.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportUniversalDocument = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text());
      const result = imageService.importVisualDocument(parsed, "USER");
      if (!result.success) {
        alert(`Falha ao importar documento visual: ${result.error}`);
        return;
      }
      onImported?.();
      onClose();
    } catch {
      alert("Arquivo de documento visual inválido.");
    }
  };

  const formats: ImageExportFormat[] = ["PNG", "JPEG", "WEBP"];

  return (
    <div className="fixed inset-0 z-50 bg-[var(--vly-world)]/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[var(--vly-surface-floating)] border border-[var(--vly-border-strong)] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-[var(--vly-border-subtle)] flex items-center justify-between bg-[var(--vly-surface-raised)]">
          <h3 className="font-bold text-base text-[var(--vly-text-primary)] flex items-center gap-2">
            <Download size={16} className="text-[var(--vly-info)]" />
            Exportar Composição Visual
          </h3>
          <button onClick={onClose} className="p-1 text-[var(--vly-text-muted)] hover:text-[var(--vly-text-primary)] rounded">
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs">
          {/* Format Selector */}
          <div>
            <label className="text-[11px] font-semibold text-[var(--vly-text-secondary)] uppercase tracking-wider block mb-2">
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
                        ? "bg-[var(--vly-info)] border-[var(--vly-info)] text-[var(--vly-text-primary)]"
                        : "bg-[var(--vly-world)] border-[var(--vly-border-subtle)] text-[var(--vly-text-secondary)] hover:border-[var(--vly-border-strong)]"
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
            <label className="text-[11px] font-semibold text-[var(--vly-text-secondary)] uppercase tracking-wider block mb-2">
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
                      ? "bg-[var(--vly-info)]/20 border-[var(--vly-info)] text-[var(--vly-info)] font-bold"
                      : "bg-[var(--vly-world)] border-[var(--vly-border-subtle)] text-[var(--vly-text-secondary)] hover:text-[var(--vly-text-primary)]"
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
              <div className="flex items-center justify-between text-[var(--vly-text-secondary)]">
                <span>Qualidade da Compressão</span>
                <span className="font-mono text-[var(--vly-text-primary)]">{Math.round(quality * 100)}%</span>
              </div>
              <input
                type="range"
                min="20"
                max="100"
                value={Math.round(quality * 100)}
                onChange={(e) => setQuality(parseInt(e.target.value) / 100)}
                className="w-full accent-[var(--vly-accent)] h-1.5 bg-[var(--vly-surface-raised)] rounded-lg cursor-pointer"
              />
            </div>
          )}

          {/* Transparent Background (PNG / WEBP) */}
          {(format === "PNG" || format === "WEBP") && (
            <label className="flex items-center gap-2 pt-2 cursor-pointer text-[var(--vly-text-secondary)]">
              <input
                type="checkbox"
                checked={transparent}
                onChange={(e) => setTransparent(e.target.checked)}
                className="rounded accent-[var(--vly-accent)]"
              />
              <span>Fundo Transparente (remover cor do canvas)</span>
            </label>
          )}

          {/* Actions */}
          <div className="pt-4 border-t border-[var(--vly-border-subtle)] flex items-center justify-end gap-2">
            <button
              onClick={handleExportUniversalDocument}
              className="mr-auto px-3 py-2 border border-[var(--vly-border-strong)] text-[var(--vly-text-secondary)] hover:text-[var(--vly-text-primary)] rounded-lg text-xs font-medium transition"
              title="Exporta o documento editável no contrato Visual Core"
            >
              Documento Visual
            </button>
            <label className="px-3 py-2 border border-[var(--vly-border-strong)] text-[var(--vly-text-secondary)] hover:text-[var(--vly-text-primary)] rounded-lg text-xs font-medium transition cursor-pointer">
              Importar Documento
              <input
                type="file"
                accept="application/json,.json,.varynth-visual.json"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void handleImportUniversalDocument(file);
                  event.currentTarget.value = "";
                }}
              />
            </label>
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

