"use client";

import React, { useState } from "react";
import { WEB_TEMPLATES, WebTemplate } from "@/lib/studio/web/web-templates";
import { Globe, Plus, X, Layout, Code2, BookOpen, Layers } from "lucide-react";

interface WebTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: WebTemplate, name: string) => void;
}

export function WebTemplatesModal({
  isOpen,
  onClose,
  onSelectTemplate,
}: WebTemplatesModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<WebTemplate>(WEB_TEMPLATES[0]);
  const [websiteName, setWebsiteName] = useState("");

  if (!isOpen) return null;

  const handleConfirm = () => {
    const name = websiteName.trim() || selectedTemplate.name;
    onSelectTemplate(selectedTemplate, name);
    setWebsiteName("");
    onClose();
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case "SHOWCASE":
        return <Layout size={16} className="text-blue-400" />;
      case "APPLICATION":
        return <Layers size={16} className="text-purple-400" />;
      case "DOCUMENTATION":
        return <BookOpen size={16} className="text-emerald-400" />;
      default:
        return <Code2 size={16} className="text-amber-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#121324] border border-[#222442] rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1e2038] flex items-center justify-between bg-[#15162a]">
          <div className="flex items-center gap-2">
            <Globe size={18} className="text-blue-400" />
            <h3 className="font-bold text-base text-white">Criar Novo Website no Web Studio</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded">
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          <div>
            <label className="text-xs font-semibold uppercase text-slate-400 tracking-wider block mb-2">
              Nome do Website
            </label>
            <input
              type="text"
              placeholder="Ex: Portal de Documentação Soberana"
              value={websiteName}
              onChange={(e) => setWebsiteName(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#0b0c16] border border-[#232544] rounded-xl text-sm text-white placeholder:text-slate-600 outline-none focus:border-blue-500 transition"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase text-slate-400 tracking-wider block mb-3">
              Selecione o Modelo Inicial
            </label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {WEB_TEMPLATES.map((tmpl) => {
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
                        <span className="flex items-center gap-1.5 font-bold text-sm">
                          {getCategoryIcon(tmpl.category)}
                          {tmpl.name}
                        </span>
                        <span className="text-[10px] bg-[#1a1c32] px-2 py-0.5 rounded text-blue-300 uppercase font-mono">
                          {tmpl.framework}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-2 line-clamp-2">{tmpl.description}</p>
                    </div>

                    <div className="text-[10px] text-slate-500 font-mono">
                      {tmpl.files.length} arquivos inclusos
                    </div>
                  </div>
                );
              })}
            </div>
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
            Criar Website
          </button>
        </div>
      </div>
    </div>
  );
}

