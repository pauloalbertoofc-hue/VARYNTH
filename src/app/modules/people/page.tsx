import { PageLayout } from "@/components/layout/PageLayout";
import { Users, Shield, UserCheck, Sparkles } from "lucide-react";

export default function PeoplePage() {
  return (
    <PageLayout title="People" subtitle="Colaboradores e gestão de permissões (Fase 2)">
      <div className="max-w-4xl mx-auto py-12 text-center space-y-6 animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
          <Users size={32} />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
            <Sparkles size={12} />
            <span>Colaboração Isolada · Fase 2</span>
          </div>
          <h1 className="text-2xl font-black text-white">People & Permissões por Projeto</h1>
          <p className="text-xs text-slate-400 max-w-lg mx-auto leading-relaxed">
            Organização estrita de colaboradores vinculados exclusivamente a projetos específicos (visualizar, comentar, editar, administrar) sem acesso ao restante do seu ecossistema.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left pt-6 max-w-2xl mx-auto">
          {[
            { title: "Permissões Granulares", desc: "Acesso restrito apenas ao projeto convidado" },
            { title: "Histórico de Contribuição", desc: "Tarefas e notas por colaborador" },
            { title: "Zero Invasão", desc: "Foco funcional, sem ruído de rede social" },
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

