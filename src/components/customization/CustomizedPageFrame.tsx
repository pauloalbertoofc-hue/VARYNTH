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
  const style = backgroundImage ? { backgroundImage: `linear-gradient(rgba(10,10,15,.66), rgba(10,10,15,.78)), url("${backgroundImage}")`, backgroundPosition: "center", backgroundSize: "cover", backgroundAttachment: "fixed" as const } : undefined;
  return <div className="flex h-screen overflow-hidden bg-[#0a0a0f] text-slate-100 font-sans">
    <Sidebar />
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
      <Navbar title={title} subtitle={subtitle} />
      <main style={style} className={cn("flex-1 overflow-y-auto grid-bg p-4 sm:p-6", className)}>
        {children}
      </main>
    </div>
    <CommandPalette /><QuickCreateModal /><AthenaSidecar /><AthenaProactiveMonitor /><UndoToast />
  </div>;
}
