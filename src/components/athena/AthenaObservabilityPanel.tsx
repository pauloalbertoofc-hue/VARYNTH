"use client";

import { useEffect, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, Download, Filter, Info, ShieldAlert } from "lucide-react";
import type { InteractionContract } from "@/lib/athena/domain/interaction-contract";
import { athenaObservabilityJournal, type ObservabilityCategory, type ObservabilityStatus } from "@/lib/athena/observability/local-observability-journal";
import { cn } from "@/lib/utils";
import { Surface } from "@/components/ui/Surface";

const CONTRACTS: Array<InteractionContract | "ALL"> = ["ALL", "ANSWER_SELF", "USE_AGENT", "USE_TOOL"];
const CATEGORIES: Array<ObservabilityCategory | "ALL"> = ["ALL", "CONTRACT", "PLAN", "TOOL", "AGENT", "SECURITY", "SYSTEM"];

function statusStyle(status: ObservabilityStatus): string {
  if (status === "FAILED" || status === "BLOCKED") return "border-[var(--vly-border-danger)] bg-[color-mix(in_srgb,var(--vly-danger)_12%,var(--vly-surface))] text-[var(--vly-danger)]";
  if (status === "COMPLETED" || status === "REVERTED") return "border-[var(--vly-border-success)] bg-[color-mix(in_srgb,var(--vly-success)_12%,var(--vly-surface))] text-[var(--vly-success)]";
  return "border-[var(--vly-border-default)] bg-[var(--vly-surface-raised)] text-[var(--vly-text-muted)]";
}

export function AthenaObservabilityPanel({ compact = false }: { compact?: boolean }) {
  const [revision, setRevision] = useState(0);
  const [contract, setContract] = useState<InteractionContract | "ALL">("ALL");
  const [category, setCategory] = useState<ObservabilityCategory | "ALL">("ALL");
  const [selectedId, setSelectedId] = useState<string>();
  const entries = athenaObservabilityJournal.list({ contract: contract === "ALL" ? undefined : contract, category: category === "ALL" ? undefined : category });
  const diagnostic = athenaObservabilityJournal.diagnose();
  const selected = entries.find((entry) => entry.id === selectedId);

  useEffect(() => {
    const refresh = () => setRevision((value) => value + 1);
    window.addEventListener("varynth_athena_observability_updated", refresh);
    return () => window.removeEventListener("varynth_athena_observability_updated", refresh);
  }, []);

  const exportDiagnostic = () => {
    const blob = new Blob([athenaObservabilityJournal.exportSanitized()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `varynth-athena-diagnostico-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (compact) {
    const attention = diagnostic.failed + diagnostic.blocked;
    return (
      <details className="border-b border-[var(--vly-border-subtle)] bg-[var(--vly-world)]/80 px-3 py-2">
        <summary className="vly-interactive flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 text-[10px] font-bold text-[var(--vly-text-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vly-accent)]">
          <span className="flex items-center gap-1.5"><Activity size={12} className="text-[var(--vly-info)]" /> Diagnóstico local</span>
          <span className={attention ? "text-[var(--vly-warning)]" : "text-[var(--vly-success)]"}>{attention ? `${attention} requer atenção` : "sem bloqueios"}</span>
        </summary>
        <div className="grid grid-cols-3 gap-1.5 pb-1 text-center text-[9px]">
          <div className="rounded bg-[var(--vly-surface-raised)] p-2 text-[var(--vly-text-muted)]"><strong className="block text-[var(--vly-text-secondary)]">{diagnostic.total}</strong>eventos</div>
          <div className="rounded bg-[var(--vly-surface-raised)] p-2 text-[var(--vly-success)]"><strong className="block">{diagnostic.completed}</strong>concluídos</div>
          <div className="rounded bg-[var(--vly-surface-raised)] p-2 text-[var(--vly-danger)]"><strong className="block">{attention}</strong>atenção</div>
        </div>
      </details>
    );
  }

  return (
    <Surface tone="panel" role="region" className="overflow-hidden" aria-labelledby="observability-title">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--vly-border-subtle)] bg-[var(--vly-surface-raised)] px-4 py-3">
        <div><h2 id="observability-title" className="flex items-center gap-2 text-sm font-bold text-[var(--vly-text-primary)]"><Activity size={15} className="text-[var(--vly-info)]" /> Observabilidade local</h2><p className="mt-0.5 text-[10px] text-[var(--vly-text-muted)]">Explica decisões e falhas sem conceder autoridade operacional.</p></div>
        <button type="button" onClick={exportDiagnostic} aria-label="Exportar diagnóstico sanitizado" className="vly-interactive min-h-11 rounded-lg border border-[var(--vly-border-info)] px-3 text-[11px] font-bold text-[var(--vly-info)] hover:bg-[var(--vly-info)]/10"><Download size={13} className="mr-1 inline" /> Exportar diagnóstico</button>
      </header>

      <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-4">
        {[{ label: "Eventos", value: diagnostic.total, icon: Info }, { label: "Concluídos", value: diagnostic.completed, icon: CheckCircle2 }, { label: "Falhas", value: diagnostic.failed, icon: AlertTriangle }, { label: "Bloqueios", value: diagnostic.blocked, icon: ShieldAlert }].map(({ label, value, icon: Icon }) => <div key={label} className="rounded-xl border border-[var(--vly-border-default)] bg-[var(--vly-surface-raised)] p-3"><Icon size={13} className="text-[var(--vly-text-muted)]" /><strong className="mt-2 block text-lg text-[var(--vly-text-primary)]">{value}</strong><span className="text-[10px] text-[var(--vly-text-muted)]">{label}</span></div>)}
      </div>

      <div className="flex flex-wrap gap-2 border-y border-[var(--vly-border-subtle)] p-3" aria-label="Filtros do diagnóstico">
        <span className="flex items-center gap-1 text-[10px] text-[var(--vly-text-muted)]"><Filter size={11} /> Filtros</span>
        <select aria-label="Filtrar por contrato" value={contract} onChange={(event) => setContract(event.target.value as InteractionContract | "ALL")} className="vly-field min-h-11 rounded-lg px-2 text-[10px]">{CONTRACTS.map((item) => <option key={item} value={item}>{item === "ALL" ? "Todos os contratos" : item}</option>)}</select>
        <select aria-label="Filtrar por categoria" value={category} onChange={(event) => setCategory(event.target.value as ObservabilityCategory | "ALL")} className="vly-field min-h-11 rounded-lg px-2 text-[10px]">{CATEGORIES.map((item) => <option key={item} value={item}>{item === "ALL" ? "Todas as categorias" : item}</option>)}</select>
      </div>

      <div className="max-h-[420px] overflow-y-auto p-3" aria-live="polite">
        {!entries.length ? <p className="p-6 text-center text-xs text-[var(--vly-text-muted)]">Nenhum evento corresponde aos filtros.</p> : <div className="space-y-2">{entries.slice(0, 100).map((entry) => <button type="button" key={entry.id} onClick={() => setSelectedId(selectedId === entry.id ? undefined : entry.id)} className="vly-interactive min-h-11 w-full rounded-xl border border-[var(--vly-border-default)] bg-[var(--vly-surface-raised)] p-3 text-left hover:bg-[var(--vly-surface-hover)]" aria-expanded={selectedId === entry.id} aria-label={`Evento ${entry.status}: ${entry.message}`}><div className="flex flex-wrap items-center gap-2"><span className={cn("rounded border px-1.5 py-0.5 text-[8px] font-bold", statusStyle(entry.status))}>{entry.status}</span><span className="text-[9px] text-[var(--vly-info)]">{entry.contract || entry.category}</span><span className="ml-auto text-[8px] text-[var(--vly-text-disabled)]">{new Date(entry.timestamp).toLocaleString("pt-BR")}</span></div><p className="mt-1.5 text-[10px] text-[var(--vly-text-secondary)]">{entry.message}</p>{selectedId === entry.id && <div className="mt-2 rounded-lg bg-[var(--vly-surface)] p-2 text-[9px] leading-relaxed text-[var(--vly-text-muted)]"><p>{athenaObservabilityJournal.explain(entry)}</p><p className="mt-1 font-mono text-[var(--vly-text-disabled)]">{[entry.projectId && `projeto=${entry.projectId}`, entry.planId && `plano=${entry.planId}`, entry.stepId && `etapa=${entry.stepId}`, entry.capabilityId && `capacidade=${entry.capabilityId}`].filter(Boolean).join(" · ") || "sem correlação adicional"}</p></div>}</button>)}</div>}
      </div>
      <footer className="border-t border-[var(--vly-border-subtle)] px-4 py-2 text-[9px] text-[var(--vly-text-disabled)]">Retenção máxima: 300 eventos sanitizados · duração média: {diagnostic.averageDurationMs} ms · retries: {diagnostic.retries} · reversões: {diagnostic.reversals}</footer>
    </Surface>
  );
}
