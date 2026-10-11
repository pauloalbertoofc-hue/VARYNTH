"use client";

import { useState } from "react";
import {
  ExportScope,
  ExportFormat,
  ExportProfile,
  PublicationDocument,
} from "@/lib/docs/builder/types";
import { documentationBuilder } from "@/lib/docs/builder/documentation-builder";
import {
  Download,
  Printer,
  FileText,
  FileCode,
  Globe,
  Shield,
  ShieldCheck,
  X,
  Eye,
  CheckCircle2,
  BookOpen,
  Cpu,
  Layers,
  FileCode2,
  History,
} from "lucide-react";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentComponentId?: string;
}

export function ExportModal({ isOpen, onClose, currentComponentId }: ExportModalProps) {
  const [scope, setScope] = useState<ExportScope>("COMPLETE_HANDBOOK");
  const [format, setFormat] = useState<ExportFormat>("PDF");
  const [profile, setProfile] = useState<ExportProfile>("PUBLIC_SAFE");
  const [previewDoc, setPreviewDoc] = useState<PublicationDocument | null>(() =>
    documentationBuilder.buildPublication("COMPLETE_HANDBOOK", "PUBLIC_SAFE", currentComponentId)
  );
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  const handleUpdatePreview = (newScope: ExportScope, newProfile: ExportProfile) => {
    setScope(newScope);
    setProfile(newProfile);
    const pub = documentationBuilder.buildPublication(newScope, newProfile, currentComponentId);
    setPreviewDoc(pub);
  };

  const handleExport = () => {
    if (!previewDoc) return;
    setIsGenerating(true);

    const safeTitle = previewDoc.metadata.title
      .replace(/[^a-zA-Z0-9_-]/g, "-")
      .toLowerCase();
    const dateStr = new Date().toISOString().split("T")[0];
    const filename = `${safeTitle}-${dateStr}`;

    if (format === "MARKDOWN") {
      const mdContent = documentationBuilder.exportToMarkdown(previewDoc);
      const blob = new Blob([mdContent], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename}.md`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (format === "HTML") {
      const htmlContent = documentationBuilder.exportToHtml(previewDoc);
      const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename}.html`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (format === "PDF") {
      const htmlContent = documentationBuilder.exportToHtml(previewDoc);
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 500);
      }
    }

    setTimeout(() => {
      setIsGenerating(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm vly-motion-enter">
      <div className="bg-[var(--vly-surface-floating)] border border-[var(--vly-border-strong)] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl shadow-black/30 text-[var(--vly-text-secondary)]">
        {/* MODAL HEADER */}
        <div className="p-6 border-b border-[var(--vly-border-subtle)] flex items-center justify-between bg-[var(--vly-surface-raised)]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[color-mix(in_srgb,var(--vly-info)_12%,var(--vly-surface))] border border-[var(--vly-border-info)] flex items-center justify-center text-[var(--vly-info)]">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--vly-text-primary)]">Exportador de Manuais & Documentação Técnica</h2>
              <p className="text-xs text-[var(--vly-text-muted)]">
                Geração autossuficiente em PDF, Markdown e HTML a partir de <code className="text-[var(--vly-info)]">/docs</code>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="vly-interactive p-2 rounded-lg text-[var(--vly-text-muted)] hover:text-[var(--vly-text-primary)] hover:bg-[var(--vly-surface-hover)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="grid grid-cols-1 md:grid-cols-2 p-6 gap-6 overflow-y-auto">
          {/* CONFIGURATION COLUMN */}
          <div className="space-y-6">
            {/* 1. Escolha do Escopo */}
            <div className="space-y-2">
              <label className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--vly-text-secondary)]">
                1. Selecione o Documento / Escopo
              </label>
              <div className="space-y-2">
                {[
                  {
                    id: "COMPLETE_HANDBOOK",
                    icon: "📘",
                    title: "Manual Completo do VARYNTH OS",
                    desc: "Compêndio de todos os 20 capítulos da arquitetura",
                  },
                  {
                    id: "ATHENA_MANUAL",
                    icon: "🦉",
                    title: "Manual Técnico da Athena",
                    desc: "Kernel V4, Conselho de 7 Agentes, Safety e 3 Vias",
                  },
                  {
                    id: "ARCHITECTURE_SPEC",
                    icon: "🏛️",
                    title: "Macro-Arquitetura & Segurança",
                    desc: "Topologia, Soberania Local-First e Alex Principle",
                  },
                  {
                    id: "MODULES_MANUAL",
                    icon: "🧩",
                    title: "Manual dos Módulos Especializados",
                    desc: "Vault, Codex, Research, Chronos, Labs e Lixeira",
                  },
                  {
                    id: "ADRS_COMPENDIUM",
                    icon: "📜",
                    title: "Architecture Decision Records (ADRs)",
                    desc: "Registro de ADR-001 a ADR-006 com justificativas",
                  },
                  {
                    id: "HISTORY_AND_LESSONS",
                    icon: "💡",
                    title: "Memória de Engenharia & Lições",
                    desc: "Falhas reais, histórico e princípios derivados",
                  },
                  {
                    id: "CURRENT_COMPONENT",
                    icon: "🔬",
                    title: "Componente Selecionado na Tela",
                    desc: "Ficha técnica isolada do componente ativo",
                  },
                ].map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleUpdatePreview(item.id as ExportScope, profile)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                      scope === item.id
                        ? "bg-[color-mix(in_srgb,var(--vly-info)_12%,var(--vly-surface))] border-[var(--vly-border-info)] text-[var(--vly-info)]"
                        : "bg-[var(--vly-surface)] border-[var(--vly-border-default)] hover:border-[var(--vly-border-strong)] text-[var(--vly-text-secondary)]"
                    }`}
                  >
                    <span className="text-xl">{item.icon}</span>
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-[var(--vly-text-primary)]">{item.title}</div>
                      <div className="text-[11px] text-[var(--vly-text-muted)]">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Escolha do Formato */}
            <div className="space-y-2">
              <label className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--vly-text-secondary)]">
                2. Formato de Exportação
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "PDF", icon: Printer, label: "PDF", tag: "Apresentação" },
                  { id: "MARKDOWN", icon: FileCode, label: "Markdown", tag: ".md portátil" },
                  { id: "HTML", icon: Globe, label: "HTML", tag: "Offline autônomo" },
                ].map((fmt) => {
                  const Icon = fmt.icon;
                  return (
                    <div
                      key={fmt.id}
                      onClick={() => setFormat(fmt.id as ExportFormat)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all text-center space-y-1 ${
                        format === fmt.id
                          ? "bg-[color-mix(in_srgb,var(--vly-info)_12%,var(--vly-surface))] border-[var(--vly-border-info)] text-[var(--vly-info)] shadow-sm"
                          : "bg-[var(--vly-surface)] border-[var(--vly-border-default)] hover:border-[var(--vly-border-strong)] text-[var(--vly-text-muted)]"
                      }`}
                    >
                      <Icon className="w-5 h-5 mx-auto text-[var(--vly-info)]" />
                      <div className="text-xs font-bold text-[var(--vly-text-primary)]">{fmt.label}</div>
                      <div className="text-[10px] text-[var(--vly-text-disabled)] font-mono">{fmt.tag}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. Perfil de Privacidade */}
            <div className="space-y-2">
              <label className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--vly-text-secondary)]">
                3. Perfil de Privacidade
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div
                  onClick={() => handleUpdatePreview(scope, "PUBLIC_SAFE")}
                  className={`p-3 rounded-xl border cursor-pointer transition-all space-y-1 ${
                    profile === "PUBLIC_SAFE"
                      ? "bg-[color-mix(in_srgb,var(--vly-success)_12%,var(--vly-surface))] border-[var(--vly-border-success)] text-[var(--vly-success)] shadow-sm"
                      : "bg-[var(--vly-surface)] border-[var(--vly-border-default)] hover:border-[var(--vly-border-strong)] text-[var(--vly-text-muted)]"
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs text-[var(--vly-text-primary)]">
                    <ShieldCheck className="w-4 h-4 text-[var(--vly-success)]" />
                    Public-Safe
                  </div>
                  <p className="text-[10px] text-[var(--vly-text-muted)]">
                    Oculta caminhos absolutos locais; pronto para artigos, TCC e palestras.
                  </p>
                </div>

                <div
                  onClick={() => handleUpdatePreview(scope, "INTERNAL")}
                  className={`p-3 rounded-xl border cursor-pointer transition-all space-y-1 ${
                    profile === "INTERNAL"
                      ? "bg-[color-mix(in_srgb,var(--vly-info)_12%,var(--vly-surface))] border-[var(--vly-border-info)] text-[var(--vly-info)] shadow-sm"
                      : "bg-[var(--vly-surface)] border-[var(--vly-border-default)] hover:border-[var(--vly-border-strong)] text-[var(--vly-text-muted)]"
                  }`}
                >
                    <div className="flex items-center gap-2 text-xs font-bold text-[var(--vly-text-primary)]">
                    <Shield className="w-4 h-4 text-[var(--vly-info)]" />
                    Internal Completo
                  </div>
                    <p className="text-[10px] text-[var(--vly-text-muted)]">
                    Inclui referências relativas a arquivos e suítes de testes locais.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* PREVIEW COLUMN */}
          <div className="flex flex-col justify-between space-y-4 rounded-xl border border-[var(--vly-border-subtle)] bg-[var(--vly-world)]/60 p-5">
            <div>
              <div className="mb-4 flex items-center justify-between border-b border-[var(--vly-border-subtle)] pb-3">
                <span className="flex items-center gap-2 text-xs font-mono font-bold uppercase text-[var(--vly-text-secondary)]">
                  <Eye className="h-4 w-4 text-[var(--vly-info)]" />
                  Pré-visualização do Documento
                </span>
                <span className="rounded border border-[var(--vly-info)]/30 bg-[var(--vly-info)]/10 px-2 py-0.5 text-[10px] font-mono text-[var(--vly-info)]">
                  {previewDoc?.chapters.length} Capítulos
                </span>
              </div>

              {previewDoc && (
                <div className="space-y-4 text-xs">
                  <div className="space-y-2 rounded-xl border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-raised)] p-4">
                    <span className="text-[10px] font-mono font-bold uppercase text-[var(--vly-info)]">
                      {previewDoc.metadata.version}
                    </span>
                    <h3 className="text-sm font-bold text-[var(--vly-text-primary)]">{previewDoc.metadata.title}</h3>
                    <p className="text-[11px] text-[var(--vly-text-secondary)]">{previewDoc.metadata.subtitle}</p>
                    <div className="flex items-center justify-between border-t border-[var(--vly-border-subtle)]/60 pt-2 text-[10px] font-mono text-[var(--vly-text-muted)]">
                      <span>Data: {previewDoc.metadata.generatedAt}</span>
                      <span>Saúde: {previewDoc.metadata.healthScore}%</span>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    <span className="text-[11px] font-mono font-bold uppercase text-[var(--vly-text-secondary)]">
                      Estrutura do Sumário:
                    </span>
                    <div className="space-y-1">
                      {previewDoc.tableOfContents.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 rounded-lg bg-[var(--vly-surface-raised)]/60 px-2.5 py-1.5 text-[11px] text-[var(--vly-text-secondary)]"
                        >
                          <span className="font-mono font-bold text-[var(--vly-info)]">{item.number}.</span>
                          <span className="truncate">{item.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ACTION BUTTON */}
            <div className="border-t border-[var(--vly-border-subtle)] pt-4">
              <button
                onClick={handleExport}
                disabled={isGenerating}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--vly-accent)] px-4 py-3 text-xs font-bold text-[var(--vly-accent-contrast)] shadow-lg transition-all hover:opacity-90 disabled:opacity-50"
              >
                {format === "PDF" ? <Printer className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                {format === "PDF"
                  ? "Gerar & Abrir para Impressão / Salvar PDF"
                  : `Gerar & Baixar Arquivo ${format}`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

