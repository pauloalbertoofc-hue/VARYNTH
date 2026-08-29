import { PageLayout } from "@/components/layout/PageLayout";
import { Code2, GitBranch, Terminal, Sparkles, FolderTree } from "lucide-react";

export default function ForgePage() {
  return (
    <PageLayout title="Forge" subtitle="Ambiente de desenvolvimento e editor de código (Fase 5)">
      <div className="max-w-4xl mx-auto py-12 text-center space-y-6 animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400 mx-auto">
          <Code2 size={32} />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-semibold uppercase tracking-wider">
            <Sparkles size={12} />
            <span>Ambiente Dev · Fase 5</span>
          </div>
          <h1 className="text-2xl font-black text-white">Forge Studio & Monaco Editor</h1>
          <p className="text-xs text-slate-400 max-w-lg mx-auto leading-relaxed">
            IDE web com Monaco Editor (engine do VS Code), árvore de arquivos, documentação interativa, TODOs e integração com Git preparado para ambientes conteinerizados futuros.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left pt-6 max-w-2xl mx-auto">
          {[
            { title: "Monaco Editor", desc: "Syntax highlight e atalhos completos do VS Code" },
            { title: "Árvore de Arquivos & Git", desc: "Gestão de versões e documentação de funções" },
            { title: "Athena Code Assistant", desc: "Explicação e refatoração de trechos de código" },
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

