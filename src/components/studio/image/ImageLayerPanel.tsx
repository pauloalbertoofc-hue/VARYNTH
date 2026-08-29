"use client";

import React, { useState } from "react";
import { ImageLayer, ImageLayerType } from "@/lib/studio/image/types";
import {
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  Type,
  Square,
  Image as ImageIcon,
  Folder,
  Layers,
  Edit2,
  Check,
} from "lucide-react";

interface ImageLayerPanelProps {
  layers: ImageLayer[];
  selectedLayerId?: string;
  onSelectLayer: (layerId: string) => void;
  onToggleVisibility: (layerId: string) => void;
  onToggleLock: (layerId: string) => void;
  onDeleteLayer: (layerId: string) => void;
  onDuplicateLayer: (layerId: string) => void;
  onReorderLayer: (layerId: string, direction: "UP" | "DOWN") => void;
  onRenameLayer: (layerId: string, newName: string) => void;
}

export function ImageLayerPanel({
  layers,
  selectedLayerId,
  onSelectLayer,
  onToggleVisibility,
  onToggleLock,
  onDeleteLayer,
  onDuplicateLayer,
  onReorderLayer,
  onRenameLayer,
}: ImageLayerPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const getLayerIcon = (type: ImageLayerType) => {
    switch (type) {
      case "TEXT":
        return <Type size={14} className="text-amber-400" />;
      case "SHAPE":
        return <Square size={14} className="text-purple-400" />;
      case "IMAGE":
        return <ImageIcon size={14} className="text-blue-400" />;
      case "GROUP":
        return <Folder size={14} className="text-emerald-400" />;
      default:
        return <Layers size={14} className="text-slate-400" />;
    }
  };

  const handleStartRename = (layer: ImageLayer, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(layer.id);
    setEditingName(layer.name);
  };

  const handleConfirmRename = (layerId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (editingName.trim()) {
      onRenameLayer(layerId, editingName.trim());
    }
    setEditingId(null);
  };

  // Reverse list so topmost layer appears at the top of the panel
  const displayLayers = [...layers].reverse();

  return (
    <div className="flex flex-col h-full bg-[#0d0e1a] text-slate-300 text-xs select-none">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#1c1d30]">
        <span className="font-semibold uppercase tracking-wider text-[11px] text-slate-400 flex items-center gap-1.5">
          <Layers size={13} className="text-blue-400" />
          Camadas ({layers.length})
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
        {displayLayers.length === 0 ? (
          <div className="p-6 text-center text-slate-600 italic">Nenhuma camada no canvas.</div>
        ) : (
          displayLayers.map((layer, index) => {
            const isSelected = layer.id === selectedLayerId;
            const isEditing = editingId === layer.id;

            return (
              <div
                key={layer.id}
                onClick={() => onSelectLayer(layer.id)}
                className={`group flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer transition ${
                  isSelected
                    ? "bg-blue-600/20 border border-blue-500/40 text-white font-medium shadow-sm"
                    : "hover:bg-[#141628] border border-transparent text-slate-300"
                }`}
              >
                {/* Left: Icon & Title */}
                <div className="flex items-center gap-2 overflow-hidden flex-1">
                  {getLayerIcon(layer.type)}

                  {isEditing ? (
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleConfirmRename(layer.id, e as any);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      autoFocus
                      className="px-1.5 py-0.5 bg-[#090a14] border border-blue-500 rounded text-xs text-white outline-none flex-1"
                    />
                  ) : (
                    <span className="truncate text-xs">{layer.name}</span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  {isEditing ? (
                    <button
                      onClick={(e) => handleConfirmRename(layer.id, e)}
                      className="p-1 hover:text-white text-slate-400"
                    >
                      <Check size={13} />
                    </button>
                  ) : (
                    <>
                      {/* Reorder Buttons */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onReorderLayer(layer.id, "UP");
                        }}
                        disabled={index === 0}
                        className="p-1 text-slate-500 hover:text-white disabled:opacity-20"
                        title="Mover para cima"
                      >
                        <ChevronUp size={13} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onReorderLayer(layer.id, "DOWN");
                        }}
                        disabled={index === displayLayers.length - 1}
                        className="p-1 text-slate-500 hover:text-white disabled:opacity-20"
                        title="Mover para baixo"
                      >
                        <ChevronDown size={13} />
                      </button>

                      {/* Visibility */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleVisibility(layer.id);
                        }}
                        className={`p-1 transition ${
                          layer.visible ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-400"
                        }`}
                        title={layer.visible ? "Ocultar camada" : "Mostrar camada"}
                      >
                        {layer.visible ? <Eye size={13} /> : <EyeOff size={13} />}
                      </button>

                      {/* Lock */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleLock(layer.id);
                        }}
                        className={`p-1 transition ${
                          layer.locked ? "text-amber-400" : "text-slate-500 hover:text-slate-300"
                        }`}
                        title={layer.locked ? "Desbloquear camada" : "Bloquear camada"}
                      >
                        {layer.locked ? <Lock size={13} /> : <Unlock size={13} />}
                      </button>

                      {/* Duplicate & Delete */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDuplicateLayer(layer.id);
                        }}
                        className="p-1 text-slate-500 hover:text-blue-400 hidden group-hover:block"
                        title="Duplicar camada"
                      >
                        <Copy size={13} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteLayer(layer.id);
                        }}
                        className="p-1 text-slate-500 hover:text-red-400 hidden group-hover:block"
                        title="Excluir camada"
                      >
                        <Trash2 size={13} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

