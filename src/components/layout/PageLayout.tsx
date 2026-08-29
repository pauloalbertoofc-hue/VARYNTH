import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
import { CommandPalette } from "@/components/ui/CommandPalette";
import { QuickCreateModal } from "@/components/ui/QuickCreateModal";
import { cn } from "@/lib/utils";

interface PageLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  className?: string;
}

export function PageLayout({ children, title, subtitle, className }: PageLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0a0f] text-slate-100 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Navbar title={title} subtitle={subtitle} />
        <main className={cn("flex-1 overflow-y-auto grid-bg p-4 sm:p-6", className)}>
          {children}
        </main>
      </div>
      <CommandPalette />
      <QuickCreateModal />
    </div>
  );
}
