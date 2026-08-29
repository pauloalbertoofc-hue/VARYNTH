import { PageLayout } from "@/components/layout/PageLayout";
import { FlaskConical, Lightbulb, Skull, ArrowRight, Sparkles } from "lucide-react";

export default function LabsPage() {
  return (
    <PageLayout title="Labs & Graveyard" subtitle="Incubadora de ideias e retrospectiva de aprendizados (Fase 2)">
      <div className="max-w-4xl mx-auto py-12 text-center space-y-6 animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
          <FlaskConical size={32} />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold uppercase tracking-wider">
            <Sparkles size={12} />
            <span>Incubadora & Retros · Fase 2</span>
          </div>
          <h1 className="text-2xl font-black text-white">Labs & Graveyard</h1>
          <p className="text-xs text-slate-400 max-w-lg mx-auto leading-relaxed">
            Pipeline de maturação: <span className="text-amber-300 font-semibold">Ideia → Experimento → Protótipo → Projeto</span> com botão &quot;Promote to Project&quot;, e memorial de projetos arquivados com lições aprendidas e componentes reutilizáveis.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left pt-6 max-w-2xl mx-auto">
          <div className="p-5 rounded-xl bg-[#0f0f1a] border border-[#1e1e30] space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
              <Lightbulb size={16} />
              <span>Incubadora de Ideias</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Registre hipóteses soltas e teste protótipos rápidos antes de criar uma workspace formal de projeto.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-[#0f0f1a] border border-[#1e1e30] space-y-2">
            <div className="flex items-center gap-2 text-slate-400 font-bold text-xs">
              <Skull size={16} />
              <span>Memorial Graveyard</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Guarde o motivo da desistência, aprendizados e trechos de código reaproveitáveis de projetos descontinuados.
            </p>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

