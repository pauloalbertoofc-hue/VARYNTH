"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, Download, Filter, Info, ShieldAlert } from "lucide-react";
import type { InteractionContract } from "@/lib/athena/domain/interaction-contract";
import { athenaObservabilityJournal, type ObservabilityCategory, type ObservabilityStatus } from "@/lib/athena/observability/local-observability-journal";
import { cn } from "@/lib/utils";

const CONTRACTS: Array<InteractionContract | "ALL"> = ["ALL", "ANSWER_SELF", "USE_AGENT", "USE_TOOL"];
const CATEGORIES: Array<ObservabilityCategory | "ALL"> = ["ALL", "CONTRACT", "PLAN", "TOOL", "AGENT", "SECURITY", "SYSTEM"];

function statusStyle(status: ObservabilityStatus): string {
  if (status === "FAILED" || status === "BLOCKED") return "border-rose-500/30 bg-rose-500/10 text-rose-300";
  if (status === "COMPLETED" || status === "REVERTED") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  return "border-slate-600/30 bg-slate-800/60 text-slate-400";
}

export function AthenaObservabilityPanel({ compact = false }: { compact?: boolean }) {
  const [revision, setRevision] = useState(0);
  const [contract, setContract] = useState<InteractionContract | "ALL">("ALL");
  const [category, setCategory] = useState<ObservabilityCategory | "ALL">("ALL");
  const [selectedId, setSelectedId] = useState<string>();
  const entries = useMemo(() => athenaObservabilityJournal.list({ contract: contract === "ALL" ? undefined : contract, category: category === "ALL" ? undefined : category }), [revision, contract, category]);
  const diagnostic = useMemo(() => athenaObservabilityJournal.diagnose(), [revision]);
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
      <details className="border-b border-[#1e1e30] bg-[#0a0a0f]/80 px-3 py-2">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 text-[10px] font-bold text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">
          <span className="flex items-center gap-1.5"><Activity size={12} className="text-cyan-400" /> Diagnóstico local</span>
          <span className={attention ? "text-amber-300" : "text-emerald-300"}>{attention ? `${attention} requer atenção` : "sem bloqueios"}</span>
        </summary>
        <div className="grid grid-cols-3 gap-1.5 pb-1 text-center text-[9px]">
          <div className="rounded bg-[#11111b] p-2 text-slate-400"><strong className="block text-slate-200">{diagnostic.total}</strong>eventos</div>
          <div className="rounded bg-[#11111b] p-2 text-emerald-400"><strong className="block">{diagnostic.completed}</strong>concluídos</div>
          <div className="rounded bg-[#11111b] p-2 text-rose-300"><strong className="block">{attention}</strong>atenção</div>
        </div>
      </details>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-[#1e1e30] bg-[#0f0f1a]" aria-labelledby="observability-title">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#25253a] bg-[#0a0a0f] px-4 py-3">
        <div><h2 id="observability-title" className="flex items-center gap-2 text-sm font-bold text-white"><Activity size={15} className="text-cyan-400" /> Observabilidade local</h2><p className="mt-0.5 text-[10px] text-slate-500">Explica decisões e falhas sem conceder autoridade operacional.</p></div>
        <button onClick={exportDiagnostic} className="min-h-11 rounded-lg border border-cyan-500/30 px-3 text-[11px] font-bold text-cyan-300 hover:bg-cyan-500/10"><Download size={13} className="mr-1 inline" /> Exportar diagnóstico</button>
      </header>

      <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-4">
        {[{ label: "Eventos", value: diagnostic.total, icon: Info }, { label: "Concluídos", value: diagnostic.completed, icon: CheckCircle2 }, { label: "Falhas", value: diagnostic.failed, icon: AlertTriangle }, { label: "Bloqueios", value: diagnostic.blocked, icon: ShieldAlert }].map(({ label, value, icon: Icon }) => <div key={label} className="rounded-xl border border-[#25253a] bg-[#11111b] p-3"><Icon size={13} className="text-slate-500" /><strong className="mt-2 block text-lg text-white">{value}</strong><span className="text-[10px] text-slate-500">{label}</span></div>)}
      </div>

      <div className="flex flex-wrap gap-2 border-y border-[#25253a] p-3" aria-label="Filtros do diagnóstico">
        <span className="flex items-center gap-1 text-[10px] text-slate-500"><Filter size={11} /> Filtros</span>
        <select aria-label="Filtrar por contrato" value={contract} onChange={(event) => setContract(event.target.value as InteractionContract | "ALL")} className="min-h-11 rounded-lg border border-[#303048] bg-[#11111b] px-2 text-[10px] text-slate-300">{CONTRACTS.map((item) => <option key={item} value={item}>{item === "ALL" ? "Todos os contratos" : item}</option>)}</select>
        <select aria-label="Filtrar por categoria" value={category} onChange={(event) => setCategory(event.target.value as ObservabilityCategory | "ALL")} className="min-h-11 rounded-lg border border-[#303048] bg-[#11111b] px-2 text-[10px] text-slate-300">{CATEGORIES.map((item) => <option key={item} value={item}>{item === "ALL" ? "Todas as categorias" : item}</option>)}</select>
      </div>

      <div className="max-h-[420px] overflow-y-auto p-3" aria-live="polite">
        {!entries.length ? <p className="p-6 text-center text-xs text-slate-500">Nenhum evento corresponde aos filtros.</p> : <div className="space-y-2">{entries.slice(0, 100).map((entry) => <button key={entry.id} onClick={() => setSelectedId(selectedId === entry.id ? undefined : entry.id)} className="min-h-11 w-full rounded-xl border border-[#25253a] bg-[#11111b] p-3 text-left hover:bg-white/[0.03]" aria-expanded={selectedId === entry.id}><div className="flex flex-wrap items-center gap-2"><span className={cn("rounded border px-1.5 py-0.5 text-[8px] font-bold", statusStyle(entry.status))}>{entry.status}</span><span className="text-[9px] text-cyan-400">{entry.contract || entry.category}</span><span className="ml-auto text-[8px] text-slate-600">{new Date(entry.timestamp).toLocaleString("pt-BR")}</span></div><p className="mt-1.5 text-[10px] text-slate-300">{entry.message}</p>{selectedId === entry.id && <div className="mt-2 rounded-lg bg-[#09090e] p-2 text-[9px] leading-relaxed text-slate-400"><p>{athenaObservabilityJournal.explain(entry)}</p><p className="mt-1 font-mono text-slate-600">{[entry.projectId && `projeto=${entry.projectId}`, entry.planId && `plano=${entry.planId}`, entry.stepId && `etapa=${entry.stepId}`, entry.capabilityId && `capacidade=${entry.capabilityId}`].filter(Boolean).join(" · ") || "sem correlação adicional"}</p></div>}</button>)}</div>}
      </div>
      <footer className="border-t border-[#25253a] px-4 py-2 text-[9px] text-slate-600">Retenção máxima: 300 eventos sanitizados · duração média: {diagnostic.averageDurationMs} ms · retries: {diagnostic.retries} · reversões: {diagnostic.reversals}</footer>
    </section>
  );
}
