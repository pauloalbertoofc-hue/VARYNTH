import { PageLayout } from "@/components/layout/PageLayout";
import { AppCard } from "@/components/ui/AppCard";
import { modules } from "@/lib/modules";

export default function ModulesPage() {
  const active = modules.filter((m) => m.status === "active");
  const wip = modules.filter((m) => m.status === "wip");
  const coming = modules.filter((m) => m.status === "coming-soon");

  return (
    <PageLayout title="Apps" subtitle="Todos os módulos do VARYNTH">
      <div className="p-6 space-y-10 animate-fade-in">
        {/* Active */}
        {active.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-emerald-400 tracking-[0.2em] uppercase mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
              Ativos
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {active.map((mod) => <AppCard key={mod.id} module={mod} />)}
            </div>
          </section>
        )}

        {/* WIP */}
        {wip.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-amber-400 tracking-[0.2em] uppercase mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block animate-pulse" />
              Em Desenvolvimento
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {wip.map((mod) => <AppCard key={mod.id} module={mod} />)}
            </div>
          </section>
        )}

        {/* Coming soon */}
        {coming.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-slate-500 tracking-[0.2em] uppercase mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-500 inline-block" />
              Em Breve
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {coming.map((mod) => <AppCard key={mod.id} module={mod} />)}
            </div>
          </section>
        )}
      </div>
    </PageLayout>
  );
}

