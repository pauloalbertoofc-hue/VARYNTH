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
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#121324] border border-[#222442] rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1e2038] flex items-center justify-between bg-[#15162a]">
          <div className="flex items-center gap-2">
            <Music size={18} className="text-blue-400" />
            <h3 className="font-bold text-base text-white">Criar Novo Projeto no Audio Studio</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded">
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
              className="w-full px-4 py-2.5 bg-[#0b0c16] border border-[#232544] rounded-xl text-sm text-white placeholder:text-slate-600 outline-none focus:border-blue-500 transition"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-[11px] font-semibold uppercase text-slate-400 tracking-wider">
                Selecione o Modelo de Produção
              </label>
              <button
                onClick={() => setIsCustom(!isCustom)}
                className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
              >
                <Sliders size={13} />
                {isCustom ? "Usar Modelos Prontos" : "Duração Personalizada"}
              </button>
            </div>

            {isCustom ? (
              <div className="p-5 bg-[#0c0d18] border border-[#1f213a] rounded-xl space-y-3">
                <span className="text-slate-400 block mb-1">Duração da Linha do Tempo (segundos):</span>
                <input
                  type="number"
                  value={customDurationSec}
                  onChange={(e) => setCustomDurationSec(Math.max(5, parseInt(e.target.value) || 5))}
                  className="w-full px-3 py-2 bg-[#121324] border border-[#232544] rounded-lg text-white font-mono"
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {AUDIO_TEMPLATES.map((tmpl) => {
                  const isSelected = selectedTemplate.id === tmpl.id;
                  return (
                    <div
                      key={tmpl.id}
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
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#1e2038] flex items-center justify-end gap-2 bg-[#15162a]">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#1a1b2e] hover:bg-[#252740] text-slate-300 rounded-lg text-xs font-medium transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-blue-500/20 transition flex items-center gap-1.5"
          >
            <Plus size={14} />
            Criar Projeto
          </button>
        </div>
      </div>
    </div>
  );
}

