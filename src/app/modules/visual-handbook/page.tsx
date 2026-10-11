"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, Search } from "lucide-react";
import { PageLayout } from "@/components/layout/PageLayout";
import { visualCapabilities, visualWorkflows } from "@/lib/visual-core/studio-catalog";

export default function VisualHandbookPage() {
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLowerCase();
  const capabilities = useMemo(() => visualCapabilities.filter((item) => !normalized || `${item.name} ${item.description} ${item.workflow}`.toLowerCase().includes(normalized)), [normalized]);
  return <PageLayout title="Visual Handbook" subtitle="Documentação contextual do ecossistema visual e seus limites operacionais"><div className="mx-auto max-w-6xl space-y-6"><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--vly-text-muted)]" size={16} /><input aria-label="Buscar no Visual Handbook" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar Camera, provenance, graph..." className="vly-field w-full rounded-xl py-3 pl-10 pr-4 text-sm" /></div><section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{visualWorkflows.map((workflow) => <article key={workflow.id} className="rounded-2xl border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-panel)] p-4"><BookOpen size={18} className="text-[var(--vly-accent)]" /><h2 className="mt-3 text-sm font-bold text-[var(--vly-text-primary)]">{workflow.name}</h2><p className="mt-2 text-xs leading-5 text-[var(--vly-text-secondary)]">{workflow.description}</p></article>)}</section><section className="rounded-2xl border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-panel)] p-4"><h2 className="text-sm font-bold text-[var(--vly-text-primary)]">Capacidades indexadas ({capabilities.length})</h2><div className="mt-3 divide-y divide-[var(--vly-border-subtle)]">{capabilities.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="text-xs font-bold text-[var(--vly-text-primary)]">{item.name}</p><p className="mt-1 text-[11px] text-[var(--vly-text-muted)]">{item.evidence}</p></div>{item.href ? <Link href={item.href} className="text-xs font-bold text-[var(--vly-accent)]">Abrir →</Link> : <span className="text-[10px] uppercase tracking-wider text-[var(--vly-text-muted)]">{item.status}</span>}</div>)}</div></section></div></PageLayout>;
}
