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
import { StatePanel } from "@/components/ui/StatePanel";

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
        return <Type size={14} className="text-[var(--vly-warning)]" />;
      case "SHAPE":
        return <Square size={14} className="text-[var(--vly-info)]" />;
      case "IMAGE":
        return <ImageIcon size={14} className="text-[var(--vly-accent)]" />;
      case "GROUP":
        return <Folder size={14} className="text-[var(--vly-success)]" />;
      default:
        return <Layers size={14} className="text-[var(--vly-text-muted)]" />;
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
    <div className="flex h-full select-none flex-col bg-[var(--vly-surface)] text-xs text-[var(--vly-text-primary)]">
      <div className="flex items-center justify-between border-b border-[var(--vly-border-default)] px-3 py-2">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--vly-text-muted)]">
          <Layers size={13} className="text-[var(--vly-accent)]" />
          Camadas ({layers.length})
        </span>
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto p-1.5">
        {displayLayers.length === 0 ? (
          <StatePanel tone="empty" title="Canvas sem camadas" description="Adicione uma camada para começar a composição." />
        ) : (
          displayLayers.map((layer, index) => {
            const isSelected = layer.id === selectedLayerId;
            const isEditing = editingId === layer.id;

            return (
              <div
                key={layer.id}
                onClick={() => onSelectLayer(layer.id)}
                role="button"
                tabIndex={0}
                aria-current={isSelected ? "true" : undefined}
                aria-label={`Selecionar camada ${layer.name}`}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectLayer(layer.id);
                  }
                }}
                className={`group flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer transition ${
                  isSelected
                    ? "border border-[var(--vly-border-accent)] bg-[var(--vly-surface-active)] font-medium text-[var(--vly-text-primary)] shadow-sm"
                    : "border border-transparent text-[var(--vly-text-secondary)] hover:bg-[var(--vly-surface-hover)]"
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
                      className="vly-field flex-1 px-1.5 py-0.5 text-xs outline-none"
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
                      aria-label={`Confirmar nome de ${layer.name}`}
                      className="vly-interactive p-1 text-[var(--vly-text-muted)] hover:text-[var(--vly-text-primary)]"
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
                        className="vly-interactive p-1 text-[var(--vly-text-muted)] hover:text-[var(--vly-text-primary)] disabled:opacity-20"
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
                        className="vly-interactive p-1 text-[var(--vly-text-muted)] hover:text-[var(--vly-text-primary)] disabled:opacity-20"
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
                          layer.visible ? "text-[var(--vly-text-muted)] hover:text-[var(--vly-text-primary)]" : "text-[var(--vly-text-disabled)] hover:text-[var(--vly-text-muted)]"
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
                          layer.locked ? "text-[var(--vly-warning)]" : "text-[var(--vly-text-muted)] hover:text-[var(--vly-text-secondary)]"
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
                        className="vly-interactive hidden p-1 text-[var(--vly-text-muted)] hover:text-[var(--vly-accent)] group-hover:block"
                        title="Duplicar camada"
                      >
                        <Copy size={13} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteLayer(layer.id);
                        }}
                        className="vly-interactive hidden p-1 text-[var(--vly-text-muted)] hover:text-[var(--vly-danger)] group-hover:block"
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
