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
  { href: "/modules/knowledge", icon: BookOpen, label: "Knowledge", badge: "Mapa" },
  { href: "/modules/experience", icon: Zap, label: "Experience", badge: "Local" },
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
  const [accountName, setAccountName] = useState("Você");
  const clientAccount = isClientRole(role);

  useEffect(() => {
    let active = true;
    void import("next-auth/react").then(({ getSession }) => getSession()).then((session) => {
      const nextRole = (session?.user as { role?: string } | undefined)?.role;
      if (active && nextRole) setRole(nextRole);
      const nextName = session?.user?.name?.trim();
      if (active && nextName) setAccountName(nextName);
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
          className="fixed inset-0 bg-[var(--vly-overlay)] backdrop-blur-sm z-40 lg:hidden animate-fade-in"
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar (Drawer on mobile, Collapsible on desktop) */}
      <aside
        aria-label="Navegação principal"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col h-[100dvh] bg-[var(--vly-world)] border-r border-[var(--vly-border-default)] select-none",
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
            "flex items-center justify-between px-4 py-3.5 border-b border-[var(--vly-border-default)]",
            collapsed && "lg:justify-center lg:px-0"
          )}
        >
          <Link
            href="/dashboard"
            onClick={() => setIsMobileOpen(false)}
            className="flex items-center gap-2.5 group"
          >
            <div className="flex-shrink-0 w-8 h-8 bg-[var(--vly-surface-raised)] border border-[var(--vly-border-strong)] rounded-[var(--vly-radius-md)] flex items-center justify-center group-hover:scale-105 transition-transform">
              <Zap size={16} className="text-[var(--vly-text-primary)]" />
            </div>
            {(!collapsed || isMobileOpen) && (
              <div className="flex flex-col">
                <span className="text-xs font-black tracking-[0.25em] text-[var(--vly-text-primary)] text-glow-accent uppercase">
                  {preferences.appName}
                </span>
                <span className="text-[9px] tracking-wider text-[var(--vly-text-muted)] font-mono">
                  OS · UNIVERSE
                </span>
              </div>
            )}
          </Link>

          {/* Close button on mobile */}
          <button
            type="button"
            onClick={() => setIsMobileOpen(false)}
            className="vly-interactive lg:hidden p-1.5 rounded-lg text-[var(--vly-text-muted)] hover:text-[var(--vly-text-primary)] hover:bg-[var(--vly-surface-hover)]"
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
              <p className="px-2.5 pb-2 text-[10px] font-bold text-[var(--vly-text-muted)] tracking-[0.18em] uppercase">
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
                        ? "bg-[var(--vly-surface-active)] text-[var(--vly-accent-hover)] border border-[var(--vly-border-accent)]"
                        : "text-[var(--vly-text-secondary)] hover:text-[var(--vly-text-primary)] hover:bg-[var(--vly-surface-hover)] border border-transparent",
                      collapsed && !isMobileOpen && "justify-center px-0 min-h-[40px]"
                    )}
                    title={collapsed && !isMobileOpen ? label : undefined}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        size={16}
                        className={cn(
                          "flex-shrink-0 transition-colors",
                            isActive ? "text-[var(--vly-accent)]" : "text-[var(--vly-text-disabled)] group-hover:text-[var(--vly-text-secondary)]"
                        )}
                      />
                      {(!collapsed || isMobileOpen) && <span className="truncate">{label}</span>}
                    </div>
                    {(!collapsed || isMobileOpen) && badge && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--vly-surface-active)] text-[var(--vly-accent-hover)] border border-[var(--vly-border-accent)] font-semibold">
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
              role="button"
              tabIndex={collapsed && !isMobileOpen ? -1 : 0}
              aria-expanded={studiosExpanded}
              aria-controls="creative-studios-navigation"
              className={cn(
                "flex items-center justify-between px-2.5 pb-2 cursor-pointer group",
                collapsed && !isMobileOpen && "hidden"
              )}
              onClick={() => setStudiosExpanded(!studiosExpanded)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setStudiosExpanded((expanded) => !expanded);
                }
              }}
            >
              <p className="text-[10px] font-bold text-[var(--vly-text-muted)] tracking-[0.18em] uppercase group-hover:text-[var(--vly-text-secondary)] transition-colors">
                Studios Criativos
              </p>
              <div className="flex items-center gap-1">
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-[color-mix(in_srgb,var(--vly-info)_12%,var(--vly-surface))] text-[var(--vly-info)] font-mono">
                  6 Studios
                </span>
                <ChevronDown
                  size={12}
                  className={cn(
                    "text-[var(--vly-text-disabled)] transition-transform duration-200",
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
                    ? "bg-[var(--vly-surface-active)] text-[var(--vly-accent-hover)] border border-[var(--vly-border-accent)] shadow-sm"
                    : "text-[var(--vly-text-secondary)] hover:text-[var(--vly-text-primary)] hover:bg-[var(--vly-surface-hover)] border border-transparent",
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
                        ? "text-[var(--vly-accent)]"
                        : "text-[var(--vly-text-disabled)] group-hover:text-[var(--vly-text-secondary)]"
                    )}
                  />
                  {(!collapsed || isMobileOpen) && <span className="truncate">Studios Hub</span>}
                </div>
                {(!collapsed || isMobileOpen) && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--vly-surface-active)] text-[var(--vly-accent-hover)] border border-[var(--vly-border-accent)] font-semibold font-mono">
                    HUB
                  </span>
                )}
              </Link>}

              {/* Sub-Studios (Expanded View) */}
              {(studiosExpanded || collapsed) && (
                <div id="creative-studios-navigation" className={cn("space-y-0.5", (!collapsed || isMobileOpen) && "pl-2 border-l border-[var(--vly-border-subtle)] ml-3 mt-1")}>
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
                            ? "bg-[var(--vly-surface-active)] text-[var(--vly-accent-hover)] border border-[var(--vly-border-accent)]"
                            : "text-[var(--vly-text-secondary)] hover:text-[var(--vly-text-primary)] hover:bg-[var(--vly-surface-hover)] border border-transparent",
                          collapsed && !isMobileOpen && "justify-center px-0 min-h-[38px]"
                        )}
                        title={collapsed && !isMobileOpen ? s.label : undefined}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Icon
                            size={14}
                            className={cn(
                              "flex-shrink-0 transition-colors",
                              isActive ? "text-[var(--vly-accent)]" : "text-[var(--vly-text-disabled)] group-hover:text-[var(--vly-text-secondary)]"
                            )}
                          />
                          {(!collapsed || isMobileOpen) && <span className="truncate">{s.label}</span>}
                        </div>
                        {(!collapsed || isMobileOpen) && (
                          <span className="text-[9px] text-[var(--vly-text-muted)] font-mono">S{s.studioNumber}</span>
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
              <p className="px-2.5 pb-2 text-[10px] font-bold text-[var(--vly-text-muted)] tracking-[0.18em] uppercase">
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
                      "vly-interactive flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium text-[var(--vly-text-muted)] hover:text-[var(--vly-text-primary)] hover:bg-[var(--vly-surface-hover)] transition-all group min-h-[42px]",
                      collapsed && !isMobileOpen && "justify-center px-0 min-h-[40px]"
                    )}
                    title={collapsed && !isMobileOpen ? label : undefined}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        size={16}
                        className="flex-shrink-0 text-[var(--vly-text-disabled)] group-hover:text-[var(--vly-text-secondary)] transition-colors"
                      />
                      {(!collapsed || isMobileOpen) && <span className="truncate">{label}</span>}
                    </div>
                    {(!collapsed || isMobileOpen) && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-[color-mix(in_srgb,var(--vly-info)_12%,var(--vly-surface))] text-[var(--vly-info)] border border-[var(--vly-border-info)] font-semibold flex items-center gap-0.5">
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
                        ? "bg-[color-mix(in_srgb,var(--vly-info)_12%,var(--vly-surface))] text-[var(--vly-info)] border border-[var(--vly-border-info)]"
                        : "text-[var(--vly-text-secondary)] hover:text-[var(--vly-text-primary)] hover:bg-[var(--vly-surface-hover)] border border-transparent",
                      collapsed && !isMobileOpen && "justify-center px-0 min-h-[40px]"
                    )}
                    title={collapsed && !isMobileOpen ? label : undefined}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        size={16}
                        className={cn(
                          "flex-shrink-0 transition-colors",
                            isActive ? "text-[var(--vly-info)]" : "text-[var(--vly-text-disabled)] group-hover:text-[var(--vly-text-secondary)]"
                        )}
                      />
                      {(!collapsed || isMobileOpen) && <span className="truncate">{label}</span>}
                    </div>
                    {(!collapsed || isMobileOpen) && badge && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-[color-mix(in_srgb,var(--vly-info)_12%,var(--vly-surface))] text-[var(--vly-info)] border border-[var(--vly-border-info)] font-semibold">
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
        <div className="p-2.5 border-t border-[var(--vly-border-default)] space-y-1">
          <Link
            href="/profile"
            onClick={() => setIsMobileOpen(false)}
            className={cn(
              "vly-interactive flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium text-[var(--vly-text-secondary)] hover:text-[var(--vly-text-primary)] hover:bg-[var(--vly-surface-hover)] transition-all min-h-[44px]",
              pathname === "/profile" && "bg-[var(--vly-surface-active)] text-[var(--vly-accent-hover)] border border-[var(--vly-border-accent)]",
              collapsed && !isMobileOpen && "lg:justify-center lg:px-0"
            )}
            title={collapsed && !isMobileOpen ? "Perfil do Dono" : undefined}
          >
            <div className="w-7 h-7 rounded-lg bg-[var(--vly-surface-active)] border border-[var(--vly-border-accent)] flex items-center justify-center text-[var(--vly-accent)] flex-shrink-0">
              <User size={14} />
            </div>
            {(!collapsed || isMobileOpen) && (
              <div className="flex flex-col min-w-0">
                <span className="text-[var(--vly-text-primary)] font-semibold truncate leading-tight">{accountName}</span>
                <span className="text-[10px] leading-tight text-[var(--vly-text-secondary)]">{role === "owner" ? "Dono do VARYNTH" : "Conta VARYNTH"}</span>
              </div>
            )}
          </Link>
          <Link
            href="/download"
            onClick={() => setIsMobileOpen(false)}
            className={cn(
              "vly-interactive flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-[var(--vly-border-accent)] bg-[var(--vly-surface)] text-xs font-semibold text-[var(--vly-accent-hover)] hover:bg-[var(--vly-surface-hover)] transition min-h-[44px]",
              pathname === "/download" && "border-[var(--vly-accent)] bg-[var(--vly-surface-active)]",
              collapsed && !isMobileOpen && "lg:justify-center lg:px-0"
            )}
            title={collapsed && !isMobileOpen ? "Instalar app" : undefined}
          >
            <Download size={15} className="flex-shrink-0" />
            {(!collapsed || isMobileOpen) && (
              <>
                <span className="flex-1">Instalar app</span>
                <span className="rounded-md border border-[var(--vly-border-accent)] bg-[var(--vly-surface-active)] px-1.5 py-0.5 text-[9px] text-[var(--vly-accent-hover)]">Web App</span>
              </>
            )}
          </Link>
        </div>

        {/* Desktop Collapse button */}
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
          title={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
          aria-expanded={!collapsed}
          className={cn(
            "hidden lg:flex absolute -right-3 top-7 w-6 h-6 rounded-full",
            "bg-[var(--vly-surface-raised)] border border-[var(--vly-border-default)] text-[var(--vly-text-secondary)]",
            "items-center justify-center",
            "hover:text-[var(--vly-text-primary)] hover:border-[var(--vly-border-accent)] transition-all duration-200",
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
    <Suspense fallback={<aside className="hidden lg:block w-64 h-screen bg-[var(--vly-world)] border-r border-[var(--vly-border-default)]" />}>
      <SidebarContent />
    </Suspense>
  );
}
