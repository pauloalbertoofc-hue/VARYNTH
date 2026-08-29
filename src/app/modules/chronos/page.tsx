import { PageLayout } from "@/components/layout/PageLayout";
import { Clock, Calendar, Milestone, Sparkles } from "lucide-react";

export default function ChronosPage() {
  return (
    <PageLayout title="Chronos" subtitle="Organização de tempo, calendários e timeline histórica (Fase 2)">
      <div className="max-w-4xl mx-auto py-12 text-center space-y-6 animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400 mx-auto">
          <Clock size={32} />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-semibold uppercase tracking-wider">
            <Sparkles size={12} />
            <span>Gestão Temporal · Fase 2</span>
          </div>
          <h1 className="text-2xl font-black text-white">Chronos & Histórico de Atividades</h1>
          <p className="text-xs text-slate-400 max-w-lg mx-auto leading-relaxed">
            Visão unificada de prazos de projetos, eventos, rotinas de foco e uma linha do tempo histórica da evolução da sua plataforma ao longo dos meses e anos.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left pt-6 max-w-2xl mx-auto">
          {[
            { title: "Calendário & Prazos", desc: "Agregação de deadlines de todos os projetos" },
            { title: "Timeline Histórica", desc: "Linha do tempo contínua de conquistas e lançamentos" },
            { title: "Sessões de Foco", desc: "Registro e métricas de horas focadas" },
          ].map((item) => (
            <div key={item.title} className="p-4 rounded-xl bg-[#0f0f1a] border border-[#1e1e30] space-y-1">
              <h3 className="text-xs font-bold text-slate-200">{item.title}</h3>
              <p className="text-[11px] text-slate-400">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </PageLayout>
  );
}

