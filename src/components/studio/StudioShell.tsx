"use client";

import React, { ReactNode } from "react";
import {
  FileText,
  Save,
  Clock,
  Share2,
  Trash2,
  Eye,
  Edit3,
  Columns,
  Sparkles,
  Layers,
  Paperclip,
  GitBranch,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { DocumentSaveState } from "@/lib/studio/document/types";

interface StudioShellProps {
  title: string;
  subtitle?: string;
  saveState: DocumentSaveState;
  viewMode: "EDIT" | "PREVIEW" | "SPLIT";
  onViewModeChange: (mode: "EDIT" | "PREVIEW" | "SPLIT") => void;
  activeSidebarTab: "OUTLINE" | "VERSIONS" | "ASSETS" | "RELATIONS" | "ATHENA";
  onSidebarTabChange: (tab: "OUTLINE" | "VERSIONS" | "ASSETS" | "RELATIONS" | "ATHENA") => void;
  onCreateVersion: () => void;
  onExport: () => void;
  onDelete?: () => void;
  wordCount?: number;
  extraAction?: ReactNode;
  sidebarContent: ReactNode;
  mainContent: ReactNode;
  bottomContent?: ReactNode;
}

export function StudioShell({
  title,
  subtitle,
  saveState,
  viewMode,
  onViewModeChange,
  activeSidebarTab,
  onSidebarTabChange,
  onCreateVersion,
  onExport,
  onDelete,
  wordCount = 0,
  extraAction,
  sidebarContent,
  mainContent,
  bottomContent,
}: StudioShellProps) {
  const getSaveBadge = () => {
    switch (saveState) {
      case "SAVED":
        return (
          <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            <ShieldCheck size={12} /> Salvo
          </span>
        );
      case "SAVING":
        return (
          <span className="flex items-center gap-1 text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 animate-pulse">
            <Clock size={12} /> Salvando...
          </span>
        );
      case "UNSAVED":
        return (
          <span className="flex items-center gap-1 text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
            Alterações pendentes
          </span>
        );
      case "STORAGE_PROTECTED":
        return (
          <span className="flex items-center gap-1 text-xs text-amber-300 bg-amber-900/30 px-2 py-0.5 rounded border border-amber-600/40">
            <AlertTriangle size={12} /> Modo Protegido
          </span>
        );
      case "SAVE_FAILED":
        return (
          <span className="flex items-center gap-1 text-xs text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
            <AlertTriangle size={12} /> Falha ao salvar
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a10] text-slate-200 overflow-hidden font-sans">
      {/* Studio Header */}
      <header className="h-14 border-b border-[#1e1e30] bg-[#0d0d16] px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <FileText size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-semibold text-sm text-white truncate max-w-xs md:max-w-md">{title}</h1>
              {getSaveBadge()}
            </div>
            {subtitle && <p className="text-xs text-slate-400 truncate max-w-xs">{subtitle}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 hidden sm:inline mr-2">{wordCount} palavras</span>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-[#141422] p-0.5 rounded-lg border border-[#222236] mr-2">
            <button
              onClick={() => onViewModeChange("EDIT")}
              className={`px-2.5 py-1 text-xs rounded-md flex items-center gap-1 transition ${
                viewMode === "EDIT" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200"
              }`}
              title="Modo Edição"
            >
              <Edit3 size={13} />
              <span className="hidden md:inline">Editar</span>
            </button>
            <button
              onClick={() => onViewModeChange("SPLIT")}
              className={`px-2.5 py-1 text-xs rounded-md flex items-center gap-1 transition ${
                viewMode === "SPLIT" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200"
              }`}
              title="Modo Dividido (Editor + Preview)"
            >
              <Columns size={13} />
              <span className="hidden md:inline">Dividido</span>
            </button>
            <button
              onClick={() => onViewModeChange("PREVIEW")}
              className={`px-2.5 py-1 text-xs rounded-md flex items-center gap-1 transition ${
                viewMode === "PREVIEW" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200"
              }`}
              title="Modo Preview"
            >
              <Eye size={13} />
              <span className="hidden md:inline">Preview</span>
            </button>
          </div>

          {extraAction}

          <button
            onClick={onCreateVersion}
            className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-[#1a1a2b] hover:bg-[#25253d] border border-[#2a2a44] rounded-lg flex items-center gap-1.5 transition"
          >
            <Clock size={14} />
            <span className="hidden sm:inline">Criar Versão</span>
          </button>

          <button
            onClick={onExport}
            className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg flex items-center gap-1.5 shadow-sm transition"
          >
            <Share2 size={14} />
            <span>Exportar</span>
          </button>

          {onDelete && (
            <button
              onClick={onDelete}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
              title="Mover para Lixeira"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </header>

      {/* Main Studio Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Nav */}
        <aside className="w-12 border-r border-[#1e1e30] bg-[#0c0c14] flex flex-col items-center py-3 gap-3 shrink-0">
          <button
            onClick={() => onSidebarTabChange("OUTLINE")}
            className={`p-2 rounded-lg transition ${
              activeSidebarTab === "OUTLINE" ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" : "text-slate-400 hover:text-slate-200"
            }`}
            title="Sumário / Estrutura (Outline)"
          >
            <Layers size={18} />
          </button>
          <button
            onClick={() => onSidebarTabChange("VERSIONS")}
            className={`p-2 rounded-lg transition ${
              activeSidebarTab === "VERSIONS" ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" : "text-slate-400 hover:text-slate-200"
            }`}
            title="Histórico de Versões"
          >
            <Clock size={18} />
          </button>
          <button
            onClick={() => onSidebarTabChange("ASSETS")}
            className={`p-2 rounded-lg transition ${
              activeSidebarTab === "ASSETS" ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" : "text-slate-400 hover:text-slate-200"
            }`}
            title="Assets Físicos e Anexos"
          >
            <Paperclip size={18} />
          </button>
          <button
            onClick={() => onSidebarTabChange("RELATIONS")}
            className={`p-2 rounded-lg transition ${
              activeSidebarTab === "RELATIONS" ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" : "text-slate-400 hover:text-slate-200"
            }`}
            title="Relacionamentos e Derivações"
          >
            <GitBranch size={18} />
          </button>
          <div className="my-auto" />
          <button
            onClick={() => onSidebarTabChange("ATHENA")}
            className={`p-2 rounded-lg transition ${
              activeSidebarTab === "ATHENA" ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "text-amber-400/70 hover:text-amber-300"
            }`}
            title="Athena Copilot Criativo"
          >
            <Sparkles size={18} />
          </button>
        </aside>

        {/* Sidebar Panel Content */}
        <div className="w-64 border-r border-[#1e1e30] bg-[#0e0e18] flex flex-col shrink-0 overflow-y-auto">
          {sidebarContent}
        </div>

        {/* Main Editor & Workspace */}
        <main className="flex-1 flex flex-col bg-[#08080e] overflow-hidden">
          <div className="flex-1 flex overflow-hidden">{mainContent}</div>
          {bottomContent && (
            <div className="border-t border-[#1e1e30] bg-[#0c0c14] p-3 shrink-0">{bottomContent}</div>
          )}
        </main>
      </div>
    </div>
  );
}

