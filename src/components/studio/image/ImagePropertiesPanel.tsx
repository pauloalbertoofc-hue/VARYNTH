"use client";

import React from "react";
import { ImageLayer } from "@/lib/studio/image/types";
import { Sliders, Type, Square, Move, RotateCw, Sun } from "lucide-react";
import { StatePanel } from "@/components/ui/StatePanel";

interface ImagePropertiesPanelProps {
  layer?: ImageLayer;
  onUpdateLayer: (layerId: string, updates: Partial<ImageLayer>) => void;
}

export function ImagePropertiesPanel({
  layer,
  onUpdateLayer,
}: ImagePropertiesPanelProps) {
  if (!layer) {
    return (
      <StatePanel tone="empty" title="Nenhuma camada selecionada" description="Selecione uma camada no canvas para visualizar e editar suas propriedades." className="h-full rounded-none border-0 bg-[var(--vly-surface)]" />
    );
  }

  const handleTransformChange = (key: keyof ImageLayer["transform"], val: number) => {
    onUpdateLayer(layer.id, {
      transform: { ...layer.transform, [key]: val },
    });
  };

  return (
    <div className="flex h-full select-none flex-col space-y-5 overflow-y-auto bg-[var(--vly-surface)] p-4 text-xs text-[var(--vly-text-primary)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--vly-border-default)] pb-3">
        <div className="truncate font-semibold text-[var(--vly-text-primary)]">{layer.name}</div>
        <span className="rounded border border-[var(--vly-border-accent)] bg-[var(--vly-accent)]/15 px-2 py-0.5 font-mono text-[10px] uppercase text-[var(--vly-accent)]">
          {layer.type}
        </span>
      </div>

      {/* Transform Section */}
      <div className="space-y-3">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase text-[var(--vly-text-muted)]">
          <Move size={13} className="text-[var(--vly-accent)]" />
          Posição & Dimensão
        </span>

        <div className="grid grid-cols-2 gap-2 font-mono">
          <div className="flex items-center justify-between rounded-lg border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-raised)] p-2">
            <span className="text-[10px] text-[var(--vly-text-muted)]">X:</span>
            <input
              type="number"
              value={Math.round(layer.transform.x)}
              onChange={(e) => handleTransformChange("x", parseInt(e.target.value) || 0)}
              className="vly-field w-16 border-0 bg-transparent text-right text-xs outline-none"
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-raised)] p-2">
            <span className="text-[10px] text-[var(--vly-text-muted)]">Y:</span>
            <input
              type="number"
              value={Math.round(layer.transform.y)}
              onChange={(e) => handleTransformChange("y", parseInt(e.target.value) || 0)}
              className="vly-field w-16 border-0 bg-transparent text-right text-xs outline-none"
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-raised)] p-2">
            <span className="text-[10px] text-[var(--vly-text-muted)]">L:</span>
            <input
              type="number"
              value={Math.round(layer.transform.width)}
              onChange={(e) => handleTransformChange("width", Math.max(10, parseInt(e.target.value) || 10))}
              className="vly-field w-16 border-0 bg-transparent text-right text-xs outline-none"
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-raised)] p-2">
            <span className="text-[10px] text-[var(--vly-text-muted)]">A:</span>
            <input
              type="number"
              value={Math.round(layer.transform.height)}
              onChange={(e) => handleTransformChange("height", Math.max(10, parseInt(e.target.value) || 10))}
              className="vly-field w-16 border-0 bg-transparent text-right text-xs outline-none"
            />
          </div>
        </div>

        {/* Rotation & Opacity */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-[11px] text-[var(--vly-text-muted)]">
            <span className="flex items-center gap-1">
              <RotateCw size={12} /> Rotação
            </span>
            <span className="font-mono text-[var(--vly-text-primary)]">{Math.round(layer.transform.rotation || 0)}°</span>
          </div>
          <input
            type="range"
            min="0"
            max="360"
            value={layer.transform.rotation || 0}
            onChange={(e) => handleTransformChange("rotation", parseInt(e.target.value) || 0)}
            aria-label="Rotação da camada"
            className="h-1.5 w-full cursor-pointer rounded-lg bg-[var(--vly-surface-raised)] accent-[var(--vly-accent)]"
          />

          <div className="flex items-center justify-between pt-2 text-[11px] text-[var(--vly-text-muted)]">
            <span>Opacidade</span>
            <span className="font-mono text-[var(--vly-text-primary)]">{Math.round((layer.opacity ?? 1) * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={Math.round((layer.opacity ?? 1) * 100)}
            onChange={(e) => onUpdateLayer(layer.id, { opacity: (parseInt(e.target.value) || 0) / 100 })}
            aria-label="Opacidade da camada"
            className="h-1.5 w-full cursor-pointer rounded-lg bg-[var(--vly-surface-raised)] accent-[var(--vly-accent)]"
          />
        </div>
      </div>

      {/* TEXT Properties */}
      {layer.type === "TEXT" && (
        <div className="space-y-3 border-t border-[var(--vly-border-subtle)] pt-3">
          <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase text-[var(--vly-warning)]">
            <Type size={13} />
            Texto & Tipografia
          </span>

          <textarea
            value={layer.textContent || ""}
            onChange={(e) => onUpdateLayer(layer.id, { textContent: e.target.value })}
            rows={2}
            className="vly-field w-full p-2 text-xs outline-none"
          />

          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center justify-between rounded-lg border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-raised)] p-2">
              <span className="text-[10px] text-[var(--vly-text-muted)]">Tamanho:</span>
              <input
                type="number"
                value={layer.textStyle?.fontSize || 32}
                onChange={(e) =>
                  onUpdateLayer(layer.id, {
                    textStyle: { ...layer.textStyle!, fontSize: parseInt(e.target.value) || 16 },
                  })
                }
                className="vly-field w-12 border-0 bg-transparent text-right text-xs outline-none"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-raised)] p-2">
              <span className="text-[10px] text-[var(--vly-text-muted)]">Cor:</span>
              <input
                type="color"
                value={layer.textStyle?.fill || "#ffffff"}
                onChange={(e) =>
                  onUpdateLayer(layer.id, {
                    textStyle: { ...layer.textStyle!, fill: e.target.value },
                  })
                }
                className="w-6 h-6 rounded border-none bg-transparent cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* SHAPE Properties */}
      {layer.type === "SHAPE" && (
        <div className="space-y-3 border-t border-[var(--vly-border-subtle)] pt-3">
          <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase text-[var(--vly-info)]">
            <Square size={13} />
            Estilo da Forma
          </span>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center justify-between rounded-lg border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-raised)] p-2">
              <span className="text-[10px] text-[var(--vly-text-muted)]">Preenchimento:</span>
              <input
                type="color"
                value={layer.shapeStyle?.fill || "#2563eb"}
                onChange={(e) =>
                  onUpdateLayer(layer.id, {
                    shapeStyle: { ...layer.shapeStyle!, fill: e.target.value },
                  })
                }
                className="w-6 h-6 rounded border-none bg-transparent cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-raised)] p-2">
              <span className="text-[10px] text-[var(--vly-text-muted)]">Borda:</span>
              <input
                type="color"
                value={layer.shapeStyle?.stroke || "#3b82f6"}
                onChange={(e) =>
                  onUpdateLayer(layer.id, {
                    shapeStyle: { ...layer.shapeStyle!, stroke: e.target.value },
                  })
                }
                className="w-6 h-6 rounded border-none bg-transparent cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* Non-Destructive Adjustments */}
      <div className="space-y-3 border-t border-[var(--vly-border-subtle)] pt-3">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase text-[var(--vly-text-muted)]">
          <Sun size={13} className="text-[var(--vly-warning)]" />
          Ajustes Não-Destrutivos
        </span>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-[10px] text-[var(--vly-text-muted)]">
            <span>Brilho</span>
            <span className="font-mono">{layer.adjustments?.brightness || 0}</span>
          </div>
          <input
            type="range"
            min="-100"
            max="100"
            value={layer.adjustments?.brightness || 0}
            onChange={(e) =>
              onUpdateLayer(layer.id, {
                adjustments: { ...layer.adjustments, brightness: parseInt(e.target.value) || 0 },
              })
            }
            aria-label="Brilho da camada"
            className="h-1.5 w-full cursor-pointer rounded-lg bg-[var(--vly-surface-raised)] accent-[var(--vly-accent)]"
          />

          <div className="flex items-center justify-between pt-1 text-[10px] text-[var(--vly-text-muted)]">
            <span>Contraste</span>
            <span className="font-mono">{layer.adjustments?.contrast || 0}</span>
          </div>
          <input
            type="range"
            min="-100"
            max="100"
            value={layer.adjustments?.contrast || 0}
            onChange={(e) =>
              onUpdateLayer(layer.id, {
                adjustments: { ...layer.adjustments, contrast: parseInt(e.target.value) || 0 },
              })
            }
            aria-label="Contraste da camada"
            className="h-1.5 w-full cursor-pointer rounded-lg bg-[var(--vly-surface-raised)] accent-[var(--vly-accent)]"
          />
        </div>
      </div>
    </div>
  );
}
