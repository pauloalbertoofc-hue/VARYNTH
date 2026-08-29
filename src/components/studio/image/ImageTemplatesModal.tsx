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
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#121324] border border-[#222442] rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1e2038] flex items-center justify-between bg-[#15162a]">
          <div className="flex items-center gap-2">
            <ImageIcon size={18} className="text-blue-400" />
            <h3 className="font-bold text-base text-white">Criar Nova Imagem no Image Studio</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded">
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          <div>
            <label className="text-[11px] font-semibold uppercase text-slate-400 tracking-wider block mb-2">
              Nome da Composição
            </label>
            <input
              type="text"
              placeholder="Ex: Capa do Tratado de Arquitetura"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#0b0c16] border border-[#232544] rounded-xl text-sm text-white placeholder:text-slate-600 outline-none focus:border-blue-500 transition"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-[11px] font-semibold uppercase text-slate-400 tracking-wider">
                Selecione o Modelo ou Formato
              </label>
              <button
                onClick={() => setIsCustom(!isCustom)}
                className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
              >
                <Sliders size={13} />
                {isCustom ? "Usar Modelos Prontos" : "Dimensão Personalizada"}
              </button>
            </div>

            {isCustom ? (
              <div className="p-5 bg-[#0c0d18] border border-[#1f213a] rounded-xl space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-slate-400 block mb-1">Largura (px):</span>
                    <input
                      type="number"
                      value={customWidth}
                      onChange={(e) => setCustomWidth(parseInt(e.target.value) || 100)}
                      className="w-full px-3 py-2 bg-[#121324] border border-[#232544] rounded-lg text-white font-mono"
                    />
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-1">Altura (px):</span>
                    <input
                      type="number"
                      value={customHeight}
                      onChange={(e) => setCustomHeight(parseInt(e.target.value) || 100)}
                      className="w-full px-3 py-2 bg-[#121324] border border-[#232544] rounded-lg text-white font-mono"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-slate-400">Cor de Fundo:</span>
                  <input
                    type="color"
                    value={customBg}
                    onChange={(e) => setCustomBg(e.target.value)}
                    className="w-8 h-8 rounded border-none bg-transparent cursor-pointer"
                  />
                  <span className="font-mono text-slate-400">{customBg}</span>
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
                          ? "bg-blue-600/15 border-blue-500 text-white shadow-lg shadow-blue-500/10"
                          : "bg-[#0d0e1a] border-[#1e2038] text-slate-300 hover:border-slate-600"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-white">{tmpl.name}</span>
                          <span className="text-[10px] bg-[#1a1c32] px-2 py-0.5 rounded text-blue-300 font-mono">
                            {tmpl.canvas.width} × {tmpl.canvas.height}
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
            Criar Imagem
          </button>
        </div>
      </div>
    </div>
  );
}

