import { PageLayout } from "@/components/layout/PageLayout";
import { Scale, Swords, BookMarked, Sparkles } from "lucide-react";

export default function CodexPage() {
  return (
    <PageLayout title="Codex" subtitle="Ambiente jurídico e Argument Arena (Fase 3)">
      <div className="max-w-4xl mx-auto py-12 text-center space-y-6 animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mx-auto">
          <Scale size={32} />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold uppercase tracking-wider">
            <Sparkles size={12} />
            <span>Ambiente Jurídico · Fase 3</span>
          </div>
          <h1 className="text-2xl font-black text-white">Codex & Argument Arena</h1>
          <p className="text-xs text-slate-400 max-w-lg mx-auto leading-relaxed">
            Centralização de jurisprudência, doutrina, fichamentos de faculdade e o construtor dialético <span className="text-cyan-300 font-semibold">Argument Arena</span> (tese, argumentos pró/contra, precedentes e conclusão).
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left pt-6 max-w-2xl mx-auto">
          {[
            { title: "Argument Arena", desc: "Estruturação dialética de teses e contra-argumentos" },
            { title: "Biblioteca de Legislação", desc: "Fichamento e mapas conceituais de matérias" },
            { title: "Debate com Athena AI", desc: "Simulação de contrapontos e teses adversárias" },
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

