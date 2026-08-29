import { PageLayout } from "@/components/layout/PageLayout";
import { AppCard } from "@/components/ui/AppCard";
import { modules } from "@/lib/modules";
import { ClockWidget } from "@/components/widgets/ClockWidget";
import { FocusTimerWidget } from "@/components/widgets/FocusTimerWidget";
import { ScratchpadWidget } from "@/components/widgets/ScratchpadWidget";
import { QuickLinksWidget } from "@/components/widgets/QuickLinksWidget";
import { Zap, Grid3x3, Activity, LayoutGrid, Terminal } from "lucide-react";

const stats = [
  {
    label: "Apps ativos",
    value: String(modules.filter((m) => m.status === "active").length),
    icon: Zap,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/20",
  },
  {
    label: "Total de módulos",
    value: String(modules.length),
    icon: Grid3x3,
    color: "text-violet-400",
    bg: "bg-violet-500/10 border-violet-500/20",
  },
  {
    label: "Em desenvolvimento",
    value: String(modules.filter((m) => m.status === "wip").length),
    icon: Activity,
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/20",
  },
];

export default function DashboardPage() {
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  return (
    <PageLayout title="Início" subtitle="Cockpit Operacional VARYNTH">
      <div className="p-6 space-y-8 animate-fade-in max-w-7xl mx-auto">
        {/* Top Hero Banner */}
        <div className="relative rounded-xl border border-[#1e1e30] bg-gradient-to-br from-violet-950/40 via-[#0f0f1a] to-cyan-950/20 p-6 sm:p-8 overflow-hidden clip-corner">
          {/* Decorative glow */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-violet-600/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-32 w-40 h-40 bg-cyan-600/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-semibold uppercase tracking-widest mb-3">
                <Terminal size={12} />
                <span>VARYNTH OS · v0.1.0</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white text-glow-accent">
                {greeting}, Paulo.
              </h2>
              <p className="mt-1.5 text-xs sm:text-sm text-slate-400 max-w-lg">
                Seu centro de controle pessoal está online. Gerencie projetos, anotações e ferramentas diretamente do seu hub.
              </p>
            </div>

            {/* Quick action hint */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-lg bg-[#0a0a0f]/80 border border-[#1e1e30] text-xs text-slate-400">
              <span>Pressione</span>
              <kbd className="px-2 py-0.5 rounded bg-[#14141f] border border-[#2d2d4a] text-slate-200 font-mono text-[11px]">
                Ctrl + K
              </kbd>
              <span>para busca rápida</span>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {stats.map(({ label, value, icon: Icon, color, bg }) => (
            <div
              key={label}
              className="flex items-center gap-4 p-4 rounded-lg bg-[#0f0f1a] border border-[#1e1e30] clip-corner-sm hover:border-violet-500/30 transition-colors"
            >
              <div className={`w-10 h-10 rounded-lg border flex items-center justify-center flex-shrink-0 ${bg}`}>
                <Icon size={18} className={color} />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{value}</p>
                <p className="text-xs text-slate-500">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Interactive Widgets Grid */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-violet-400 tracking-[0.2em] uppercase flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 inline-block" />
              Ferramentas & Widgets
            </h3>
            <span className="text-xs text-slate-500">Produtividade diária</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ClockWidget />
            <FocusTimerWidget />
            <ScratchpadWidget />
            <QuickLinksWidget />
          </div>
        </section>

        {/* Apps & Modules Section */}
        <section className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-cyan-400 tracking-[0.2em] uppercase flex items-center gap-2">
              <LayoutGrid size={14} />
              Seus Módulos & Projetos
            </h3>
            <span className="text-xs text-slate-500">{modules.length} módulos disponíveis</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {modules.map((mod) => (
              <AppCard key={mod.id} module={mod} />
            ))}
          </div>
        </section>
      </div>
    </PageLayout>
  );
}
