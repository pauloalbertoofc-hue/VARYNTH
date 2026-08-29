import { PageLayout } from "@/components/layout/PageLayout";
import { GraduationCap, Layers, CheckSquare, Sparkles } from "lucide-react";

export default function ResearchPage() {
  return (
    <PageLayout title="Research" subtitle="Pesquisas acadêmicas e Evidence Board (Fase 3)">
      <div className="max-w-4xl mx-auto py-12 text-center space-y-6 animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400 mx-auto glow-accent">
          <GraduationCap size={32} />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-semibold uppercase tracking-wider">
            <Sparkles size={12} />
            <span>Pesquisa Acadêmica · Fase 3</span>
          </div>
          <h1 className="text-2xl font-black text-white">Research & Evidence Board</h1>
          <p className="text-xs text-slate-400 max-w-lg mx-auto leading-relaxed">
            Estruturação formal de artigos científicos e teses: problema, hipótese, metodologia, fontes e um <span className="text-violet-300 font-semibold">Evidence Board</span> para catalogar afirmações, força probatória e citações.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left pt-6 max-w-2xl mx-auto">
          {[
            { title: "Evidence Board", desc: "Catalogação de trechos, fontes e força probatória" },
            { title: "Metodologia & Escrita", desc: "Acompanhamento do cronograma de submissões" },
            { title: "Athena Research", desc: "Resumo de evidências e busca de contradições" },
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

