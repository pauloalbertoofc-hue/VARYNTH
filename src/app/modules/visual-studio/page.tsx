"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, CircleDashed, FlaskConical, Lightbulb } from "lucide-react";
import { PageLayout } from "@/components/layout/PageLayout";
import { visualCapabilities, visualWorkflows, type VisualCapabilityStatus } from "@/lib/visual-core/studio-catalog";

const statusLabel: Record<VisualCapabilityStatus, string> = { READY: "Operacional", PARTIAL: "Parcial", PLANNED: "Planejado" };
const statusClass: Record<VisualCapabilityStatus, string> = { READY: "text-emerald-300", PARTIAL: "text-amber-300", PLANNED: "text-[var(--vly-text-muted)]" };

export default function VisualStudioPage() {
  return (
    <PageLayout title="Varynth Visual Studio" subtitle="Orquestração visual por contratos, proveniência e capacidades reais">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-2xl border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-panel)] p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--vly-accent)]">Visual Core</p><h2 className="mt-2 text-xl font-bold text-[var(--vly-text-primary)]">Um fluxo, seis responsabilidades explícitas</h2><p className="mt-2 max-w-3xl text-sm text-[var(--vly-text-secondary)]">A captura não é geração, a melhoria não destrói o original e a produção mantém o documento visual versionado. Este painel apresenta o que já está conectado e o que ainda requer um motor próprio.</p></div>
            <Link href="/modules/technical-archive" className="vly-interactive inline-flex items-center rounded-lg border border-[var(--vly-border-strong)] px-3 py-2 text-xs font-bold text-[var(--vly-text-primary)]">Abrir documentação <ArrowRight size={14} className="ml-2" /></Link>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3 xl:grid-cols-6">{visualWorkflows.map((workflow) => <div key={workflow.id} className="rounded-xl border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-raised)] p-3"><p className="text-xs font-bold text-[var(--vly-text-primary)]">{workflow.name}</p><p className="mt-1 text-[11px] text-[var(--vly-text-muted)]">{workflow.description}</p></div>)}</div>
        </section>
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{visualCapabilities.map((capability) => <article key={capability.id} className="flex min-h-44 flex-col rounded-2xl border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-panel)] p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-wider text-[var(--vly-text-muted)]">{capability.workflow}</p><h3 className="mt-1 text-sm font-bold text-[var(--vly-text-primary)]">{capability.name}</h3></div><span className={`inline-flex items-center gap-1 text-[10px] font-bold ${statusClass[capability.status]}`}>{capability.status === "READY" ? <CheckCircle2 size={13} /> : capability.status === "PARTIAL" ? <FlaskConical size={13} /> : <CircleDashed size={13} />}{statusLabel[capability.status]}</span></div><p className="mt-3 text-xs leading-5 text-[var(--vly-text-secondary)]">{capability.description}</p><p className="mt-auto pt-4 text-[10px] text-[var(--vly-text-muted)]">Evidência: {capability.evidence}</p>{capability.href && <Link href={capability.href} className="vly-interactive mt-3 inline-flex w-fit items-center rounded-lg bg-[var(--vly-accent)] px-3 py-2 text-xs font-bold text-[var(--vly-accent-contrast)]">Abrir capacidade <ArrowRight size={13} className="ml-2" /></Link>}</article>)}</section>
        <div className="flex items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 text-xs text-amber-200"><Lightbulb size={16} /> Capacidades planejadas permanecem sem ação executável até existir um backend real, sandbox ou motor validado.</div>
      </div>
    </PageLayout>
  );
}
