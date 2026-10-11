"use client";

import { cn } from "@/lib/utils";
import { VarynthModule } from "@/lib/types";
import { ExternalLink, Clock, Zap, Globe } from "lucide-react";
import Link from "next/link";
import { EXTERNAL_APP_REGISTRY } from "@/lib/external/external-app-registry";
import { Surface } from "@/components/ui/Surface";

interface AppCardProps {
  module: VarynthModule;
  className?: string;
}

const colorMap = {
  violet: {
    glow: "hover:shadow-[0_0_24px_color-mix(in_srgb,var(--vly-accent)_24%,transparent)]",
    border: "hover:border-[color-mix(in_srgb,var(--vly-accent)_50%,transparent)]",
    badge: "bg-[color-mix(in_srgb,var(--vly-accent)_10%,transparent)] text-[var(--vly-accent)] border-[color-mix(in_srgb,var(--vly-accent)_20%,transparent)]",
    icon: "bg-[color-mix(in_srgb,var(--vly-accent)_10%,transparent)]",
    tag: "bg-[color-mix(in_srgb,var(--vly-accent)_10%,transparent)] text-[var(--vly-accent)]",
  },
  cyan: {
    glow: "hover:shadow-[0_0_24px_color-mix(in_srgb,var(--vly-info)_24%,transparent)]",
    border: "hover:border-[color-mix(in_srgb,var(--vly-info)_50%,transparent)]",
    badge: "bg-[color-mix(in_srgb,var(--vly-info)_10%,transparent)] text-[var(--vly-info)] border-[color-mix(in_srgb,var(--vly-info)_20%,transparent)]",
    icon: "bg-[color-mix(in_srgb,var(--vly-info)_10%,transparent)]",
    tag: "bg-[color-mix(in_srgb,var(--vly-info)_10%,transparent)] text-[var(--vly-info)]",
  },
  green: {
    glow: "hover:shadow-[0_0_24px_color-mix(in_srgb,var(--vly-success)_24%,transparent)]",
    border: "hover:border-[color-mix(in_srgb,var(--vly-success)_50%,transparent)]",
    badge: "bg-[color-mix(in_srgb,var(--vly-success)_10%,transparent)] text-[var(--vly-success)] border-[color-mix(in_srgb,var(--vly-success)_20%,transparent)]",
    icon: "bg-[color-mix(in_srgb,var(--vly-success)_10%,transparent)]",
    tag: "bg-[color-mix(in_srgb,var(--vly-success)_10%,transparent)] text-[var(--vly-success)]",
  },
  orange: {
    glow: "hover:shadow-[0_0_24px_color-mix(in_srgb,var(--vly-warning)_24%,transparent)]",
    border: "hover:border-[color-mix(in_srgb,var(--vly-warning)_50%,transparent)]",
    badge: "bg-[color-mix(in_srgb,var(--vly-warning)_10%,transparent)] text-[var(--vly-warning)] border-[color-mix(in_srgb,var(--vly-warning)_20%,transparent)]",
    icon: "bg-[color-mix(in_srgb,var(--vly-warning)_10%,transparent)]",
    tag: "bg-[color-mix(in_srgb,var(--vly-warning)_10%,transparent)] text-[var(--vly-warning)]",
  },
  amber: {
    glow: "hover:shadow-[0_0_24px_color-mix(in_srgb,var(--vly-warning)_24%,transparent)]",
    border: "hover:border-[color-mix(in_srgb,var(--vly-warning)_50%,transparent)]",
    badge: "bg-[color-mix(in_srgb,var(--vly-warning)_10%,transparent)] text-[var(--vly-warning)] border-[color-mix(in_srgb,var(--vly-warning)_20%,transparent)]",
    icon: "bg-[color-mix(in_srgb,var(--vly-warning)_10%,transparent)]",
    tag: "bg-[color-mix(in_srgb,var(--vly-warning)_10%,transparent)] text-[var(--vly-warning)]",
  },
  emerald: {
    glow: "hover:shadow-[0_0_24px_color-mix(in_srgb,var(--vly-success)_24%,transparent)]",
    border: "hover:border-[color-mix(in_srgb,var(--vly-success)_50%,transparent)]",
    badge: "bg-[color-mix(in_srgb,var(--vly-success)_10%,transparent)] text-[var(--vly-success)] border-[color-mix(in_srgb,var(--vly-success)_20%,transparent)]",
    icon: "bg-[color-mix(in_srgb,var(--vly-success)_10%,transparent)]",
    tag: "bg-[color-mix(in_srgb,var(--vly-success)_10%,transparent)] text-[var(--vly-success)]",
  },
  red: {
    glow: "hover:shadow-[0_0_24px_color-mix(in_srgb,var(--vly-danger)_24%,transparent)]",
    border: "hover:border-[color-mix(in_srgb,var(--vly-danger)_50%,transparent)]",
    badge: "bg-[color-mix(in_srgb,var(--vly-danger)_10%,transparent)] text-[var(--vly-danger)] border-[color-mix(in_srgb,var(--vly-danger)_20%,transparent)]",
    icon: "bg-[color-mix(in_srgb,var(--vly-danger)_10%,transparent)]",
    tag: "bg-[color-mix(in_srgb,var(--vly-danger)_10%,transparent)] text-[var(--vly-danger)]",
  },
};

const statusConfig = {
  active: { label: "Ativo", icon: Zap, className: "text-[var(--vly-success)] bg-[color-mix(in_srgb,var(--vly-success)_10%,transparent)] border-[color-mix(in_srgb,var(--vly-success)_20%,transparent)]" },
  wip: { label: "Em dev", icon: Clock, className: "text-[var(--vly-warning)] bg-[color-mix(in_srgb,var(--vly-warning)_10%,transparent)] border-[color-mix(in_srgb,var(--vly-warning)_20%,transparent)]" },
  "coming-soon": { label: "Em breve", icon: Clock, className: "text-[var(--vly-text-muted)] bg-[var(--vly-surface-raised)] border-[var(--vly-border-subtle)]" },
};

export function AppCard({ module, className }: AppCardProps) {
  const colors = colorMap[module.color];
  const status = statusConfig[module.status];
  const StatusIcon = status.icon;

  const isExternal = module.href.startsWith("http");
  const isDisabled = module.status === "coming-soon";
  const externalDef = EXTERNAL_APP_REGISTRY[module.id];

  const cardContent = (
    <Surface
      tone="raised"
      role="article"
      aria-label={`${module.name}: ${status.label}`}
      className={cn(
        "group relative flex flex-col gap-4 p-5 rounded-[var(--vly-radius-lg)]",
        "vly-interactive cursor-pointer",
        colors.glow,
        colors.border,
        isDisabled && "opacity-60 cursor-not-allowed",
        className
      )}
    >
      {/* Top row: icon + badges */}
      <div className="flex items-start justify-between">
        <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center text-2xl", colors.icon)}>
          {module.icon}
        </div>
        <div className="flex items-center gap-1.5">
          {isExternal && (
            <span className="px-1.5 py-0.5 rounded bg-[color-mix(in_srgb,var(--vly-info)_10%,transparent)] text-[var(--vly-info)] border border-[color-mix(in_srgb,var(--vly-info)_20%,transparent)] text-[10px] font-medium flex items-center gap-1">
              <Globe size={10} /> {externalDef?.badge || "Serviço Local"}
            </span>
          )}
          {module.badge && !isExternal && (
            <span className={cn("px-1.5 py-0.5 rounded border text-[10px] font-medium", colors.badge)}>
              {module.badge}
            </span>
          )}
          <div role="status" className={cn("flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium", status.className)}>
            <StatusIcon size={10} />
            {status.label}
          </div>
        </div>
      </div>

      {/* Name + description */}
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-[var(--vly-text-primary)] group-hover:text-[var(--vly-text-primary)] transition-colors flex items-center gap-1.5">
          {module.name}
          {module.version && (
            <span className="text-xs text-[var(--vly-text-secondary)] font-normal">v{module.version}</span>
          )}
          {isExternal && <ExternalLink size={12} className="text-[var(--vly-text-muted)]" />}
        </h3>
        <p className="text-xs text-[var(--vly-text-secondary)] line-clamp-2 leading-relaxed">
          {module.description}
        </p>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1 mt-auto">
        {module.tags.map((tag) => (
          <span key={tag} className={cn("text-[10px] px-2 py-0.5 rounded-sm font-medium", colors.tag)}>
            #{tag}
          </span>
        ))}
      </div>

      {/* Hover corner accent */}
      <div className="absolute bottom-0 right-0 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="w-full h-full border-b-2 border-r-2 border-[var(--vly-accent)] rounded-br-lg" />
      </div>
    </Surface>
  );

  if (isDisabled) return cardContent;

  if (isExternal) {
    return (
      <a
        href={module.href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Abrir ${module.name} em nova aba`}
        title={externalDef?.instructions || "Abrir integração externa"}
      >
        {cardContent}
      </a>
    );
  }

  return <Link href={module.href} aria-label={`Abrir ${module.name}`}>{cardContent}</Link>;
}
