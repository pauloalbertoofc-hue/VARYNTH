"use client";

import React from "react";
import { ImageLayer } from "@/lib/studio/image/types";
import { Sliders, Type, Square, Move, RotateCw, Sun } from "lucide-react";

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
      <div className="h-full flex items-center justify-center p-6 text-center text-slate-500 text-xs italic bg-[#0b0c16]">
        Selecione uma camada no canvas para visualizar e editar suas propriedades.
      </div>
    );
  }

  const handleTransformChange = (key: keyof ImageLayer["transform"], val: number) => {
    onUpdateLayer(layer.id, {
      transform: { ...layer.transform, [key]: val },
    });
  };

  return (
    <div className="h-full flex flex-col bg-[#0b0c16] text-slate-300 text-xs overflow-y-auto p-4 space-y-5 select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#1c1d32]">
        <div className="font-semibold text-white truncate">{layer.name}</div>
        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/20">
          {layer.type}
        </span>
      </div>

      {/* Transform Section */}
      <div className="space-y-3">
        <span className="text-[11px] font-semibold uppercase text-slate-400 flex items-center gap-1.5">
          <Move size={13} className="text-blue-400" />
          Posição & Dimensão
        </span>

        <div className="grid grid-cols-2 gap-2 font-mono">
          <div className="bg-[#121324] border border-[#1f213a] rounded-lg p-2 flex items-center justify-between">
            <span className="text-slate-500 text-[10px]">X:</span>
            <input
              type="number"
              value={Math.round(layer.transform.x)}
              onChange={(e) => handleTransformChange("x", parseInt(e.target.value) || 0)}
              className="w-16 bg-transparent text-right text-white text-xs outline-none"
            />
          </div>

          <div className="bg-[#121324] border border-[#1f213a] rounded-lg p-2 flex items-center justify-between">
            <span className="text-slate-500 text-[10px]">Y:</span>
            <input
              type="number"
              value={Math.round(layer.transform.y)}
              onChange={(e) => handleTransformChange("y", parseInt(e.target.value) || 0)}
              className="w-16 bg-transparent text-right text-white text-xs outline-none"
            />
          </div>

          <div className="bg-[#121324] border border-[#1f213a] rounded-lg p-2 flex items-center justify-between">
            <span className="text-slate-500 text-[10px]">L:</span>
            <input
              type="number"
              value={Math.round(layer.transform.width)}
              onChange={(e) => handleTransformChange("width", Math.max(10, parseInt(e.target.value) || 10))}
              className="w-16 bg-transparent text-right text-white text-xs outline-none"
            />
          </div>

          <div className="bg-[#121324] border border-[#1f213a] rounded-lg p-2 flex items-center justify-between">
            <span className="text-slate-500 text-[10px]">A:</span>
            <input
              type="number"
              value={Math.round(layer.transform.height)}
              onChange={(e) => handleTransformChange("height", Math.max(10, parseInt(e.target.value) || 10))}
              className="w-16 bg-transparent text-right text-white text-xs outline-none"
            />
          </div>
        </div>

        {/* Rotation & Opacity */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <RotateCw size={12} /> Rotação
            </span>
            <span className="font-mono text-white">{Math.round(layer.transform.rotation || 0)}°</span>
          </div>
          <input
            type="range"
            min="0"
            max="360"
            value={layer.transform.rotation || 0}
            onChange={(e) => handleTransformChange("rotation", parseInt(e.target.value) || 0)}
            className="w-full accent-blue-500 h-1.5 bg-[#1a1c32] rounded-lg cursor-pointer"
          />

          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2">
            <span>Opacidade</span>
            <span className="font-mono text-white">{Math.round((layer.opacity ?? 1) * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={Math.round((layer.opacity ?? 1) * 100)}
            onChange={(e) => onUpdateLayer(layer.id, { opacity: (parseInt(e.target.value) || 0) / 100 })}
            className="w-full accent-blue-500 h-1.5 bg-[#1a1c32] rounded-lg cursor-pointer"
          />
        </div>
      </div>

      {/* TEXT Properties */}
      {layer.type === "TEXT" && (
        <div className="space-y-3 pt-3 border-t border-[#1c1d32]">
          <span className="text-[11px] font-semibold uppercase text-amber-400 flex items-center gap-1.5">
            <Type size={13} />
            Texto & Tipografia
          </span>

          <textarea
            value={layer.textContent || ""}
            onChange={(e) => onUpdateLayer(layer.id, { textContent: e.target.value })}
            rows={2}
            className="w-full p-2 bg-[#121324] border border-[#1f213a] rounded-lg text-xs text-white outline-none focus:border-blue-500"
          />

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-[#121324] border border-[#1f213a] rounded-lg p-2 flex items-center justify-between">
              <span className="text-slate-500 text-[10px]">Tamanho:</span>
              <input
                type="number"
                value={layer.textStyle?.fontSize || 32}
                onChange={(e) =>
                  onUpdateLayer(layer.id, {
                    textStyle: { ...layer.textStyle!, fontSize: parseInt(e.target.value) || 16 },
                  })
                }
                className="w-12 bg-transparent text-right text-white text-xs outline-none"
              />
            </div>

            <div className="bg-[#121324] border border-[#1f213a] rounded-lg p-2 flex items-center justify-between">
              <span className="text-slate-500 text-[10px]">Cor:</span>
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
        <div className="space-y-3 pt-3 border-t border-[#1c1d32]">
          <span className="text-[11px] font-semibold uppercase text-purple-400 flex items-center gap-1.5">
            <Square size={13} />
            Estilo da Forma
          </span>

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-[#121324] border border-[#1f213a] rounded-lg p-2 flex items-center justify-between">
              <span className="text-slate-500 text-[10px]">Preenchimento:</span>
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

            <div className="bg-[#121324] border border-[#1f213a] rounded-lg p-2 flex items-center justify-between">
              <span className="text-slate-500 text-[10px]">Borda:</span>
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
      <div className="space-y-3 pt-3 border-t border-[#1c1d32]">
        <span className="text-[11px] font-semibold uppercase text-slate-400 flex items-center gap-1.5">
          <Sun size={13} className="text-amber-400" />
          Ajustes Não-Destrutivos
        </span>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-[10px] text-slate-400">
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
            className="w-full accent-blue-500 h-1.5 bg-[#1a1c32] rounded-lg cursor-pointer"
          />

          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
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
            className="w-full accent-blue-500 h-1.5 bg-[#1a1c32] rounded-lg cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}

