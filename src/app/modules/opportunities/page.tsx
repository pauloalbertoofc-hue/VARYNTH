import { PageLayout } from "@/components/layout/PageLayout";
import { Trophy, Award, FileCheck, Sparkles } from "lucide-react";

export default function OpportunitiesPage() {
  return (
    <PageLayout title="Opportunities" subtitle="Radar de editais, prêmios, concursos e bolsas (Fase 3)">
      <div className="max-w-4xl mx-auto py-12 text-center space-y-6 animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
          <Trophy size={32} />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold uppercase tracking-wider">
            <Sparkles size={12} />
            <span>Radar de Editais & Prêmios · Fase 3</span>
          </div>
          <h1 className="text-2xl font-black text-white">Opportunities & Grants</h1>
          <p className="text-xs text-slate-400 max-w-lg mx-auto leading-relaxed">
            Monitoramento de chamadas abertas, editais de fomento, concursos e premiações com pipeline de submissão (Interessado → Analisando → Preparando → Submetido → Aprovado).
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left pt-6 max-w-2xl mx-auto">
          {[
            { title: "Pipeline de Submissão", desc: "Acompanhamento do status de cada edital" },
            { title: "Checklist de Requisitos", desc: "Documentos e critérios de elegibilidade" },
            { title: "Matching com Projetos", desc: "Athena sugere projetos compatíveis" },
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

