import { PageLayout } from "@/components/layout/PageLayout";
import { AppCard } from "@/components/ui/AppCard";
import { modules } from "@/lib/modules";
import { Zap, Grid3x3, Activity } from "lucide-react";

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
    <PageLayout title="Dashboard" subtitle="Visão geral do VARYNTH">
      <div className="p-6 space-y-8 animate-fade-in">
        {/* Hero greeting */}
        <div className="relative rounded-xl border border-[#1e1e30] bg-gradient-to-br from-violet-900/20 via-[#0f0f1a] to-cyan-900/10 p-8 overflow-hidden clip-corner">
          {/* Decorative glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-32 w-32 h-32 bg-cyan-600/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10">
            <p className="text-xs text-violet-400 tracking-[0.3em] font-medium uppercase mb-2">
              VARYNTH OS
            </p>
            <h2 className="text-3xl font-bold text-white text-glow-accent">
              {greeting}, bem-vindo.
            </h2>
            <p className="mt-2 text-sm text-slate-400 max-w-md">
              Seu hub pessoal está online. Acesse seus apps, ferramentas e projetos abaixo.
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {stats.map(({ label, value, icon: Icon, color, bg }) => (
            <div
              key={label}
              className="flex items-center gap-4 p-4 rounded-lg bg-[#0f0f1a] border border-[#1e1e30] clip-corner-sm"
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

        {/* Apps section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-300 tracking-wide uppercase">
              Seus Apps
            </h3>
            <span className="text-xs text-slate-500">{modules.length} módulos</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {modules.map((mod) => (
              <AppCard key={mod.id} module={mod} />
            ))}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

