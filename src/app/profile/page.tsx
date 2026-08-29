import { PageLayout } from "@/components/layout/PageLayout";
import { User, Shield, Star, Zap } from "lucide-react";
import { modules } from "@/lib/modules";

const badges = [
  { icon: Star, label: "Fundador", desc: "Criou o VARYNTH", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  { icon: Zap, label: "Builder", desc: "Primeiro app publicado", color: "text-violet-400 bg-violet-500/10 border-violet-500/20" },
  { icon: Shield, label: "Owner", desc: "Dono da plataforma", color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" },
];

export default function ProfilePage() {
  const activeCount = modules.filter((m) => m.status === "active").length;

  return (
    <PageLayout title="Perfil" subtitle="Seu gamer card pessoal">
      <div className="p-6 animate-fade-in max-w-2xl">
        {/* Profile card */}
        <div className="relative rounded-xl border border-[#1e1e30] bg-gradient-to-br from-violet-900/20 via-[#0f0f1a] to-[#0f0f1a] p-6 clip-corner overflow-hidden mb-6">
          <div className="absolute top-0 right-0 w-48 h-48 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex items-start gap-4">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center flex-shrink-0">
              <User size={28} className="text-violet-400" />
            </div>
            {/* Info */}
            <div className="flex-1">
              <h2 className="text-lg font-bold text-white">Paulo</h2>
              <p className="text-xs text-slate-400 mt-0.5">Owner · VARYNTH OS</p>
              <div className="flex items-center gap-4 mt-3">
                <div className="text-center">
                  <p className="text-lg font-bold text-white">{modules.length}</p>
                  <p className="text-[10px] text-slate-500">Módulos</p>
                </div>
                <div className="w-px h-8 bg-[#1e1e30]" />
                <div className="text-center">
                  <p className="text-lg font-bold text-emerald-400">{activeCount}</p>
                  <p className="text-[10px] text-slate-500">Ativos</p>
                </div>
                <div className="w-px h-8 bg-[#1e1e30]" />
                <div className="text-center">
                  <p className="text-lg font-bold text-violet-400">3</p>
                  <p className="text-[10px] text-slate-500">Conquistas</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Badges */}
        <div>
          <h3 className="text-xs font-semibold text-slate-500 tracking-[0.2em] uppercase mb-3">Conquistas</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {badges.map(({ icon: Icon, label, desc, color }) => (
              <div key={label} className={`flex items-center gap-3 p-3 rounded-lg border clip-corner-sm ${color}`}>
                <Icon size={18} />
                <div>
                  <p className="text-xs font-semibold">{label}</p>
                  <p className="text-[10px] opacity-70">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

