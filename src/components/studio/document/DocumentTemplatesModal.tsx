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
        return <BookOpen size={16} className="text-[var(--vly-accent)]" />;
      case "LEGAL_DOCUMENT":
        return <Scale size={16} className="text-[var(--vly-warning)]" />;
      case "SCRIPT":
        return <Video size={16} className="text-[var(--vly-brand)]" />;
      case "MANUAL":
        return <Terminal size={16} className="text-[var(--vly-success)]" />;
      default:
        return <FileText size={16} className="text-[var(--vly-text-muted)]" />;
    }
  };

  const handleCreate = () => {
    const finalTitle = title.trim() || selectedTemplate.name;
    onSelectTemplate(selectedTemplate, finalTitle);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--vly-world)]/80 p-4 backdrop-blur-sm animate-fade-in">
      <div role="dialog" aria-modal="true" aria-labelledby="document-template-title" className="flex w-full max-w-2xl flex-col gap-5 rounded-xl border border-[var(--vly-border-strong)] bg-[var(--vly-surface-floating)] p-6 text-[var(--vly-text-primary)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--vly-border-subtle)] pb-3">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-[var(--vly-accent)]/10 p-1.5 text-[var(--vly-accent)]">
              <Plus size={18} />
            </div>
            <div>
              <h3 id="document-template-title" className="text-base font-semibold text-[var(--vly-text-primary)]">Criar Novo Documento</h3>
              <p className="text-xs text-[var(--vly-text-muted)]">Escolha uma estrutura inicial para seu Document Artifact</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar criação de documento" className="vly-interactive text-[var(--vly-text-muted)] hover:text-[var(--vly-text-primary)]">
            <X size={18} />
          </button>
        </div>

        {/* Title Input */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="document-template-title-input" className="text-xs font-semibold text-[var(--vly-text-secondary)]">Título do Documento:</label>
          <input
            id="document-template-title-input"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={selectedTemplate.name}
            className="vly-field w-full rounded-lg px-3 py-2 text-sm transition focus:outline-none"
          />
        </div>

        {/* Template Cards Grid */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-[var(--vly-text-secondary)]">Selecione o Modelo:</span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-1">
            {DOCUMENT_TEMPLATES.map((tmpl) => {
              const isSelected = tmpl.id === selectedTemplateId;
              return (
                <button
                  key={tmpl.id}
                  type="button"
                  onClick={() => setSelectedTemplateId(tmpl.id)}
                  aria-pressed={isSelected}
                  className={`vly-interactive flex flex-col gap-1 rounded-lg border p-3 text-left transition ${
                    isSelected
                      ? "border-[var(--vly-border-accent)] bg-[var(--vly-accent)]/15 shadow-sm"
                      : "border-[var(--vly-border-subtle)] bg-[var(--vly-surface-raised)] hover:border-[var(--vly-border-strong)]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {getIcon(tmpl.type)}
                    <span className="text-xs font-semibold text-[var(--vly-text-primary)]">{tmpl.name}</span>
                  </div>
                  <p className="line-clamp-2 text-[11px] text-[var(--vly-text-muted)]">{tmpl.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[var(--vly-border-subtle)] pt-3">
          <button
            type="button"
            onClick={onClose}
            className="vly-interactive rounded-lg bg-[var(--vly-surface-raised)] px-4 py-2 text-xs text-[var(--vly-text-muted)] hover:text-[var(--vly-text-primary)]"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleCreate}
            className="vly-interactive flex items-center gap-1.5 rounded-lg bg-[var(--vly-accent)] px-5 py-2 text-xs font-medium text-white shadow-sm hover:bg-[var(--vly-accent-strong)]"
          >
            <Plus size={15} />
            Criar Documento
          </button>
        </div>
      </div>
    </div>
  );
}

