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
        return <Layout size={16} className="text-[var(--vly-accent)]" />;
      case "APPLICATION":
        return <Layers size={16} className="text-[var(--vly-info)]" />;
      case "DOCUMENTATION":
        return <BookOpen size={16} className="text-[var(--vly-success)]" />;
      default:
        return <Code2 size={16} className="text-[var(--vly-warning)]" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--vly-world)]/75 p-4 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" aria-labelledby="web-template-title" className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-floating)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--vly-border-subtle)] bg-[var(--vly-surface)] px-6 py-4">
          <div className="flex items-center gap-2">
            <Globe size={18} className="text-[var(--vly-accent)]" />
            <h3 id="web-template-title" className="text-base font-bold text-[var(--vly-text-primary)]">Criar Novo Website no Web Studio</h3>
          </div>
          <button onClick={onClose} aria-label="Fechar criação de website" className="vly-interactive rounded p-1 text-[var(--vly-text-muted)] hover:text-[var(--vly-text-primary)]">
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-6 overflow-y-auto p-6 text-[var(--vly-text-secondary)]">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[var(--vly-text-muted)]">
              Nome do Website
            </label>
            <input
              type="text"
              placeholder="Ex: Portal de Documentação Soberana"
              value={websiteName}
              onChange={(e) => setWebsiteName(e.target.value)}
              className="vly-field w-full px-4 py-2.5 text-sm"
            />
          </div>

          <div>
            <label className="mb-3 block text-xs font-semibold uppercase tracking-wider text-[var(--vly-text-muted)]">
              Selecione o Modelo Inicial
            </label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {WEB_TEMPLATES.map((tmpl) => {
                const isSelected = selectedTemplate.id === tmpl.id;
                return (
                  <div
                    key={tmpl.id}
                    onClick={() => setSelectedTemplate(tmpl)}
                      role="button"
                      tabIndex={0}
                      aria-current={isSelected ? "true" : undefined}
                      aria-label={`Selecionar modelo ${tmpl.name}`}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedTemplate(tmpl);
                        }
                      }}
                      className={`vly-interactive flex cursor-pointer flex-col justify-between gap-3 rounded-xl border p-4 transition ${
                      isSelected
                        ? "bg-[var(--vly-accent)]/15 border-[var(--vly-border-accent)] text-[var(--vly-text-primary)] shadow-lg"
                        : "bg-[var(--vly-surface-raised)] border-[var(--vly-border-subtle)] text-[var(--vly-text-secondary)] hover:border-[var(--vly-border-accent)]"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-sm font-bold text-[var(--vly-text-primary)]">
                          {getCategoryIcon(tmpl.category)}
                          {tmpl.name}
                        </span>
                        <span className="rounded bg-[var(--vly-surface)] px-2 py-0.5 font-mono text-[10px] uppercase text-[var(--vly-accent)]">
                          {tmpl.framework}
                        </span>
                      </div>
                      <p className="mt-2 line-clamp-2 text-xs text-[var(--vly-text-muted)]">{tmpl.description}</p>
                    </div>

                    <div className="font-mono text-[10px] text-[var(--vly-text-muted)]">
                      {tmpl.files.length} arquivos inclusos
                    </div>
                  </div>
                );
              })}
            </div>
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
            Criar Website
          </button>
        </div>
      </div>
    </div>
  );
}

