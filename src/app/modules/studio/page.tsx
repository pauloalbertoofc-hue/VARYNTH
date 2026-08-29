import { PageLayout } from "@/components/layout/PageLayout";
import { Code2, Terminal } from "lucide-react";

export default function StudioPage() {
  return (
    <PageLayout title="Studio" subtitle="Editor de código embutido">
      <div className="flex flex-col items-center justify-center h-full p-6 animate-fade-in">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="mx-auto w-20 h-20 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <Code2 size={36} className="text-amber-400" />
          </div>

          <div>
            <h2 className="text-xl font-bold text-white flex items-center justify-center gap-2">
              Studio
              <Terminal size={16} className="text-amber-400" />
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Editor de código estilo VS Code embutido no VARYNTH — em desenvolvimento.
            </p>
          </div>

          <div className="bg-[#0f0f1a] border border-[#1e1e30] rounded-lg p-4 text-left space-y-2">
            <p className="text-xs text-amber-400 font-semibold tracking-wider uppercase">Funcionalidades planejadas</p>
            {[
              "Monaco Editor (engine do VS Code)",
              "Syntax highlighting para múltiplas linguagens",
              "Terminal integrado",
              "Sync com GitHub (push/pull)",
            ].map((f) => (
              <div key={f} className="flex items-center gap-2 text-xs text-slate-400">
                <span className="w-1 h-1 rounded-full bg-amber-400 flex-shrink-0" />
                {f}
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

