"use client";

import { cn } from "@/lib/utils";
import { VarynthModule } from "@/lib/types";
import { ExternalLink, Clock, Zap } from "lucide-react";
import Link from "next/link";

interface AppCardProps {
  module: VarynthModule;
  className?: string;
}

const colorMap = {
  violet: {
    glow: "hover:shadow-[0_0_24px_rgba(124,58,237,0.35)]",
    border: "hover:border-violet-500/50",
    badge: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    icon: "bg-violet-500/10",
    tag: "bg-violet-500/10 text-violet-300",
  },
  cyan: {
    glow: "hover:shadow-[0_0_24px_rgba(6,182,212,0.35)]",
    border: "hover:border-cyan-500/50",
    badge: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    icon: "bg-cyan-500/10",
    tag: "bg-cyan-500/10 text-cyan-300",
  },
  green: {
    glow: "hover:shadow-[0_0_24px_rgba(16,185,129,0.35)]",
    border: "hover:border-emerald-500/50",
    badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    icon: "bg-emerald-500/10",
    tag: "bg-emerald-500/10 text-emerald-300",
  },
  orange: {
    glow: "hover:shadow-[0_0_24px_rgba(245,158,11,0.35)]",
    border: "hover:border-amber-500/50",
    badge: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    icon: "bg-amber-500/10",
    tag: "bg-amber-500/10 text-amber-300",
  },
  red: {
    glow: "hover:shadow-[0_0_24px_rgba(239,68,68,0.35)]",
    border: "hover:border-red-500/50",
    badge: "bg-red-500/10 text-red-400 border-red-500/20",
    icon: "bg-red-500/10",
    tag: "bg-red-500/10 text-red-300",
  },
};

const statusConfig = {
  active: { label: "Ativo", icon: Zap, className: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  wip: { label: "Em dev", icon: Clock, className: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  "coming-soon": { label: "Em breve", icon: Clock, className: "text-slate-400 bg-slate-500/10 border-slate-500/20" },
};

export function AppCard({ module, className }: AppCardProps) {
  const colors = colorMap[module.color];
  const status = statusConfig[module.status];
  const StatusIcon = status.icon;

  const isExternal = module.href.startsWith("http");
  const isDisabled = module.status === "coming-soon";

  const cardContent = (
    <div
      className={cn(
        "group relative flex flex-col gap-4 p-5 rounded-lg",
        "bg-[#0f0f1a] border border-[#1e1e30]",
        "transition-all duration-300 cursor-pointer",
        "clip-corner",
        colors.glow,
        colors.border,
        isDisabled && "opacity-60 cursor-not-allowed",
        className
      )}
    >
      {/* Top row: icon + status */}
      <div className="flex items-start justify-between">
        <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center text-2xl", colors.icon)}>
          {module.icon}
        </div>
        <div className={cn("flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium", status.className)}>
          <StatusIcon size={10} />
          {status.label}
        </div>
      </div>

      {/* Name + description */}
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-slate-100 group-hover:text-white transition-colors">
          {module.name}
          {module.version && (
            <span className="ml-2 text-xs text-slate-500 font-normal">v{module.version}</span>
          )}
        </h3>
        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
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

      {/* External link icon */}
      {isExternal && !isDisabled && (
        <ExternalLink
          size={12}
          className="absolute top-3 right-10 text-slate-600 group-hover:text-slate-400 transition-colors"
        />
      )}

      {/* Hover corner accent */}
      <div className="absolute bottom-0 right-0 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className={cn("w-full h-full border-b-2 border-r-2 rounded-br-lg", `border-${module.color}-500/50`)} />
      </div>
    </div>
  );

  if (isDisabled) return cardContent;

  if (isExternal) {
    return (
      <a href={module.href} target="_blank" rel="noopener noreferrer">
        {cardContent}
      </a>
    );
  }

  return <Link href={module.href}>{cardContent}</Link>;
}

