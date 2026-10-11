"use client";

import React, { useState } from "react";
import { IMAGE_TEMPLATES, ImageTemplate } from "@/lib/studio/image/image-templates";
import { Plus, X, Image as ImageIcon, Layout, Layers, Monitor, Sliders } from "lucide-react";

interface ImageTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (templateId?: string, name?: string, customCanvas?: { width: number; height: number; background: string }) => void;
}

export function ImageTemplatesModal({
  isOpen,
  onClose,
  onSelectTemplate,
}: ImageTemplatesModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<ImageTemplate>(IMAGE_TEMPLATES[0]);
  const [name, setName] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [customWidth, setCustomWidth] = useState(1920);
  const [customHeight, setCustomHeight] = useState(1080);
  const [customBg, setCustomBg] = useState("#0b0c16");

  if (!isOpen) return null;

  const handleConfirm = () => {
    const finalName = name.trim() || (isCustom ? "Composição Personalizada" : selectedTemplate.name);
    if (isCustom) {
      onSelectTemplate(undefined, finalName, {
        width: customWidth,
        height: customHeight,
        background: customBg,
      });
    } else {
      onSelectTemplate(selectedTemplate.id, finalName);
    }
    setName("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--vly-world)]/75 p-4 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" aria-labelledby="image-template-title" className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-floating)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--vly-border-subtle)] bg-[var(--vly-surface)] px-6 py-4">
          <div className="flex items-center gap-2">
            <ImageIcon size={18} className="text-[var(--vly-accent)]" />
            <h3 id="image-template-title" className="text-base font-bold text-[var(--vly-text-primary)]">Criar Nova Imagem no Image Studio</h3>
          </div>
          <button onClick={onClose} aria-label="Fechar criação de imagem" className="vly-interactive rounded p-1 text-[var(--vly-text-muted)] hover:text-[var(--vly-text-primary)]">
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-6 overflow-y-auto p-6 text-xs text-[var(--vly-text-secondary)]">
          <div>
            <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-[var(--vly-text-muted)]">
              Nome da Composição
            </label>
            <input
              type="text"
              placeholder="Ex: Capa do Tratado de Arquitetura"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="vly-field w-full px-4 py-2.5 text-sm"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-[var(--vly-text-muted)]">
                Selecione o Modelo ou Formato
              </label>
              <button
                onClick={() => setIsCustom(!isCustom)}
                className="vly-interactive flex items-center gap-1 text-xs font-semibold text-[var(--vly-accent)] hover:opacity-80"
              >
                <Sliders size={13} />
                {isCustom ? "Usar Modelos Prontos" : "Dimensão Personalizada"}
              </button>
            </div>

            {isCustom ? (
              <div className="space-y-4 rounded-xl border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-raised)] p-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="mb-1 block text-[var(--vly-text-muted)]">Largura (px):</span>
                    <input
                      type="number"
                      value={customWidth}
                      onChange={(e) => setCustomWidth(parseInt(e.target.value) || 100)}
                      className="vly-field w-full px-3 py-2 font-mono"
                    />
                  </div>
                  <div>
                    <span className="mb-1 block text-[var(--vly-text-muted)]">Altura (px):</span>
                    <input
                      type="number"
                      value={customHeight}
                      onChange={(e) => setCustomHeight(parseInt(e.target.value) || 100)}
                      className="vly-field w-full px-3 py-2 font-mono"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[var(--vly-text-muted)]">Cor de Fundo:</span>
                  <input
                    type="color"
                    value={customBg}
                    onChange={(e) => setCustomBg(e.target.value)}
                    className="w-8 h-8 rounded border-none bg-transparent cursor-pointer"
                  />
                  <span className="font-mono text-[var(--vly-text-muted)]">{customBg}</span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {IMAGE_TEMPLATES.map((tmpl) => {
                  const isSelected = selectedTemplate.id === tmpl.id;
                  return (
                    <div
                      key={tmpl.id}
                      onClick={() => setSelectedTemplate(tmpl)}
                      className={`p-4 rounded-xl border cursor-pointer transition flex flex-col justify-between gap-3 ${
                        isSelected
                          ? "bg-[var(--vly-accent)]/15 border-[var(--vly-border-accent)] text-[var(--vly-text-primary)] shadow-lg"
                          : "bg-[var(--vly-surface-raised)] border-[var(--vly-border-subtle)] text-[var(--vly-text-secondary)] hover:border-[var(--vly-border-accent)]"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-[var(--vly-text-primary)]">{tmpl.name}</span>
                          <span className="rounded bg-[var(--vly-surface)] px-2 py-0.5 font-mono text-[10px] text-[var(--vly-accent)]">
                            {tmpl.canvas.width} × {tmpl.canvas.height}
                          </span>
                        </div>
                        <p className="mt-2 line-clamp-2 text-xs text-[var(--vly-text-muted)]">{tmpl.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-[var(--vly-border-subtle)] bg-[var(--vly-surface)] px-6 py-4">
          <button
            onClick={onClose}
            className="vly-interactive rounded-lg border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-raised)] px-4 py-2 text-xs font-medium text-[var(--vly-text-secondary)] transition hover:text-[var(--vly-text-primary)]"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            className="vly-interactive flex items-center gap-1.5 rounded-lg bg-[var(--vly-accent)] px-5 py-2 text-xs font-semibold text-[var(--vly-text-on-accent)] shadow-lg transition hover:opacity-90"
          >
            <Plus size={14} />
            Criar Imagem
          </button>
        </div>
      </div>
    </div>
  );
}

