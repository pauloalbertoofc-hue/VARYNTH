"use client";

import { Search, Plus, Sparkles, Menu, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { JobMonitorPopover } from "@/components/runtime/JobMonitorPopover";

interface NavbarProps {
  title?: string;
  subtitle?: string;
}

export function Navbar({ title, subtitle }: NavbarProps) {
  const handleSignOut = async () => {
    const { signOut } = await import("next-auth/react");
    await signOut({ callbackUrl: "/login" });
  };
  const handleOpenSearch = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("open-command-palette"));
    }
  };

  const handleOpenQuickCreate = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("open-quick-create"));
    }
  };

  const handleToggleMobileSidebar = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("toggle-mobile-sidebar"));
    }
  };

  return (
    <header aria-label="Barra superior do VARYNTH" className="flex items-center justify-between h-14 px-3 sm:px-6 bg-[var(--vly-surface-glass)] border-b border-[var(--vly-border-default)] backdrop-blur-md sticky top-0 z-[var(--vly-z-raised)]">
      {/* Left: Mobile hamburger + page title */}
      <div className="flex items-center gap-2.5 min-w-0 pr-2">
        <button
          type="button"
          onClick={handleToggleMobileSidebar}
          className="lg:hidden vly-interactive p-2 rounded-[var(--vly-radius-md)] text-[var(--vly-text-secondary)] hover:text-[var(--vly-text-primary)] hover:bg-[var(--vly-surface-hover)] border border-[var(--vly-border-default)] flex-shrink-0 touch-manipulation"
          title="Abrir Menu de Navegação"
          aria-label="Abrir menu de navegação"
        >
          <Menu size={18} />
        </button>

        <div className="flex flex-col justify-center min-w-0">
          {title && (
            <h1 className="text-sm font-bold text-[var(--vly-text-primary)] leading-none truncate">{title}</h1>
          )}
          {subtitle && (
            <p className="text-[11px] text-[var(--vly-text-secondary)] mt-0.5 truncate hidden sm:block">{subtitle}</p>
          )}
        </div>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
        {/* Universal "+ Criar" button */}
        <button
          type="button"
          onClick={handleOpenQuickCreate}
          aria-label="Abrir criação rápida"
          className={cn(
            "flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold text-white",
            "bg-[var(--vly-accent)] hover:bg-[var(--vly-accent-hover)] text-[var(--vly-accent-contrast)]",
            "border border-[var(--vly-border-strong)] vly-interactive"
          )}
          title="Criação Rápida (Ctrl + J)"
        >
          <Plus size={14} className="stroke-[2.5]" />
          <span className="hidden xs:inline sm:inline">Criar</span>
        </button>

        {/* Search */}
        <button
          type="button"
          onClick={handleOpenSearch}
          aria-label="Abrir busca universal"
          className={cn(
            "flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-[var(--vly-radius-md)] text-xs text-[var(--vly-text-secondary)]",
            "bg-[var(--vly-surface-raised)] border border-[var(--vly-border-default)]",
            "hover:bg-[var(--vly-surface-hover)] hover:text-[var(--vly-text-primary)] hover:border-[var(--vly-border-strong)] vly-interactive"
          )}
          title="Busca Universal (Ctrl + K)"
        >
          <Search size={13} />
          <span className="hidden md:inline">Buscar...</span>
          <kbd className="hidden sm:inline text-[10px] bg-[var(--vly-surface-muted)] px-1.5 py-0.5 rounded border border-[var(--vly-border-subtle)] ml-1 font-mono">
            ⌘K
          </kbd>
        </button>

        {/* Background Jobs Monitor */}
        <JobMonitorPopover />

        {/* Notifications / Status */}
        <NotificationCenter />

        <button
          type="button"
          onClick={() => void handleSignOut()}
          className="vly-interactive p-2 rounded-[var(--vly-radius-md)] text-[var(--vly-text-secondary)] hover:text-[var(--vly-danger)] hover:bg-[color-mix(in_srgb,var(--vly-danger)_12%,transparent)]"
          title="Sair da plataforma"
          aria-label="Sair da plataforma"
        >
          <LogOut size={15} />
        </button>

        {/* System Pill */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--vly-radius-sm)] bg-[var(--vly-surface-raised)] border border-[var(--vly-border-default)] text-[10px] font-medium text-[var(--vly-text-secondary)]">
          <Sparkles size={11} className="text-[var(--vly-accent)]" />
          <span>VARYNTH OS</span>
        </div>
      </div>
    </header>
  );
}
