"use client";

import { Bell, Search, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavbarProps {
  title?: string;
  subtitle?: string;
}

export function Navbar({ title, subtitle }: NavbarProps) {
  return (
    <header className="flex items-center justify-between h-14 px-6 bg-[#0a0a0f]/80 border-b border-[#1e1e30] backdrop-blur-sm sticky top-0 z-10">
      {/* Left: page title */}
      <div className="flex flex-col justify-center">
        {title && (
          <h1 className="text-sm font-semibold text-slate-100 leading-none">{title}</h1>
        )}
        {subtitle && (
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        )}
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <button
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-slate-400",
            "bg-white/5 border border-[#1e1e30]",
            "hover:bg-white/10 hover:text-slate-200 transition-all duration-200"
          )}
        >
          <Search size={12} />
          <span className="hidden sm:inline">Buscar...</span>
          <kbd className="hidden sm:inline text-[10px] bg-white/5 px-1.5 py-0.5 rounded border border-white/10 ml-1">
            ⌘K
          </kbd>
        </button>

        {/* Notifications */}
        <button className={cn(
          "relative w-8 h-8 rounded-lg flex items-center justify-center",
          "text-slate-400 hover:text-slate-100 hover:bg-white/5",
          "border border-[#1e1e30] hover:border-violet-500/30 transition-all duration-200"
        )}>
          <Bell size={14} />
          {/* Notification dot */}
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-violet-400 rounded-full" />
        </button>

        {/* Settings */}
        <button className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center",
          "text-slate-400 hover:text-slate-100 hover:bg-white/5",
          "border border-[#1e1e30] hover:border-violet-500/30 transition-all duration-200"
        )}>
          <Settings size={14} />
        </button>
      </div>
    </header>
  );
}

