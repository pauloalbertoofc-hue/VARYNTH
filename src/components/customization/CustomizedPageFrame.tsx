"use client";
import type { ReactNode } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
import { CommandPalette } from "@/components/ui/CommandPalette";
import { QuickCreateModal } from "@/components/ui/QuickCreateModal";
import { AthenaSidecar } from "@/components/athena/AthenaSidecar";
import { AthenaProactiveMonitor } from "@/components/athena/AthenaProactiveMonitor";
import { UndoToast } from "@/components/ui/UndoToast";
import { cn } from "@/lib/utils";
import { usePlatformPreferences } from "./CustomizationProvider";

export function CustomizedPageFrame({ children, title, subtitle, className }: { children: ReactNode; title?: string; subtitle?: string; className?: string }) {
  const { backgroundImage } = usePlatformPreferences();
  const style = backgroundImage ? { backgroundImage: `linear-gradient(color-mix(in srgb, var(--vly-world) 82%, transparent), color-mix(in srgb, var(--vly-world) 92%, transparent)), url("${backgroundImage}")`, backgroundPosition: "center", backgroundSize: "cover", backgroundAttachment: "fixed" as const } : undefined;
  return <div className="flex h-screen overflow-hidden bg-[var(--vly-world)] text-[var(--vly-text-primary)] font-sans">
    <Sidebar />
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
      <Navbar title={title} subtitle={subtitle} />
      <main style={style} aria-label={title || "Conteúdo principal do VARYNTH"} className={cn("flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top_right,color-mix(in_srgb,var(--vly-info)_5%,transparent),transparent_38%),linear-gradient(180deg,var(--vly-world),var(--vly-surface))] p-4 sm:p-6", className)}>
        {children}
      </main>
    </div>
    <CommandPalette /><QuickCreateModal /><AthenaSidecar /><AthenaProactiveMonitor /><UndoToast />
  </div>;
}
