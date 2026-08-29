"use client";

import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Grid3x3,
  Bot,
  Code2,
  User,
  ChevronLeft,
  ChevronRight,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/modules", icon: Grid3x3, label: "Apps" },
  { href: "/modules/athena", icon: Bot, label: "Athena" },
  { href: "/modules/studio", icon: Code2, label: "Studio" },
  { href: "/profile", icon: User, label: "Perfil" },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "relative flex flex-col h-screen bg-[#0a0a0f] border-r border-[#1e1e30]",
        "transition-all duration-300 ease-in-out",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div className={cn(
        "flex items-center gap-3 px-4 py-5 border-b border-[#1e1e30]",
        collapsed && "justify-center px-0"
      )}>
        <div className="flex-shrink-0 w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center glow-accent">
          <Zap size={16} className="text-white" />
        </div>
        {!collapsed && (
          <span className="text-sm font-bold tracking-[0.2em] text-slate-100 text-glow-accent">
            VARYNTH
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium",
                "transition-all duration-200 group relative",
                isActive
                  ? "bg-violet-600/20 text-violet-300 border border-violet-500/30"
                  : "text-slate-400 hover:text-slate-100 hover:bg-white/5",
                collapsed && "justify-center px-0"
              )}
            >
              {/* Active indicator */}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-violet-400 rounded-full" />
              )}
              <Icon
                size={18}
                className={cn(
                  "flex-shrink-0 transition-colors",
                  isActive ? "text-violet-400" : "text-slate-500 group-hover:text-slate-300"
                )}
              />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className={cn(
          "absolute -right-3 top-8 w-6 h-6 rounded-full",
          "bg-[#14141f] border border-[#1e1e30] text-slate-400",
          "flex items-center justify-center",
          "hover:text-slate-100 hover:border-violet-500/50 transition-all duration-200",
          "z-10"
        )}
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>

      {/* Bottom: version */}
      {!collapsed && (
        <div className="px-4 py-3 border-t border-[#1e1e30]">
          <p className="text-[10px] text-slate-600 tracking-wider">VARYNTH v0.1.0</p>
        </div>
      )}
    </aside>
  );
}

