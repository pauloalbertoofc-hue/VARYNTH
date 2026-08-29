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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* MODAL HEADER */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Exportador de Manuais & Documentação Técnica</h2>
              <p className="text-xs text-slate-400">
                Geração autossuficiente em PDF, Markdown e HTML a partir de <code className="text-cyan-400">/docs</code>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
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
              <label className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold">
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
                        ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-300"
                        : "bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-300"
                    }`}
                  >
                    <span className="text-xl">{item.icon}</span>
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-white">{item.title}</div>
                      <div className="text-[11px] text-slate-400">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Escolha do Formato */}
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold">
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
                          ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-300 shadow-sm"
                          : "bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-400"
                      }`}
                    >
                      <Icon className="w-5 h-5 mx-auto text-cyan-400" />
                      <div className="text-xs font-bold text-white">{fmt.label}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{fmt.tag}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. Perfil de Privacidade */}
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold">
                3. Perfil de Privacidade
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div
                  onClick={() => handleUpdatePreview(scope, "PUBLIC_SAFE")}
                  className={`p-3 rounded-xl border cursor-pointer transition-all space-y-1 ${
                    profile === "PUBLIC_SAFE"
                      ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300 shadow-sm"
                      : "bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-400"
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs text-white">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Public-Safe
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Oculta caminhos absolutos locais; pronto para artigos, TCC e palestras.
                  </p>
                </div>

                <div
                  onClick={() => handleUpdatePreview(scope, "INTERNAL")}
                  className={`p-3 rounded-xl border cursor-pointer transition-all space-y-1 ${
                    profile === "INTERNAL"
                      ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-300 shadow-sm"
                      : "bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-400"
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs text-white">
                    <Shield className="w-4 h-4 text-cyan-400" />
                    Internal Completo
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Inclui referências relativas a arquivos e suítes de testes locais.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* PREVIEW COLUMN */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                <span className="text-xs font-mono uppercase text-slate-400 font-bold flex items-center gap-2">
                  <Eye className="w-4 h-4 text-cyan-400" />
                  Pré-visualização do Documento
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                  {previewDoc?.chapters.length} Capítulos
                </span>
              </div>

              {previewDoc && (
                <div className="space-y-4 text-xs">
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                    <span className="text-[10px] font-mono uppercase text-cyan-400 font-bold">
                      {previewDoc.metadata.version}
                    </span>
                    <h3 className="text-sm font-bold text-white">{previewDoc.metadata.title}</h3>
                    <p className="text-slate-400 text-[11px]">{previewDoc.metadata.subtitle}</p>
                    <div className="pt-2 flex items-center justify-between text-[10px] text-slate-500 font-mono border-t border-slate-800/60">
                      <span>Data: {previewDoc.metadata.generatedAt}</span>
                      <span>Saúde: {previewDoc.metadata.healthScore}%</span>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    <span className="text-[11px] font-mono uppercase text-slate-400 font-bold">
                      Estrutura do Sumário:
                    </span>
                    <div className="space-y-1">
                      {previewDoc.tableOfContents.map((item, idx) => (
                        <div
                          key={idx}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-900/60 text-[11px] text-slate-300 flex items-center gap-2"
                        >
                          <span className="font-mono text-cyan-400 font-bold">{item.number}.</span>
                          <span className="truncate">{item.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ACTION BUTTON */}
            <div className="pt-4 border-t border-slate-800">
              <button
                onClick={handleExport}
                disabled={isGenerating}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg cursor-pointer disabled:opacity-50"
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
