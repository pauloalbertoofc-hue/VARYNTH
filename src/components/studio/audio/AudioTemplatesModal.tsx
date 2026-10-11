"use client";

import React, { useState } from "react";
import { AUDIO_TEMPLATES, AudioTemplate } from "@/lib/studio/audio/audio-templates";
import { Plus, X, Music, Mic, Radio, Sliders } from "lucide-react";

interface AudioTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (templateId?: string, name?: string, customDurationMs?: number) => void;
}

export function AudioTemplatesModal({
  isOpen,
  onClose,
  onSelectTemplate,
}: AudioTemplatesModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<AudioTemplate>(AUDIO_TEMPLATES[0]);
  const [name, setName] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [customDurationSec, setCustomDurationSec] = useState(30);

  if (!isOpen) return null;

  const handleConfirm = () => {
    const finalName = name.trim() || (isCustom ? "Projeto de Áudio Personalizado" : selectedTemplate.name);
    if (isCustom) {
      onSelectTemplate(undefined, finalName, customDurationSec * 1000);
    } else {
      onSelectTemplate(selectedTemplate.id, finalName);
    }
    setName("");
    onClose();
  };

  return (
    <div role="presentation" className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--vly-world)]/80 p-4 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" aria-labelledby="audio-templates-title" className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[var(--vly-border-strong)] bg-[var(--vly-surface-floating)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--vly-border-default)] bg-[var(--vly-surface-raised)] px-6 py-4">
          <div className="flex items-center gap-2">
            <Music size={18} className="text-blue-400" />
            <h3 id="audio-templates-title" className="text-base font-bold text-[var(--vly-text-primary)]">Criar Novo Projeto no Audio Studio</h3>
          </div>
          <button type="button" aria-label="Fechar modelos de áudio" onClick={onClose} className="vly-interactive rounded p-1 text-[var(--vly-text-muted)] hover:text-[var(--vly-text-primary)]">
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          <div>
            <label className="text-[11px] font-semibold uppercase text-slate-400 tracking-wider block mb-2">
              Nome do Projeto
            </label>
            <input
              type="text"
              placeholder="Ex: Trilha de Abertura do Podcast"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="vly-field w-full px-4 py-2.5 text-sm"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-[11px] font-semibold uppercase text-slate-400 tracking-wider">
                Selecione o Modelo de Produção
              </label>
              <button
                type="button"
                aria-pressed={isCustom}
                onClick={() => setIsCustom(!isCustom)}
                className="vly-interactive flex items-center gap-1 text-xs font-semibold text-[var(--vly-accent)]"
              >
                <Sliders size={13} />
                {isCustom ? "Usar Modelos Prontos" : "Duração Personalizada"}
              </button>
            </div>

            {isCustom ? (
              <div className="space-y-3 rounded-xl border border-[var(--vly-border-default)] bg-[var(--vly-surface-raised)] p-5">
                <span className="text-slate-400 block mb-1">Duração da Linha do Tempo (segundos):</span>
                <input
                  type="number"
                  value={customDurationSec}
                  onChange={(e) => setCustomDurationSec(Math.max(5, parseInt(e.target.value) || 5))}
                  className="vly-field w-full px-3 py-2 font-mono"
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {AUDIO_TEMPLATES.map((tmpl) => {
                  const isSelected = selectedTemplate.id === tmpl.id;
                  return (
                    <button
                      key={tmpl.id}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => setSelectedTemplate(tmpl)}
                      className={`p-4 rounded-xl border cursor-pointer transition flex flex-col justify-between gap-3 ${
                        isSelected
                          ? "bg-blue-600/15 border-blue-500 text-white shadow-lg shadow-blue-500/10"
                          : "bg-[#0d0e1a] border-[#1e2038] text-slate-300 hover:border-slate-600"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-white">{tmpl.name}</span>
                          <span className="text-[10px] bg-[#1a1c32] px-2 py-0.5 rounded text-blue-300 font-mono">
                            {tmpl.timelineDurationMs / 1000}s ({tmpl.initialTracks.length} faixas)
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-2 line-clamp-2">{tmpl.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-[var(--vly-border-default)] bg-[var(--vly-surface-raised)] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="vly-interactive rounded-lg bg-[var(--vly-surface-active)] px-4 py-2 text-xs font-medium text-[var(--vly-text-secondary)]"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            className="vly-interactive flex items-center gap-1.5 rounded-lg bg-[var(--vly-accent)] px-5 py-2 text-xs font-semibold text-[var(--vly-accent-contrast)]"
          >
            <Plus size={14} />
            Criar Projeto
          </button>
        </div>
      </div>
    </div>
  );
}

