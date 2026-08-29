"use client";

import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FolderKanban,
  BookOpen,
  Clock,
  Users,
  FlaskConical,
  Bot,
  Scale,
  GraduationCap,
  Trophy,
  Code2,
  ExternalLink,
  User,
  ChevronLeft,
  ChevronRight,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

interface NavSectionItem {
  href: string;
  icon: React.ElementType;
  label: string;
  badge?: string;
  external?: boolean;
}

const systemNavItems: NavSectionItem[] = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Início" },
  { href: "/projects", icon: FolderKanban, label: "Projetos", badge: "Principal" },
  { href: "/modules/vault", icon: BookOpen, label: "Vault" },
  { href: "/modules/chronos", icon: Clock, label: "Chronos" },
  { href: "/modules/people", icon: Users, label: "People" },
  { href: "/modules/labs", icon: FlaskConical, label: "Labs" },
];

const personalNavItems: NavSectionItem[] = [
  { href: "/modules/athena", icon: Bot, label: "Athena AI", badge: "IA" },
  { href: "/modules/codex", icon: Scale, label: "Codex" },
  { href: "/modules/research", icon: GraduationCap, label: "Research" },
  { href: "/modules/opportunities", icon: Trophy, label: "Opportunities" },
  { href: "/modules/forge", icon: Code2, label: "Forge" },
  { href: "http://localhost:8000", icon: ExternalLink, label: "LigaHub", external: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "relative flex flex-col h-screen bg-[#0a0a0f] border-r border-[#1e1e30] z-30",
        "transition-all duration-300 ease-in-out select-none",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo Header */}
      <div
        className={cn(
          "flex items-center gap-3 px-4 py-4 border-b border-[#1e1e30]",
          collapsed && "justify-center px-0"
        )}
      >
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <div className="flex-shrink-0 w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center glow-accent group-hover:scale-105 transition-transform">
            <Zap size={16} className="text-white" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-xs font-black tracking-[0.25em] text-slate-100 text-glow-accent uppercase">
                VARYNTH
              </span>
              <span className="text-[9px] tracking-wider text-slate-500 font-mono">
                OS · UNIVERSE
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* Nav List */}
      <nav className="flex-1 py-4 space-y-6 px-2.5 overflow-y-auto overflow-x-hidden">
        {/* System Apps */}
        <div>
          {!collapsed && (
            <p className="px-2.5 pb-2 text-[10px] font-bold text-slate-500 tracking-[0.18em] uppercase">
              Sistema
            </p>
          )}
          <div className="space-y-1">
            {systemNavItems.map(({ href, icon: Icon, label, badge }) => {
              const isActive =
                pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  title={collapsed ? label : undefined}
                  className={cn(
                    "flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium",
                    "transition-all duration-150 group relative",
                    isActive
                      ? "bg-violet-600/20 text-violet-300 border border-violet-500/30"
                      : "text-slate-400 hover:text-slate-100 hover:bg-white/5",
                    collapsed && "justify-center px-0"
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      size={16}
                      className={cn(
                        "flex-shrink-0 transition-colors",
                        isActive ? "text-violet-400" : "text-slate-500 group-hover:text-slate-300"
                      )}
                    />
                    {!collapsed && <span className="truncate">{label}</span>}
                  </div>
                  {!collapsed && badge && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20 font-semibold">
                      {badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Personal Apps */}
        <div>
          {!collapsed && (
            <p className="px-2.5 pb-2 text-[10px] font-bold text-slate-500 tracking-[0.18em] uppercase">
              Apps Pessoais
            </p>
          )}
          <div className="space-y-1">
            {personalNavItems.map(({ href, icon: Icon, label, badge, external }) => {
              const isActive = pathname === href || pathname.startsWith(href);
              const linkProps = external
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {};

              return (
                <Link
                  key={href}
                  href={href}
                  {...linkProps}
                  title={collapsed ? label : undefined}
                  className={cn(
                    "flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium",
                    "transition-all duration-150 group relative",
                    isActive
                      ? "bg-cyan-600/20 text-cyan-300 border border-cyan-500/30"
                      : "text-slate-400 hover:text-slate-100 hover:bg-white/5",
                    collapsed && "justify-center px-0"
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      size={16}
                      className={cn(
                        "flex-shrink-0 transition-colors",
                        isActive ? "text-cyan-400" : "text-slate-500 group-hover:text-slate-300"
                      )}
                    />
                    {!collapsed && <span className="truncate">{label}</span>}
                  </div>
                  {!collapsed && badge && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-semibold">
                      {badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Profile & Footer */}
      <div className="p-2.5 border-t border-[#1e1e30] space-y-1">
        <Link
          href="/profile"
          className={cn(
            "flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-100 hover:bg-white/5 transition-all",
            pathname === "/profile" && "bg-violet-600/20 text-violet-300 border border-violet-500/30",
            collapsed && "justify-center px-0"
          )}
          title={collapsed ? "Perfil do Dono" : undefined}
        >
          <div className="w-6 h-6 rounded-md bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400 flex-shrink-0">
            <User size={13} />
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-slate-200 font-semibold truncate leading-tight">Paulo</span>
              <span className="text-[10px] text-slate-500 leading-tight">Dono do VARYNTH</span>
            </div>
          )}
        </Link>
      </div>

      {/* Collapse button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className={cn(
          "absolute -right-3 top-7 w-6 h-6 rounded-full",
          "bg-[#14141f] border border-[#1e1e30] text-slate-400",
          "flex items-center justify-center",
          "hover:text-slate-100 hover:border-violet-500/50 transition-all duration-200",
          "z-40 shadow-md"
        )}
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </aside>
  );
}
