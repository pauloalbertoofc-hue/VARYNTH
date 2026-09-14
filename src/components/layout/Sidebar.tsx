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
  ChevronDown,
  Zap,
  Share2,
  Trash2,
  Activity,
  ShieldCheck,
  BookMarked,
  Palette,
  FileText,
  Globe,
  Image as ImageIcon,
  Music,
  Download,
  Video as VideoIcon,
  Gamepad2,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { STUDIO_DEFINITIONS } from "@/lib/studio/studio-registry";
import { usePlatformPreferences } from "@/components/customization/CustomizationProvider";
import { isClientRole } from "@/lib/auth/client-access";

interface NavSectionItem {
  href: string;
  icon: React.ElementType;
  label: string;
  badge?: string;
  external?: boolean;
}

const systemNavItems: NavSectionItem[] = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Início" },
  { href: "/admin", icon: ShieldCheck, label: "Administração" },
  { href: "/download", icon: Download, label: "Baixar aplicativo" },
  { href: "/projects", icon: FolderKanban, label: "Projetos", badge: "Principal" },
  { href: "/modules/technical-archive", icon: BookMarked, label: "Technical Docs", badge: "Oficial" },
  { href: "/modules/graph", icon: Share2, label: "Graph Rede" },
  { href: "/modules/activity", icon: Activity, label: "Histórico" },
  { href: "/modules/vault", icon: BookOpen, label: "Vault" },
  { href: "/modules/chronos", icon: Clock, label: "Chronos" },
  { href: "/modules/people", icon: Users, label: "People" },
  { href: "/modules/labs", icon: FlaskConical, label: "Labs" },
  { href: "/modules/trash", icon: Trash2, label: "Lixeira", badge: "10d" },
];

const personalNavItems: NavSectionItem[] = [
  { href: "/modules/athena", icon: Bot, label: "Athena AI", badge: "IA" },
  { href: "/modules/music", icon: Music, label: "Música", badge: "1.3" },
  { href: "/modules/codex", icon: Scale, label: "Codex" },
  { href: "/modules/research", icon: GraduationCap, label: "Research" },
  { href: "/modules/opportunities", icon: Trophy, label: "Opportunities" },
  { href: "/modules/forge", icon: Code2, label: "Forge" },
  { href: "http://localhost:8000", icon: ExternalLink, label: "LigaHub", badge: "Local", external: true },
];

const studioIconMap: Record<string, React.ElementType> = {
  FileText,
  Globe,
  Image: ImageIcon,
  Music,
  Video: VideoIcon,
  Gamepad2,
};

function SidebarContent() {
  const preferences = usePlatformPreferences();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [collapsed, setCollapsed] = useState(false);
  const [studiosExpanded, setStudiosExpanded] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [role, setRole] = useState<string>("owner");
  const clientAccount = isClientRole(role);

  useEffect(() => {
    let active = true;
    void import("next-auth/react").then(({ getSession }) => getSession()).then((session) => {
      const nextRole = (session?.user as { role?: string } | undefined)?.role;
      if (active && nextRole) setRole(nextRole);
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  const activeStudioQuery = searchParams.get("studio")?.toUpperCase();
  const isStudioPath = pathname.startsWith("/modules/studio");

  // Keep expanded if active in studio path
  useEffect(() => {
    if (isStudioPath) {
      setStudiosExpanded(true);
    }
  }, [isStudioPath]);

  // Mobile drawer event listeners
  useEffect(() => {
    const handleToggle = () => setIsMobileOpen((prev) => !prev);
    const handleOpen = () => setIsMobileOpen(true);
    const handleClose = () => setIsMobileOpen(false);

    window.addEventListener("toggle-mobile-sidebar", handleToggle);
    window.addEventListener("open-mobile-sidebar", handleOpen);
    window.addEventListener("close-mobile-sidebar", handleClose);

    return () => {
      window.removeEventListener("toggle-mobile-sidebar", handleToggle);
      window.removeEventListener("open-mobile-sidebar", handleOpen);
      window.removeEventListener("close-mobile-sidebar", handleClose);
    };
  }, []);

  // Close mobile drawer on navigation
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname, searchParams]);

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar (Drawer on mobile, Collapsible on desktop) */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col h-[100dvh] bg-[#0a0a0f] border-r border-[#1e1e30] select-none",
          "transition-all duration-300 ease-in-out",
          // Mobile state
          isMobileOpen ? "translate-x-0 shadow-2xl w-72" : "-translate-x-full lg:translate-x-0",
          // Desktop state
          "lg:static lg:z-30",
          collapsed ? "lg:w-16" : "lg:w-64"
        )}
      >
        {/* Logo Header */}
        <div
          className={cn(
            "flex items-center justify-between px-4 py-3.5 border-b border-[#1e1e30]",
            collapsed && "lg:justify-center lg:px-0"
          )}
        >
          <Link
            href="/dashboard"
            onClick={() => setIsMobileOpen(false)}
            className="flex items-center gap-2.5 group"
          >
            <div className="flex-shrink-0 w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center glow-accent group-hover:scale-105 transition-transform">
              <Zap size={16} className="text-white" />
            </div>
            {(!collapsed || isMobileOpen) && (
              <div className="flex flex-col">
                <span className="text-xs font-black tracking-[0.25em] text-slate-100 text-glow-accent uppercase">
                  {preferences.appName}
                </span>
                <span className="text-[9px] tracking-wider text-slate-500 font-mono">
                  OS · UNIVERSE
                </span>
              </div>
            )}
          </Link>

          {/* Close button on mobile */}
          <button
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
            aria-label="Fechar menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav List */}
        <nav className="flex-1 py-4 space-y-6 px-2.5 overflow-y-auto overflow-x-hidden touch-pan-y">
          {/* System Apps */}
          <div>
            {(!collapsed || isMobileOpen) && (
              <p className="px-2.5 pb-2 text-[10px] font-bold text-slate-500 tracking-[0.18em] uppercase">
                Sistema
              </p>
            )}
            <div className="space-y-1">
              {systemNavItems.filter(({ href }) => (!clientAccount || href === "/dashboard" || href === "/download" || href === "/modules/vault") && (href === "/dashboard" || href === "/admin" || href === "/download" || !preferences.hiddenNavigation.includes(href as never))).map(({ href, icon: Icon, label, badge }) => {
                const isActive =
                  pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setIsMobileOpen(false)}
                    className={cn(
                      "flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all group min-h-[42px]",
                      isActive
                        ? "bg-violet-600/20 text-violet-300 border border-violet-500/30"
                        : "text-slate-400 hover:text-slate-100 hover:bg-white/5 border border-transparent",
                      collapsed && !isMobileOpen && "justify-center px-0 min-h-[40px]"
                    )}
                    title={collapsed && !isMobileOpen ? label : undefined}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        size={16}
                        className={cn(
                          "flex-shrink-0 transition-colors",
                          isActive ? "text-violet-400" : "text-slate-500 group-hover:text-slate-300"
                        )}
                      />
                      {(!collapsed || isMobileOpen) && <span className="truncate">{label}</span>}
                    </div>
                    {(!collapsed || isMobileOpen) && badge && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20 font-semibold">
                        {badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Creative Studios (Collapsible Section) */}
          <div>
            <div
              className={cn(
                "flex items-center justify-between px-2.5 pb-2 cursor-pointer group",
                collapsed && !isMobileOpen && "hidden"
              )}
              onClick={() => setStudiosExpanded(!studiosExpanded)}
            >
              <p className="text-[10px] font-bold text-slate-500 tracking-[0.18em] uppercase group-hover:text-slate-400 transition-colors">
                Studios Criativos
              </p>
              <div className="flex items-center gap-1">
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-400 font-mono">
                  6 Studios
                </span>
                <ChevronDown
                  size={12}
                  className={cn(
                    "text-slate-500 transition-transform duration-200",
                    !studiosExpanded && "-rotate-90"
                  )}
                />
              </div>
            </div>

            <div className="space-y-1">
              {/* Studio Hub Master Link */}
              {(!clientAccount || !preferences.hiddenNavigation.includes("/modules/studio")) && <Link
                href="/modules/studio"
                onClick={() => setIsMobileOpen(false)}
                className={cn(
                  "flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all group min-h-[42px]",
                  isStudioPath && !activeStudioQuery
                    ? "bg-indigo-600/25 text-indigo-200 border border-indigo-500/40 shadow-sm"
                    : "text-slate-400 hover:text-slate-100 hover:bg-white/5 border border-transparent",
                  collapsed && !isMobileOpen && "justify-center px-0 min-h-[40px]"
                )}
                title={collapsed && !isMobileOpen ? "Studios Hub" : undefined}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Palette
                    size={16}
                    className={cn(
                      "flex-shrink-0 transition-colors",
                      isStudioPath && !activeStudioQuery
                        ? "text-indigo-400"
                        : "text-slate-500 group-hover:text-slate-300"
                    )}
                  />
                  {(!collapsed || isMobileOpen) && <span className="truncate">Studios Hub</span>}
                </div>
                {(!collapsed || isMobileOpen) && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-semibold font-mono">
                    HUB
                  </span>
                )}
              </Link>}

              {/* Sub-Studios (Expanded View) */}
              {(studiosExpanded || collapsed) && (
                <div className={cn("space-y-0.5", (!collapsed || isMobileOpen) && "pl-2 border-l border-[#1a1b2e] ml-3 mt-1")}>
                  {STUDIO_DEFINITIONS.filter((s) => !preferences.hiddenNavigation.includes("/modules/studio" as never)).map((s) => {
                    const Icon = studioIconMap[s.iconName] || Palette;
                    const isActive = isStudioPath && activeStudioQuery === s.type;

                    return (
                      <Link
                        key={s.type}
                        href={s.href}
                        onClick={() => setIsMobileOpen(false)}
                        className={cn(
                          "flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-all group min-h-[38px]",
                          isActive
                            ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30"
                            : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent",
                          collapsed && !isMobileOpen && "justify-center px-0 min-h-[38px]"
                        )}
                        title={collapsed && !isMobileOpen ? s.label : undefined}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Icon
                            size={14}
                            className={cn(
                              "flex-shrink-0 transition-colors",
                              isActive ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-300"
                            )}
                          />
                          {(!collapsed || isMobileOpen) && <span className="truncate">{s.label}</span>}
                        </div>
                        {(!collapsed || isMobileOpen) && (
                          <span className="text-[9px] text-slate-500 font-mono">S{s.studioNumber}</span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Personal Apps */}
          <div>
            {(!collapsed || isMobileOpen) && (
              <p className="px-2.5 pb-2 text-[10px] font-bold text-slate-500 tracking-[0.18em] uppercase">
                Apps Pessoais
              </p>
            )}
            <div className="space-y-1">
              {personalNavItems.filter(({ href }) => (!clientAccount || href === "/modules/athena" || href === "/modules/music") && !preferences.hiddenNavigation.includes(href as never)).map(({ href, icon: Icon, label, badge, external }) => {
                const isActive = pathname.startsWith(href);
                return external ? (
                  <a
                    key={href}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setIsMobileOpen(false)}
                    className={cn(
                      "flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-100 hover:bg-white/5 transition-all group min-h-[42px]",
                      collapsed && !isMobileOpen && "justify-center px-0 min-h-[40px]"
                    )}
                    title={collapsed && !isMobileOpen ? label : undefined}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        size={16}
                        className="flex-shrink-0 text-slate-500 group-hover:text-slate-300 transition-colors"
                      />
                      {(!collapsed || isMobileOpen) && <span className="truncate">{label}</span>}
                    </div>
                    {(!collapsed || isMobileOpen) && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold flex items-center gap-0.5">
                        <ExternalLink size={9} /> {badge || "Ext"}
                      </span>
                    )}
                  </a>
                ) : (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setIsMobileOpen(false)}
                    className={cn(
                      "flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all group min-h-[42px]",
                      isActive
                        ? "bg-cyan-600/20 text-cyan-300 border border-cyan-500/30"
                        : "text-slate-400 hover:text-slate-100 hover:bg-white/5 border border-transparent",
                      collapsed && !isMobileOpen && "justify-center px-0 min-h-[40px]"
                    )}
                    title={collapsed && !isMobileOpen ? label : undefined}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        size={16}
                        className={cn(
                          "flex-shrink-0 transition-colors",
                          isActive ? "text-cyan-400" : "text-slate-500 group-hover:text-slate-300"
                        )}
                      />
                      {(!collapsed || isMobileOpen) && <span className="truncate">{label}</span>}
                    </div>
                    {(!collapsed || isMobileOpen) && badge && (
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
            onClick={() => setIsMobileOpen(false)}
            className={cn(
              "flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-100 hover:bg-white/5 transition-all min-h-[44px]",
              pathname === "/profile" && "bg-violet-600/20 text-violet-300 border border-violet-500/30",
              collapsed && !isMobileOpen && "lg:justify-center lg:px-0"
            )}
            title={collapsed && !isMobileOpen ? "Perfil do Dono" : undefined}
          >
            <div className="w-7 h-7 rounded-lg bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400 flex-shrink-0">
              <User size={14} />
            </div>
            {(!collapsed || isMobileOpen) && (
              <div className="flex flex-col min-w-0">
                <span className="text-slate-200 font-semibold truncate leading-tight">Paulo</span>
                <span className="text-[10px] text-slate-500 leading-tight">Dono do VARYNTH</span>
              </div>
            )}
          </Link>
          <Link
            href="/download"
            onClick={() => setIsMobileOpen(false)}
            className={cn(
              "flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-violet-500/20 bg-violet-500/[0.07] text-xs font-semibold text-violet-200 hover:bg-violet-500/15 transition min-h-[44px]",
              pathname === "/download" && "border-violet-400/40 bg-violet-500/15",
              collapsed && !isMobileOpen && "lg:justify-center lg:px-0"
            )}
            title={collapsed && !isMobileOpen ? "Instalar app" : undefined}
          >
            <Download size={15} className="flex-shrink-0" />
            {(!collapsed || isMobileOpen) && (
              <>
                <span className="flex-1">Instalar app</span>
                <span className="rounded-md border border-violet-400/20 bg-violet-400/10 px-1.5 py-0.5 text-[9px] text-violet-200">Web App</span>
              </>
            )}
          </Link>
        </div>

        {/* Desktop Collapse button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
          title={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
          aria-expanded={!collapsed}
          className={cn(
            "hidden lg:flex absolute -right-3 top-7 w-6 h-6 rounded-full",
            "bg-[#14141f] border border-[#1e1e30] text-slate-400",
            "items-center justify-center",
            "hover:text-slate-100 hover:border-violet-500/50 transition-all duration-200",
            "z-40 shadow-md"
          )}
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </aside>
    </>
  );
}

export function Sidebar() {
  return (
    <Suspense fallback={<aside className="hidden lg:block w-64 h-screen bg-[#0a0a0f] border-r border-[#1e1e30]" />}>
      <SidebarContent />
    </Suspense>
  );
}
