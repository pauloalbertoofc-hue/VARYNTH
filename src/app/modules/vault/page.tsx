import { PageLayout } from "@/components/layout/PageLayout";
import { BookOpen, Sparkles, Plus, Tag, Search } from "lucide-react";

export default function VaultPage() {
  return (
    <PageLayout title="Vault" subtitle="Biblioteca e segundo cérebro relacional (Fase 2)">
      <div className="max-w-4xl mx-auto py-12 text-center space-y-6 animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400 mx-auto glow-accent">
          <BookOpen size={32} />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-semibold uppercase tracking-wider">
            <Sparkles size={12} />
            <span>Segundo Cérebro · Fase 2</span>
          </div>
          <h1 className="text-2xl font-black text-white">Vault de Conhecimento</h1>
          <p className="text-xs text-slate-400 max-w-lg mx-auto leading-relaxed">
            Armazenamento não-hierárquico de artigos, PDFs, livros, jurisprudência, notas e citações interligados por tags e relações entre projetos e pessoas.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left pt-6 max-w-2xl mx-auto">
          {[
            { title: "Biblioteca de PDFs & Mídia", desc: "Leitura e fichamento conectado" },
            { title: "Relações & Tags Dinâmicas", desc: "Zero dependência de pastas rígidas" },
            { title: "Integração com Athena AI", desc: "Busca semântica e resumos automáticos" },
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

