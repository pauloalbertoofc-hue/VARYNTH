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
          <span className="flex items-center gap-1 whitespace-nowrap rounded border border-[var(--vly-border-success)] bg-[var(--vly-success-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--vly-success)]">
            <ShieldCheck size={12} /> <span className="hidden xs:inline">Salvo</span>
          </span>
        );
      case "SAVING":
        return (
          <span className="flex items-center gap-1 whitespace-nowrap rounded border border-[var(--vly-border-warning)] bg-[var(--vly-warning-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--vly-warning)] animate-pulse">
            <Clock size={12} /> <span className="hidden xs:inline">Salvando...</span>
          </span>
        );
      case "UNSAVED":
        return (
          <span className="flex items-center gap-1 whitespace-nowrap rounded border border-[var(--vly-border-default)] bg-[var(--vly-surface-raised)] px-2 py-0.5 text-[11px] font-medium text-[var(--vly-text-secondary)]">
            Pendente
          </span>
        );
      case "STORAGE_PROTECTED":
        return (
          <span className="flex items-center gap-1 whitespace-nowrap rounded border border-[var(--vly-border-warning)] bg-[var(--vly-warning-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--vly-warning)]">
            <AlertTriangle size={12} /> Protegido
          </span>
        );
      case "SAVE_FAILED":
        return (
          <span className="flex items-center gap-1 whitespace-nowrap rounded border border-[var(--vly-border-danger)] bg-[var(--vly-danger-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--vly-danger)]">
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
    <div className="flex flex-col h-full bg-[var(--vly-world)] text-[var(--vly-text-primary)] overflow-hidden font-sans">
      {/* Studio Header */}
      <header className="h-14 border-b border-[var(--vly-border-default)] bg-[var(--vly-surface)] px-3 sm:px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 pr-2">
          {onBackToHub && (
            <button
              onClick={onBackToHub}
              className="vly-interactive px-2.5 py-1.5 rounded-[var(--vly-radius-md)] bg-[var(--vly-surface-raised)] hover:bg-[var(--vly-surface-hover)] text-[var(--vly-text-secondary)] hover:text-[var(--vly-text-primary)] border border-[var(--vly-border-default)] flex items-center gap-1.5 text-xs font-semibold group flex-shrink-0 touch-manipulation"
              title="Voltar ao Studio Hub"
            >
              <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
              <span className="hidden sm:inline">Studios</span>
            </button>
          )}

          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border border-[var(--vly-border-accent)] bg-[var(--vly-accent-soft)] text-[var(--vly-accent)] sm:h-8 sm:w-8">
            <FileText size={16} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="max-w-[140px] truncate text-xs font-semibold text-[var(--vly-text-primary)] sm:max-w-xs sm:text-sm md:max-w-md xs:max-w-[200px]">
                {title}
              </h1>
              {getSaveBadge()}
            </div>
            {subtitle && <p className="max-w-[180px] truncate text-[10px] text-[var(--vly-text-secondary)] sm:max-w-xs sm:text-xs">{subtitle}</p>}
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          <span className="mr-2 hidden text-xs text-[var(--vly-text-muted)] lg:inline">{wordCount} palavras</span>

          {/* View Mode Toggle */}
          <div role="group" aria-label="Modo de visualização" className="flex items-center bg-[var(--vly-surface-raised)] p-0.5 rounded-[var(--vly-radius-md)] border border-[var(--vly-border-default)]">
            <button
              onClick={() => onViewModeChange("EDIT")}
              className={`vly-interactive px-2 sm:px-2.5 py-1 text-xs rounded-md flex items-center gap-1 touch-manipulation ${
                viewMode === "EDIT" ? "bg-[var(--vly-accent)] text-[var(--vly-text-on-accent)] font-semibold" : "text-[var(--vly-text-secondary)] hover:text-[var(--vly-text-primary)]"
              }`}
              title="Modo Edição"
              aria-pressed={viewMode === "EDIT"}
            >
              <Edit3 size={13} />
              <span className="hidden md:inline">Editar</span>
            </button>
            <button
              onClick={() => onViewModeChange("SPLIT")}
              className={`vly-interactive px-2 sm:px-2.5 py-1 text-xs rounded-md flex items-center gap-1 touch-manipulation ${
                viewMode === "SPLIT" ? "bg-[var(--vly-accent)] text-[var(--vly-text-on-accent)] font-semibold" : "text-[var(--vly-text-secondary)] hover:text-[var(--vly-text-primary)]"
              }`}
              title="Modo Dividido (Editor + Preview)"
              aria-pressed={viewMode === "SPLIT"}
            >
              <Columns size={13} />
              <span className="hidden md:inline">Dividido</span>
            </button>
            <button
              onClick={() => onViewModeChange("PREVIEW")}
              className={`vly-interactive px-2 sm:px-2.5 py-1 text-xs rounded-md flex items-center gap-1 touch-manipulation ${
                viewMode === "PREVIEW" ? "bg-[var(--vly-accent)] text-[var(--vly-text-on-accent)] font-semibold" : "text-[var(--vly-text-secondary)] hover:text-[var(--vly-text-primary)]"
              }`}
              title="Modo Preview"
              aria-pressed={viewMode === "PREVIEW"}
            >
              <Eye size={13} />
              <span className="hidden md:inline">Preview</span>
            </button>
          </div>

          {/* Mobile Panel Toggle */}
          <button
            onClick={() => setIsMobilePanelOpen(!isMobilePanelOpen)}
              className={`md:hidden vly-interactive p-1.5 rounded-[var(--vly-radius-md)] border text-xs flex items-center gap-1 touch-manipulation ${
              isMobilePanelOpen ? "bg-[var(--vly-accent)] text-[var(--vly-accent-contrast)] border-[var(--vly-border-strong)]" : "bg-[var(--vly-surface-raised)] text-[var(--vly-text-secondary)] border-[var(--vly-border-default)]"
            }`}
            title="Abrir Painel Lateral"
          >
            <SlidersHorizontal size={14} />
          </button>

          {extraAction}

          <button
            onClick={onCreateVersion}
              className="hidden sm:flex vly-interactive px-3 py-1.5 text-xs font-medium text-[var(--vly-text-secondary)] hover:text-[var(--vly-text-primary)] bg-[var(--vly-surface-raised)] hover:bg-[var(--vly-surface-hover)] border border-[var(--vly-border-default)] rounded-[var(--vly-radius-md)] items-center gap-1.5 touch-manipulation"
          >
            <Clock size={14} />
            <span>Versão</span>
          </button>

          <button
            onClick={onExport}
            title="Exportar projeto"
            className="vly-interactive px-2.5 sm:px-3 py-1.5 text-xs font-medium text-[var(--vly-accent-contrast)] bg-[var(--vly-accent)] hover:bg-[var(--vly-accent-hover)] rounded-[var(--vly-radius-md)] flex items-center gap-1.5 shadow-sm touch-manipulation"
          >
            <Share2 size={14} />
            <span className="hidden xs:inline">Exportar</span>
          </button>

          {onDelete && (
            <button
              onClick={onDelete}
            className="vly-interactive rounded-lg p-1.5 text-[var(--vly-text-secondary)] hover:bg-[var(--vly-danger-soft)] hover:text-[var(--vly-danger)] touch-manipulation"
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
        <aside aria-label="Ferramentas do Studio" className="hidden md:flex w-12 border-r border-[var(--vly-border-default)] bg-[var(--vly-surface)] flex-col items-center py-3 gap-3 shrink-0">
          <button
            onClick={() => onSidebarTabChange("OUTLINE")}
            aria-label="Abrir estrutura do Studio"
            className={`vly-interactive p-2 rounded-lg ${
              activeSidebarTab === "OUTLINE" ? "bg-[var(--vly-accent-soft)] text-[var(--vly-accent)] border border-[var(--vly-border-accent)]" : "text-[var(--vly-text-secondary)] hover:text-[var(--vly-text-primary)]"
            }`}
            title="Sumário / Estrutura (Outline)"
          >
            <Layers size={18} />
          </button>
          <button
            onClick={() => onSidebarTabChange("VERSIONS")}
            aria-label="Abrir histórico de versões"
            className={`vly-interactive p-2 rounded-lg ${
              activeSidebarTab === "VERSIONS" ? "bg-[var(--vly-accent-soft)] text-[var(--vly-accent)] border border-[var(--vly-border-accent)]" : "text-[var(--vly-text-secondary)] hover:text-[var(--vly-text-primary)]"
            }`}
            title="Histórico de Versões"
          >
            <Clock size={18} />
          </button>
          <button
            onClick={() => onSidebarTabChange("ASSETS")}
            aria-label="Assets Físicos e Anexos"
            className={`vly-interactive p-2 rounded-lg ${
              activeSidebarTab === "ASSETS" ? "bg-[var(--vly-accent-soft)] text-[var(--vly-accent)] border border-[var(--vly-border-accent)]" : "text-[var(--vly-text-secondary)] hover:text-[var(--vly-text-primary)]"
            }`}
            title="Assets Físicos e Anexos"
          >
            <Paperclip size={18} />
          </button>
          <button
            onClick={() => onSidebarTabChange("RELATIONS")}
            aria-label="Abrir relacionamentos"
            className={`vly-interactive p-2 rounded-lg ${
              activeSidebarTab === "RELATIONS" ? "bg-[var(--vly-accent-soft)] text-[var(--vly-accent)] border border-[var(--vly-border-accent)]" : "text-[var(--vly-text-secondary)] hover:text-[var(--vly-text-primary)]"
            }`}
            title="Relacionamentos e Derivações"
          >
            <GitBranch size={18} />
          </button>
          <div className="my-auto" />
          <button
            onClick={() => onSidebarTabChange("ATHENA")}
            aria-label="Abrir Athena no Studio"
            className={`vly-interactive p-2 rounded-lg ${
              activeSidebarTab === "ATHENA" ? "bg-[var(--vly-warning-soft)] text-[var(--vly-warning)] border border-[var(--vly-border-warning)]" : "text-[var(--vly-warning)]/70 hover:text-[var(--vly-warning)]"
            }`}
            title="Athena Copilot Criativo"
          >
            <Sparkles size={18} />
          </button>
        </aside>

        {/* Desktop Sidebar Panel Content */}
        <div className="hidden md:flex w-64 border-r border-[var(--vly-border-default)] bg-[var(--vly-surface-raised)] flex-col shrink-0 overflow-y-auto">
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
            <div role="dialog" aria-modal="true" aria-label={`Painel ${activeSidebarTab}`} className="md:hidden fixed inset-y-0 right-0 z-40 w-72 max-w-[85vw] bg-[var(--vly-surface-raised)] border-l border-[var(--vly-border-default)] shadow-2xl flex flex-col animate-slide-left">
              <div className="h-12 px-4 border-b border-[var(--vly-border-default)] bg-[var(--vly-surface)] flex items-center justify-between shrink-0">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--vly-text-primary)]">
                  Painel · {activeSidebarTab}
                </span>
                <button
                  onClick={() => setIsMobilePanelOpen(false)}
                  className="vly-interactive rounded-lg p-1 text-[var(--vly-text-secondary)] hover:text-[var(--vly-text-primary)]"
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
        <main className="flex-1 flex flex-col bg-[var(--vly-world)] overflow-hidden min-w-0">
          <div className="flex-1 flex overflow-hidden min-w-0">{mainContent}</div>
          {bottomContent && (
            <div className="border-t border-[var(--vly-border-default)] bg-[var(--vly-surface)] p-2 sm:p-3 shrink-0">{bottomContent}</div>
          )}

          {/* Mobile Bottom Studio Panel Navigation Bar */}
          <div className="md:hidden border-t border-[var(--vly-border-default)] bg-[var(--vly-surface)] px-2 py-1.5 flex items-center justify-around shrink-0">
            <button
              onClick={() => handleMobileTabClick("OUTLINE")}
              aria-label="Abrir estrutura do Studio"
              className={`vly-interactive p-2 rounded-lg flex flex-col items-center gap-0.5 text-[10px] ${
                activeSidebarTab === "OUTLINE" && isMobilePanelOpen ? "text-[var(--vly-accent)] bg-[var(--vly-accent-soft)]" : "text-[var(--vly-text-secondary)]"
              }`}
            >
              <Layers size={16} />
              <span>Outline</span>
            </button>
            <button
              onClick={() => handleMobileTabClick("VERSIONS")}
              aria-label="Abrir histórico de versões"
              className={`vly-interactive p-2 rounded-lg flex flex-col items-center gap-0.5 text-[10px] ${
                activeSidebarTab === "VERSIONS" && isMobilePanelOpen ? "text-[var(--vly-accent)] bg-[var(--vly-accent-soft)]" : "text-[var(--vly-text-secondary)]"
              }`}
            >
              <Clock size={16} />
              <span>Versões</span>
            </button>
            <button
              onClick={() => handleMobileTabClick("ASSETS")}
                aria-label="Assets Físicos e Anexos"
              className={`vly-interactive p-2 rounded-lg flex flex-col items-center gap-0.5 text-[10px] ${
                activeSidebarTab === "ASSETS" && isMobilePanelOpen ? "text-[var(--vly-accent)] bg-[var(--vly-accent-soft)]" : "text-[var(--vly-text-secondary)]"
              }`}
            >
              <Paperclip size={16} />
              <span>Assets</span>
            </button>
            <button
              onClick={() => handleMobileTabClick("RELATIONS")}
              aria-label="Abrir relacionamentos"
              className={`vly-interactive p-2 rounded-lg flex flex-col items-center gap-0.5 text-[10px] ${
                activeSidebarTab === "RELATIONS" && isMobilePanelOpen ? "text-[var(--vly-accent)] bg-[var(--vly-accent-soft)]" : "text-[var(--vly-text-secondary)]"
              }`}
            >
              <GitBranch size={16} />
              <span>Relações</span>
            </button>
            <button
              onClick={() => handleMobileTabClick("ATHENA")}
              aria-label="Abrir Athena no Studio"
              className={`vly-interactive p-2 rounded-lg flex flex-col items-center gap-0.5 text-[10px] ${
                activeSidebarTab === "ATHENA" && isMobilePanelOpen ? "text-[var(--vly-warning)] bg-[var(--vly-warning-soft)]" : "text-[var(--vly-warning)]/70"
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
