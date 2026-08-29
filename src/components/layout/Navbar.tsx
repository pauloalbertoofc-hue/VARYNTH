"use client";

import { Bell, Search, Plus, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

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

  return (
    <header className="flex items-center justify-between h-14 px-4 sm:px-6 bg-[#0a0a0f]/85 border-b border-[#1e1e30] backdrop-blur-md sticky top-0 z-20">
      {/* Left: page title */}
      <div className="flex flex-col justify-center min-w-0 pr-2">
        {title && (
          <h1 className="text-sm font-bold text-slate-100 leading-none truncate">{title}</h1>
        )}
        {subtitle && (
          <p className="text-[11px] text-slate-400 mt-0.5 truncate hidden sm:block">{subtitle}</p>
        )}
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        {/* Universal "+ Criar" button */}
        <button
          onClick={handleOpenQuickCreate}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white",
            "bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-500 hover:to-violet-600",
            "border border-violet-500/30 glow-accent transition-all duration-200"
          )}
          title="Criação Rápida (Ctrl + J)"
        >
          <Plus size={14} className="stroke-[2.5]" />
          <span>Criar</span>
        </button>

        {/* Search */}
        <button
          onClick={handleOpenSearch}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-slate-400",
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

        {/* Notifications / Status */}
        <button
          className={cn(
            "relative w-8 h-8 rounded-lg flex items-center justify-center",
            "text-slate-400 hover:text-slate-100 hover:bg-white/5",
            "border border-[#1e1e30] hover:border-violet-500/30 transition-all duration-200"
          )}
          title="Notificações do Sistema"
        >
          <Bell size={14} />
          <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
        </button>

        {/* System Pill */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#14141f] border border-[#1e1e30] text-[10px] font-medium text-violet-300">
          <Sparkles size={11} className="text-violet-400" />
          <span>VARYNTH OS</span>
        </div>
      </div>
    </header>
  );
}
