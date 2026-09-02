"use client";

import React, { ReactNode, useState } from "react";
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
  ArrowLeft,
  X,
  SlidersHorizontal,
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
  onBackToHub?: () => void;
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
  onBackToHub,
  wordCount = 0,
  extraAction,
  sidebarContent,
  mainContent,
  bottomContent,
}: StudioShellProps) {
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false);

  const getSaveBadge = () => {
    switch (saveState) {
      case "SAVED":
        return (
          <span className="flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 whitespace-nowrap font-medium">
            <ShieldCheck size={12} /> <span className="hidden xs:inline">Salvo</span>
          </span>
        );
      case "SAVING":
        return (
          <span className="flex items-center gap-1 text-[11px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 animate-pulse whitespace-nowrap font-medium">
            <Clock size={12} /> <span className="hidden xs:inline">Salvando...</span>
          </span>
        );
      case "UNSAVED":
        return (
          <span className="flex items-center gap-1 text-[11px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700 whitespace-nowrap font-medium">
            Pendente
          </span>
        );
      case "STORAGE_PROTECTED":
        return (
          <span className="flex items-center gap-1 text-[11px] text-amber-300 bg-amber-900/30 px-2 py-0.5 rounded border border-amber-600/40 whitespace-nowrap font-medium">
            <AlertTriangle size={12} /> Protegido
          </span>
        );
      case "SAVE_FAILED":
        return (
          <span className="flex items-center gap-1 text-[11px] text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 whitespace-nowrap font-medium">
            <AlertTriangle size={12} /> Falha
          </span>
        );
    }
  };

  const handleMobileTabClick = (tab: "OUTLINE" | "VERSIONS" | "ASSETS" | "RELATIONS" | "ATHENA") => {
    onSidebarTabChange(tab);
    setIsMobilePanelOpen(true);
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a10] text-slate-200 overflow-hidden font-sans">
      {/* Studio Header */}
      <header className="h-14 border-b border-[#1e1e30] bg-[#0d0d16] px-3 sm:px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 pr-2">
          {onBackToHub && (
            <button
              onClick={onBackToHub}
              className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-[#222238] flex items-center gap-1.5 text-xs font-semibold transition group flex-shrink-0 touch-manipulation"
              title="Voltar ao Studio Hub"
            >
              <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
              <span className="hidden sm:inline">Studios</span>
            </button>
          )}

          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 flex-shrink-0">
            <FileText size={16} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="font-semibold text-xs sm:text-sm text-white truncate max-w-[140px] xs:max-w-[200px] sm:max-w-xs md:max-w-md">
                {title}
              </h1>
              {getSaveBadge()}
            </div>
            {subtitle && <p className="text-[10px] sm:text-xs text-slate-400 truncate max-w-[180px] sm:max-w-xs">{subtitle}</p>}
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          <span className="text-xs text-slate-500 hidden lg:inline mr-2">{wordCount} palavras</span>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-[#141422] p-0.5 rounded-lg border border-[#222236]">
            <button
              onClick={() => onViewModeChange("EDIT")}
              className={`px-2 sm:px-2.5 py-1 text-xs rounded-md flex items-center gap-1 transition touch-manipulation ${
                viewMode === "EDIT" ? "bg-blue-600 text-white font-semibold" : "text-slate-400 hover:text-slate-200"
              }`}
              title="Modo Edição"
            >
              <Edit3 size={13} />
              <span className="hidden md:inline">Editar</span>
            </button>
            <button
              onClick={() => onViewModeChange("SPLIT")}
              className={`px-2 sm:px-2.5 py-1 text-xs rounded-md flex items-center gap-1 transition touch-manipulation ${
                viewMode === "SPLIT" ? "bg-blue-600 text-white font-semibold" : "text-slate-400 hover:text-slate-200"
              }`}
              title="Modo Dividido (Editor + Preview)"
            >
              <Columns size={13} />
              <span className="hidden md:inline">Dividido</span>
            </button>
            <button
              onClick={() => onViewModeChange("PREVIEW")}
              className={`px-2 sm:px-2.5 py-1 text-xs rounded-md flex items-center gap-1 transition touch-manipulation ${
                viewMode === "PREVIEW" ? "bg-blue-600 text-white font-semibold" : "text-slate-400 hover:text-slate-200"
              }`}
              title="Modo Preview"
            >
              <Eye size={13} />
              <span className="hidden md:inline">Preview</span>
            </button>
          </div>

          {/* Mobile Panel Toggle */}
          <button
            onClick={() => setIsMobilePanelOpen(!isMobilePanelOpen)}
            className={`md:hidden p-1.5 rounded-lg border text-xs flex items-center gap-1 transition touch-manipulation ${
              isMobilePanelOpen ? "bg-blue-600 text-white border-blue-500" : "bg-[#141422] text-slate-300 border-[#222236]"
            }`}
            title="Abrir Painel Lateral"
          >
            <SlidersHorizontal size={14} />
          </button>

          {extraAction}

          <button
            onClick={onCreateVersion}
            className="hidden sm:flex px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-[#1a1a2b] hover:bg-[#25253d] border border-[#2a2a44] rounded-lg items-center gap-1.5 transition touch-manipulation"
          >
            <Clock size={14} />
            <span>Versão</span>
          </button>

          <button
            onClick={onExport}
            className="px-2.5 sm:px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg flex items-center gap-1.5 shadow-sm transition touch-manipulation"
          >
            <Share2 size={14} />
            <span className="hidden xs:inline">Exportar</span>
          </button>

          {onDelete && (
            <button
              onClick={onDelete}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition touch-manipulation"
              title="Mover para Lixeira"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </header>

      {/* Main Studio Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Desktop Sidebar Icon Strip (hidden on mobile) */}
        <aside className="hidden md:flex w-12 border-r border-[#1e1e30] bg-[#0c0c14] flex-col items-center py-3 gap-3 shrink-0">
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

        {/* Desktop Sidebar Panel Content */}
        <div className="hidden md:flex w-64 border-r border-[#1e1e30] bg-[#0e0e18] flex-col shrink-0 overflow-y-auto">
          {sidebarContent}
        </div>

        {/* Mobile Slide-Out Panel Drawer (with backdrop) */}
        {isMobilePanelOpen && (
          <>
            <div
              onClick={() => setIsMobilePanelOpen(false)}
              className="md:hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-30 animate-fade-in"
              aria-hidden="true"
            />
            <div className="md:hidden fixed inset-y-0 right-0 z-40 w-72 max-w-[85vw] bg-[#0e0e18] border-l border-[#1e1e30] shadow-2xl flex flex-col animate-slide-left">
              <div className="h-12 px-4 border-b border-[#1e1e30] bg-[#0c0c14] flex items-center justify-between shrink-0">
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Painel · {activeSidebarTab}
                </span>
                <button
                  onClick={() => setIsMobilePanelOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {sidebarContent}
              </div>
            </div>
          </>
        )}

        {/* Main Editor & Workspace (100% width on mobile) */}
        <main className="flex-1 flex flex-col bg-[#08080e] overflow-hidden min-w-0">
          <div className="flex-1 flex overflow-hidden min-w-0">{mainContent}</div>
          {bottomContent && (
            <div className="border-t border-[#1e1e30] bg-[#0c0c14] p-2 sm:p-3 shrink-0">{bottomContent}</div>
          )}

          {/* Mobile Bottom Studio Panel Navigation Bar */}
          <div className="md:hidden border-t border-[#1e1e30] bg-[#0a0a10] px-2 py-1.5 flex items-center justify-around shrink-0">
            <button
              onClick={() => handleMobileTabClick("OUTLINE")}
              className={`p-2 rounded-lg flex flex-col items-center gap-0.5 text-[10px] transition ${
                activeSidebarTab === "OUTLINE" && isMobilePanelOpen ? "text-blue-400 bg-blue-500/10" : "text-slate-400"
              }`}
            >
              <Layers size={16} />
              <span>Outline</span>
            </button>
            <button
              onClick={() => handleMobileTabClick("VERSIONS")}
              className={`p-2 rounded-lg flex flex-col items-center gap-0.5 text-[10px] transition ${
                activeSidebarTab === "VERSIONS" && isMobilePanelOpen ? "text-blue-400 bg-blue-500/10" : "text-slate-400"
              }`}
            >
              <Clock size={16} />
              <span>Versões</span>
            </button>
            <button
              onClick={() => handleMobileTabClick("ASSETS")}
              className={`p-2 rounded-lg flex flex-col items-center gap-0.5 text-[10px] transition ${
                activeSidebarTab === "ASSETS" && isMobilePanelOpen ? "text-blue-400 bg-blue-500/10" : "text-slate-400"
              }`}
            >
              <Paperclip size={16} />
              <span>Assets</span>
            </button>
            <button
              onClick={() => handleMobileTabClick("RELATIONS")}
              className={`p-2 rounded-lg flex flex-col items-center gap-0.5 text-[10px] transition ${
                activeSidebarTab === "RELATIONS" && isMobilePanelOpen ? "text-blue-400 bg-blue-500/10" : "text-slate-400"
              }`}
            >
              <GitBranch size={16} />
              <span>Relações</span>
            </button>
            <button
              onClick={() => handleMobileTabClick("ATHENA")}
              className={`p-2 rounded-lg flex flex-col items-center gap-0.5 text-[10px] transition ${
                activeSidebarTab === "ATHENA" && isMobilePanelOpen ? "text-amber-400 bg-amber-500/10" : "text-amber-400/70"
              }`}
            >
              <Sparkles size={16} />
              <span>Athena</span>
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
