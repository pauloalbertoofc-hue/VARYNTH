import { PageLayout } from "@/components/layout/PageLayout";
import { Bot, Sparkles } from "lucide-react";

export default function AthenaPage() {
  return (
    <PageLayout title="Athena" subtitle="Sua IA pessoal">
      <div className="flex flex-col items-center justify-center h-full p-6 animate-fade-in">
        <div className="max-w-md w-full text-center space-y-6">
          {/* Icon */}
          <div className="mx-auto w-20 h-20 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center glow-accent">
            <Bot size={36} className="text-violet-400" />
          </div>

          <div>
            <h2 className="text-xl font-bold text-white flex items-center justify-center gap-2">
              Athena
              <Sparkles size={16} className="text-violet-400" />
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Integração com a Athena em desenvolvimento. Em breve você vai conversar, criar e automatizar tarefas diretamente aqui dentro.
            </p>
          </div>

          <div className="bg-[#0f0f1a] border border-[#1e1e30] rounded-lg p-4 text-left space-y-2">
            <p className="text-xs text-violet-400 font-semibold tracking-wider uppercase">Funcionalidades planejadas</p>
            {[
              "Chat contextual com histórico salvo",
              "Acesso aos seus módulos via linguagem natural",
              "Resumo diário de atividades",
              "Criação de tarefas e lembretes",
            ].map((f) => (
              <div key={f} className="flex items-center gap-2 text-xs text-slate-400">
                <span className="w-1 h-1 rounded-full bg-violet-400 flex-shrink-0" />
                {f}
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

