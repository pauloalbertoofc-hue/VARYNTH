"use client";

import React, { useState } from "react";
import { DOCUMENT_TEMPLATES } from "@/lib/studio/document/document-templates";
import { DocumentClassification, DocumentTemplate } from "@/lib/studio/document/types";
import { X, FileText, Plus, BookOpen, Scale, Video, Terminal } from "lucide-react";

interface DocumentTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: DocumentTemplate, title: string) => void;
}

export function DocumentTemplatesModal({
  isOpen,
  onClose,
  onSelectTemplate,
}: DocumentTemplatesModalProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState("academic-article");
  const [title, setTitle] = useState("");

  if (!isOpen) return null;

  const selectedTemplate =
    DOCUMENT_TEMPLATES.find((t) => t.id === selectedTemplateId) || DOCUMENT_TEMPLATES[0];

  const getIcon = (type: DocumentClassification) => {
    switch (type) {
      case "ARTICLE":
      case "RESEARCH":
        return <BookOpen size={16} className="text-blue-400" />;
      case "LEGAL_DOCUMENT":
        return <Scale size={16} className="text-amber-400" />;
      case "SCRIPT":
        return <Video size={16} className="text-purple-400" />;
      case "MANUAL":
        return <Terminal size={16} className="text-emerald-400" />;
      default:
        return <FileText size={16} className="text-slate-400" />;
    }
  };

  const handleCreate = () => {
    const finalTitle = title.trim() || selectedTemplate.name;
    onSelectTemplate(selectedTemplate, finalTitle);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-[#10101c] border border-[#222238] rounded-xl max-w-2xl w-full p-6 shadow-2xl flex flex-col gap-5 text-slate-200">
        <div className="flex items-center justify-between pb-3 border-b border-[#1e1e32]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-500/10 rounded-lg text-blue-400">
              <Plus size={18} />
            </div>
            <div>
              <h3 className="font-semibold text-base text-white">Criar Novo Documento</h3>
              <p className="text-xs text-slate-400">Escolha uma estrutura inicial para seu Document Artifact</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <X size={18} />
          </button>
        </div>

        {/* Title Input */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-300">Título do Documento:</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={selectedTemplate.name}
            className="w-full bg-[#141424] border border-[#24243a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition"
          />
        </div>

        {/* Template Cards Grid */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-300">Selecione o Modelo:</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-1">
            {DOCUMENT_TEMPLATES.map((tmpl) => {
              const isSelected = tmpl.id === selectedTemplateId;
              return (
                <button
                  key={tmpl.id}
                  onClick={() => setSelectedTemplateId(tmpl.id)}
                  className={`p-3 rounded-lg border text-left flex flex-col gap-1 transition ${
                    isSelected
                      ? "bg-blue-600/15 border-blue-500 shadow-sm"
                      : "bg-[#141424] border-[#202034] hover:border-slate-600"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {getIcon(tmpl.type)}
                    <span className="font-semibold text-xs text-white">{tmpl.name}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2">{tmpl.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1e1e32]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs text-slate-400 hover:text-white bg-[#161626] rounded-lg transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleCreate}
            className="px-5 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg flex items-center gap-1.5 shadow-sm transition"
          >
            <Plus size={15} />
            Criar Documento
          </button>
        </div>
      </div>
    </div>
  );
}

