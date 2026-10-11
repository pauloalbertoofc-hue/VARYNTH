"use client";

import React, { useState } from "react";
import { DocumentExportOptions } from "@/lib/studio/document/types";
import { X, Download, Printer, Shield, FileText, Code, Globe } from "lucide-react";
import { Surface } from "@/components/ui/Surface";

interface DocumentExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentTitle: string;
  onConfirmExport: (options: DocumentExportOptions) => void;
}

export function DocumentExportModal({
  isOpen,
  onClose,
  documentTitle,
  onConfirmExport,
}: DocumentExportModalProps) {
  const [format, setFormat] = useState<"MARKDOWN" | "HTML" | "PDF">("MARKDOWN");
  const [profile, setProfile] = useState<"STANDARD" | "PUBLIC_SAFE">("STANDARD");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--vly-world)]/80 p-4 backdrop-blur-sm animate-fade-in" role="presentation">
      <Surface tone="floating" role="dialog" aria-modal="true" aria-labelledby="document-export-title" className="flex w-full max-w-md flex-col gap-4 rounded-xl p-5 text-[var(--vly-text-primary)]">
        <div className="flex items-center justify-between border-b border-[var(--vly-border-subtle)] pb-2">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-[var(--vly-info)]/10 p-1.5 text-[var(--vly-info)]">
              <Download size={16} />
            </div>
            <h3 id="document-export-title" className="text-sm font-semibold text-[var(--vly-text-primary)]">Exportar Documento</h3>
          </div>
          <button type="button" aria-label="Fechar exportação" onClick={onClose} className="vly-interactive rounded p-1 text-[var(--vly-text-muted)] hover:text-[var(--vly-text-primary)]">
            <X size={16} />
          </button>
        </div>

        <p className="text-xs text-[var(--vly-text-secondary)]">
          Selecione o formato e o perfil de sanitização para exportar <strong className="text-[var(--vly-text-primary)]">&quot;{documentTitle}&quot;</strong>.
        </p>

        {/* Format Selector */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-[var(--vly-text-secondary)]">Formato:</label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              aria-pressed={format === "MARKDOWN"}
              onClick={() => setFormat("MARKDOWN")}
              className={`vly-interactive flex flex-col items-center gap-1.5 rounded-lg border p-2.5 text-xs ${
                format === "MARKDOWN" ? "bg-[var(--vly-info)]/20 border-[var(--vly-info)] text-[var(--vly-text-primary)]" : "bg-[var(--vly-surface-raised)] border-[var(--vly-border-subtle)] text-[var(--vly-text-muted)] hover:text-[var(--vly-text-secondary)]"
              }`}
            >
              <Code size={16} className="text-[var(--vly-info)]" />
              <span>Markdown (.md)</span>
            </button>
            <button
              type="button"
              aria-pressed={format === "HTML"}
              onClick={() => setFormat("HTML")}
              className={`vly-interactive flex flex-col items-center gap-1.5 rounded-lg border p-2.5 text-xs ${
                format === "HTML" ? "bg-[var(--vly-info)]/20 border-[var(--vly-info)] text-[var(--vly-text-primary)]" : "bg-[var(--vly-surface-raised)] border-[var(--vly-border-subtle)] text-[var(--vly-text-muted)] hover:text-[var(--vly-text-secondary)]"
              }`}
            >
              <Globe size={16} className="text-[var(--vly-success)]" />
              <span>HTML (.html)</span>
            </button>
            <button
              type="button"
              aria-pressed={format === "PDF"}
              onClick={() => setFormat("PDF")}
              className={`vly-interactive flex flex-col items-center gap-1.5 rounded-lg border p-2.5 text-xs ${
                format === "PDF" ? "bg-[var(--vly-info)]/20 border-[var(--vly-info)] text-[var(--vly-text-primary)]" : "bg-[var(--vly-surface-raised)] border-[var(--vly-border-subtle)] text-[var(--vly-text-muted)] hover:text-[var(--vly-text-secondary)]"
              }`}
            >
              <Printer size={16} className="text-[var(--vly-danger)]" />
              <span>PDF / Impressão</span>
            </button>
          </div>
        </div>

        {/* Profile Selector */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-[var(--vly-text-secondary)]">Perfil de Sanitização:</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              aria-pressed={profile === "STANDARD"}
              onClick={() => setProfile("STANDARD")}
              className={`vly-interactive flex items-center gap-2 rounded-lg border p-2 text-xs ${
                profile === "STANDARD" ? "bg-[var(--vly-info)]/20 border-[var(--vly-info)] text-[var(--vly-text-primary)]" : "bg-[var(--vly-surface-raised)] border-[var(--vly-border-subtle)] text-[var(--vly-text-muted)]"
              }`}
            >
              <FileText size={14} />
              <span>Padrão Completo</span>
            </button>
            <button
              type="button"
              aria-pressed={profile === "PUBLIC_SAFE"}
              onClick={() => setProfile("PUBLIC_SAFE")}
              className={`vly-interactive flex items-center gap-2 rounded-lg border p-2 text-xs ${
                profile === "PUBLIC_SAFE" ? "bg-[var(--vly-info)]/20 border-[var(--vly-info)] text-[var(--vly-text-primary)]" : "bg-[var(--vly-surface-raised)] border-[var(--vly-border-subtle)] text-[var(--vly-text-muted)]"
              }`}
            >
              <Shield size={14} className="text-[var(--vly-warning)]" />
              <span>Public Safe (Oculta Paths)</span>
            </button>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[var(--vly-border-subtle)] pt-2">
          <button
            onClick={onClose}
            type="button"
            className="vly-interactive rounded-lg bg-[var(--vly-surface-raised)] px-3 py-1.5 text-xs text-[var(--vly-text-muted)]"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              onConfirmExport({ format, profile });
              onClose();
            }}
            type="button"
            className="vly-interactive flex items-center gap-1.5 rounded-lg bg-[var(--vly-info)] px-4 py-1.5 text-xs font-medium text-white shadow-sm"
          >
            <Download size={14} />
            Gerar Arquivo
          </button>
        </div>
      </Surface>
    </div>
  );
}

