import { PageLayout } from "@/components/layout/PageLayout";
import { AppCard } from "@/components/ui/AppCard";
import { modules } from "@/lib/modules";

export default function ModulesPage() {
  const active = modules.filter((m) => m.status === "active");
  const wip = modules.filter((m) => m.status === "wip");
  const coming = modules.filter((m) => m.status === "coming-soon");

  return (
    <PageLayout title="Apps" subtitle="Todos os módulos do VARYNTH">
      <div className="vly-enter p-6 space-y-10">
        {/* Active */}
        {active.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-[var(--vly-success)] tracking-[0.2em] uppercase mb-4 flex items-center gap-2">
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
            <h2 className="text-xs font-semibold text-[var(--vly-warning)] tracking-[0.2em] uppercase mb-4 flex items-center gap-2">
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
            <h2 className="text-xs font-semibold text-[var(--vly-text-muted)] tracking-[0.2em] uppercase mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--vly-text-muted)] inline-block" />
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
