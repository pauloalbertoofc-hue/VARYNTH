"use client";

import { PageLayout } from "@/components/layout/PageLayout";
import { AppCard } from "@/components/ui/AppCard";
import { modules } from "@/lib/modules";
import { Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";

export default function ModulesPage() {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "wip" | "coming-soon">("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const categories = useMemo(() => [...new Set(modules.map((module) => module.category))].sort(), []);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return modules.filter((module) => {
      const searchable = [module.name, module.description, module.id, module.category, ...module.tags].join(" ").toLocaleLowerCase();
      return (!normalized || searchable.includes(normalized)) &&
        (statusFilter === "all" || module.status === statusFilter) &&
        (categoryFilter === "all" || module.category === categoryFilter);
    });
  }, [categoryFilter, query, statusFilter]);
  const active = filtered.filter((m) => m.status === "active");
  const wip = filtered.filter((m) => m.status === "wip");
  const coming = filtered.filter((m) => m.status === "coming-soon");
  const hasFilter = query.trim() !== "" || statusFilter !== "all" || categoryFilter !== "all";

  return (
    <PageLayout title="Apps" subtitle="Todos os módulos do VARYNTH">
      <div className="vly-enter p-6 space-y-10">
        <section aria-label="Filtrar módulos" className="rounded-[var(--vly-radius-lg)] border border-[var(--vly-border-subtle)] bg-[var(--vly-surface)] p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">Buscar módulos</span>
              <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--vly-text-muted)]" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nome, descrição, categoria ou tag…" className="vly-field w-full pl-9 pr-3" />
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <SlidersHorizontal size={15} aria-hidden="true" className="text-[var(--vly-text-muted)]" />
              <label className="sr-only" htmlFor="module-status">Status</label>
              <select id="module-status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} className="vly-field px-3">
                <option value="all">Todos os estados</option><option value="active">Ativos</option><option value="wip">Em desenvolvimento</option><option value="coming-soon">Em breve</option>
              </select>
              <label className="sr-only" htmlFor="module-category">Categoria</label>
              <select id="module-category" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="vly-field px-3">
                <option value="all">Todas as categorias</option>{categories.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </div>
          </div>
          <p className="mt-3 text-xs text-[var(--vly-text-muted)]" role="status" aria-live="polite">
            {filtered.length} de {modules.length} módulos encontrados{hasFilter ? " com os filtros atuais" : ""}.
          </p>
        </section>

        {filtered.length === 0 && <section className="rounded-[var(--vly-radius-lg)] border border-dashed border-[var(--vly-border-default)] p-8 text-center"><p className="text-sm text-[var(--vly-text-secondary)]">Nenhum módulo corresponde à busca.</p><button type="button" onClick={() => { setQuery(""); setStatusFilter("all"); setCategoryFilter("all"); }} className="mt-3 rounded-lg border border-[var(--vly-border-default)] px-3 py-2 text-xs text-[var(--vly-text-primary)]">Limpar filtros</button></section>}

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
