"use client";

import React, { useState } from "react";
import { VIDEO_TEMPLATES, VideoTemplate } from "@/lib/studio/video/video-templates";
import { Plus, X, Video, Sliders } from "lucide-react";

interface VideoTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (templateId?: string, name?: string, customDimensions?: { width: number; height: number; durationMs?: number }) => void;
}

export function VideoTemplatesModal({
  isOpen,
  onClose,
  onSelectTemplate,
}: VideoTemplatesModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<VideoTemplate>(VIDEO_TEMPLATES[0]);
  const [name, setName] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [customWidth, setCustomWidth] = useState(1920);
  const [customHeight, setCustomHeight] = useState(1080);
  const [customDurationSec, setCustomDurationSec] = useState(30);

  if (!isOpen) return null;

  const handleConfirm = () => {
    const finalName = name.trim() || (isCustom ? "Projeto de Vídeo Personalizado" : selectedTemplate.name);
    if (isCustom) {
      onSelectTemplate(undefined, finalName, { width: customWidth, height: customHeight, durationMs: customDurationSec * 1000 });
    } else {
      onSelectTemplate(selectedTemplate.id, finalName);
    }
    setName("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--vly-world)]/75 p-4 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" aria-labelledby="video-template-title" className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-floating)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--vly-border-subtle)] bg-[var(--vly-surface)] px-6 py-4">
          <div className="flex items-center gap-2">
            <Video size={18} className="text-[var(--vly-accent)]" />
            <h3 id="video-template-title" className="text-base font-bold text-[var(--vly-text-primary)]">Criar Novo Projeto no Video Studio</h3>
          </div>
          <button onClick={onClose} aria-label="Fechar criação de projeto" className="vly-interactive rounded p-1 text-[var(--vly-text-muted)] hover:text-[var(--vly-text-primary)]">
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-6 overflow-y-auto p-6 text-xs text-[var(--vly-text-secondary)]">
          <div>
            <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-[var(--vly-text-muted)]">
              Título do Vídeo
            </label>
            <input
              type="text"
              placeholder="Ex: Aula 01 — Introdução ao VARYNTH OS"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="vly-field w-full px-4 py-2.5 text-sm"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-[var(--vly-text-muted)]">
                Selecione o Formato ou Modelo
              </label>
              <button
                onClick={() => setIsCustom(!isCustom)}
                className="vly-interactive flex items-center gap-1 text-xs font-semibold text-[var(--vly-accent)] hover:opacity-80"
              >
                <Sliders size={13} />
                {isCustom ? "Usar Modelos Prontos" : "Dimensões Customizadas"}
              </button>
            </div>

            {isCustom ? (
              <div className="space-y-3 rounded-xl border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-raised)] p-5 font-mono">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="mb-1 block text-[10px] text-[var(--vly-text-muted)]">Largura (px):</span>
                    <input
                      type="number"
                      value={customWidth}
                      onChange={(e) => setCustomWidth(parseInt(e.target.value) || 1920)}
                      className="vly-field w-full px-3 py-2"
                    />
                  </div>
                  <div>
                    <span className="mb-1 block text-[10px] text-[var(--vly-text-muted)]">Altura (px):</span>
                    <input
                      type="number"
                      value={customHeight}
                      onChange={(e) => setCustomHeight(parseInt(e.target.value) || 1080)}
                      className="vly-field w-full px-3 py-2"
                    />
                  </div>
                </div>
                <div>
                  <span className="mb-1 block text-[10px] text-[var(--vly-text-muted)]">Duração (segundos):</span>
                  <input
                    type="number"
                    value={customDurationSec}
                    onChange={(e) => setCustomDurationSec(Math.max(5, parseInt(e.target.value) || 5))}
                    className="vly-field w-full px-3 py-2"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {VIDEO_TEMPLATES.map((tmpl) => {
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
                            {tmpl.timeline.width}×{tmpl.timeline.height}
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
            Criar Projeto
          </button>
        </div>
      </div>
    </div>
  );
}

