"use client";

import React, { useRef } from "react";
import {
  MousePointer,
  Type,
  Square,
  Circle,
  ImagePlus,
  Undo2,
  Redo2,
  Sparkles,
} from "lucide-react";

interface ImageToolbarProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onAddText: () => void;
  onAddRectangle: () => void;
  onAddEllipse: () => void;
  onImportImageLayer: (file: File) => void;
  onAskAthena: () => void;
}

export function ImageToolbar({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onAddText,
  onAddRectangle,
  onAddEllipse,
  onImportImageLayer,
  onAskAthena,
}: ImageToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-[#0e0f1c] border-b border-[#1c1d32] text-xs text-slate-300">
      {/* Creation Tools */}
      <div className="flex items-center gap-1.5">
        <button
          className="p-1.5 bg-blue-600/20 text-blue-300 border border-blue-500/30 rounded-lg hover:bg-blue-600/30 transition"
          title="Ferramenta de Seleção / Mover"
        >
          <MousePointer size={14} />
        </button>

        <button
          onClick={onAddText}
          className="px-2.5 py-1.5 bg-[#141528] hover:bg-[#1f213a] text-slate-300 hover:text-white rounded-lg flex items-center gap-1.5 transition border border-[#232544]"
          title="Adicionar Camada de Texto"
        >
          <Type size={13} className="text-amber-400" />
          Texto
        </button>

        <button
          onClick={onAddRectangle}
          className="px-2.5 py-1.5 bg-[#141528] hover:bg-[#1f213a] text-slate-300 hover:text-white rounded-lg flex items-center gap-1.5 transition border border-[#232544]"
          title="Adicionar Retângulo"
        >
          <Square size={13} className="text-purple-400" />
          Retângulo
        </button>

        <button
          onClick={onAddEllipse}
          className="px-2.5 py-1.5 bg-[#141528] hover:bg-[#1f213a] text-slate-300 hover:text-white rounded-lg flex items-center gap-1.5 transition border border-[#232544]"
          title="Adicionar Elipse"
        >
          <Circle size={13} className="text-purple-400" />
          Elipse
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-2.5 py-1.5 bg-[#141528] hover:bg-[#1f213a] text-slate-300 hover:text-white rounded-lg flex items-center gap-1.5 transition border border-[#232544]"
          title="Importar Imagem como Camada"
        >
          <ImagePlus size={13} className="text-blue-400" />
          Importar Imagem
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              onImportImageLayer(file);
              e.target.value = "";
            }
          }}
        />
      </div>

      {/* Undo / Redo & Athena Assistant */}
      <div className="flex items-center gap-2">
        <div className="flex items-center bg-[#141528] p-0.5 rounded-lg border border-[#232544]">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="p-1.5 text-slate-400 hover:text-white disabled:opacity-25 transition"
            title="Desfazer (Ctrl+Z)"
          >
            <Undo2 size={13} />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="p-1.5 text-slate-400 hover:text-white disabled:opacity-25 transition"
            title="Refazer (Ctrl+Y)"
          >
            <Redo2 size={13} />
          </button>
        </div>

        <button
          onClick={onAskAthena}
          className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs flex items-center gap-1.5 transition"
          title="Pedir assistência visual à Athena"
        >
          <Sparkles size={12} />
          Athena Visual
        </button>
      </div>
    </div>
  );
}

