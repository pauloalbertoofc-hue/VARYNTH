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
    <div role="toolbar" aria-label="Ferramentas do Image Studio" className="flex items-center justify-between border-b border-[var(--vly-border-subtle)] bg-[var(--vly-surface)] px-4 py-2 text-xs text-[var(--vly-text-secondary)]">
      {/* Creation Tools */}
      <div className="flex items-center gap-1.5">
        <button
          aria-label="Ferramenta de seleção e movimento"
          aria-pressed="true"
          className="vly-interactive rounded-lg border border-[var(--vly-border-accent)] bg-[var(--vly-accent)]/20 p-1.5 text-[var(--vly-accent)] transition hover:bg-[var(--vly-accent)]/30"
          title="Ferramenta de Seleção / Mover"
        >
          <MousePointer size={14} />
        </button>

        <button
          onClick={onAddText}
          className="vly-interactive flex items-center gap-1.5 rounded-lg border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-raised)] px-2.5 py-1.5 text-[var(--vly-text-secondary)] transition hover:text-[var(--vly-text-primary)]"
          title="Adicionar Camada de Texto"
        >
          <Type size={13} className="text-[var(--vly-warning)]" />
          Texto
        </button>

        <button
          onClick={onAddRectangle}
          className="vly-interactive flex items-center gap-1.5 rounded-lg border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-raised)] px-2.5 py-1.5 text-[var(--vly-text-secondary)] transition hover:text-[var(--vly-text-primary)]"
          title="Adicionar Retângulo"
        >
          <Square size={13} className="text-[var(--vly-info)]" />
          Retângulo
        </button>

        <button
          onClick={onAddEllipse}
          className="vly-interactive flex items-center gap-1.5 rounded-lg border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-raised)] px-2.5 py-1.5 text-[var(--vly-text-secondary)] transition hover:text-[var(--vly-text-primary)]"
          title="Adicionar Elipse"
        >
          <Circle size={13} className="text-[var(--vly-info)]" />
          Elipse
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="vly-interactive flex items-center gap-1.5 rounded-lg border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-raised)] px-2.5 py-1.5 text-[var(--vly-text-secondary)] transition hover:text-[var(--vly-text-primary)]"
          title="Importar Imagem como Camada"
        >
          <ImagePlus size={13} className="text-[var(--vly-accent)]" />
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
        <div className="flex items-center rounded-lg border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-raised)] p-0.5">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            aria-label="Desfazer"
            className="vly-interactive p-1.5 text-[var(--vly-text-muted)] transition hover:text-[var(--vly-text-primary)] disabled:opacity-25"
            title="Desfazer (Ctrl+Z)"
          >
            <Undo2 size={13} />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            aria-label="Refazer"
            className="vly-interactive p-1.5 text-[var(--vly-text-muted)] transition hover:text-[var(--vly-text-primary)] disabled:opacity-25"
            title="Refazer (Ctrl+Y)"
          >
            <Redo2 size={13} />
          </button>
        </div>

        <button
          onClick={onAskAthena}
          className="vly-interactive flex items-center gap-1.5 rounded-lg border border-[var(--vly-border-warning)] bg-[var(--vly-warning)]/10 px-2.5 py-1.5 text-xs text-[var(--vly-warning)] transition hover:bg-[var(--vly-warning)]/20"
          title="Pedir assistência visual à Athena"
        >
          <Sparkles size={12} />
          Athena Visual
        </button>
      </div>
    </div>
  );
}

