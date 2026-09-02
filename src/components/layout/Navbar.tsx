"use client";

import { Bell, Search, Plus, Sparkles, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { JobMonitorPopover } from "@/components/runtime/JobMonitorPopover";

interface NavbarProps {
  title?: string;
  subtitle?: string;
}

export function Navbar({ title, subtitle }: NavbarProps) {
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
    <header className="flex items-center justify-between h-14 px-3 sm:px-6 bg-[#0a0a0f]/85 border-b border-[#1e1e30] backdrop-blur-md sticky top-0 z-20">
      {/* Left: Mobile hamburger + page title */}
      <div className="flex items-center gap-2.5 min-w-0 pr-2">
        <button
          onClick={handleToggleMobileSidebar}
          className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 border border-[#1e1e30] flex-shrink-0 touch-manipulation"
          title="Abrir Menu de Navegação"
          aria-label="Abrir Menu"
        >
          <Menu size={18} />
        </button>

        <div className="flex flex-col justify-center min-w-0">
          {title && (
            <h1 className="text-sm font-bold text-slate-100 leading-none truncate">{title}</h1>
          )}
          {subtitle && (
            <p className="text-[11px] text-slate-400 mt-0.5 truncate hidden sm:block">{subtitle}</p>
          )}
        </div>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
        {/* Universal "+ Criar" button */}
        <button
          onClick={handleOpenQuickCreate}
          className={cn(
            "flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold text-white",
            "bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-500 hover:to-violet-600",
            "border border-violet-500/30 glow-accent transition-all duration-200"
          )}
          title="Criação Rápida (Ctrl + J)"
        >
          <Plus size={14} className="stroke-[2.5]" />
          <span className="hidden xs:inline sm:inline">Criar</span>
        </button>

        {/* Search */}
        <button
          onClick={handleOpenSearch}
          className={cn(
            "flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs text-slate-400",
            "bg-white/5 border border-[#1e1e30]",
            "hover:bg-white/10 hover:text-slate-200 hover:border-violet-500/30 transition-all duration-200"
          )}
          title="Busca Universal (Ctrl + K)"
        >
          <Search size={13} />
          <span className="hidden md:inline">Buscar...</span>
          <kbd className="hidden sm:inline text-[10px] bg-white/5 px-1.5 py-0.5 rounded border border-white/10 ml-1 font-mono">
            ⌘K
          </kbd>
        </button>

        {/* Background Jobs Monitor */}
        <JobMonitorPopover />

        {/* Notifications / Status */}
        <NotificationCenter />

        {/* System Pill */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#14141f] border border-[#1e1e30] text-[10px] font-medium text-violet-300">
          <Sparkles size={11} className="text-violet-400" />
          <span>VARYNTH OS</span>
        </div>
      </div>
    </header>
  );
}
