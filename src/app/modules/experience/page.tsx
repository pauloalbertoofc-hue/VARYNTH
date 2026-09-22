"use client";

import { useEffect, useState } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { experienceService } from "@/lib/experience/experience-service";
import { preferenceService } from "@/lib/experience/preference-service";
import { learningExclusionService } from "@/lib/experience/learning-exclusion-service";
import type { ExperienceEvent, LearningExclusion, LearningExclusionScope, Preference } from "@/lib/experience";
import { experienceRepository } from "@/lib/persistence/repositories";

export default function ExperiencePage() {
  const [events, setEvents] = useState<ExperienceEvent[]>([]);
  const [preferences, setPreferences] = useState<Preference[]>([]);
  const [exclusions, setExclusions] = useState<LearningExclusion[]>([]);
  const [scope, setScope] = useState<LearningExclusionScope>("GLOBAL");
  const [scopeId, setScopeId] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  async function refresh() {
    const [nextEvents, nextPreferences, nextExclusions] = await Promise.all([experienceService.list(), preferenceService.resolve({}), learningExclusionService.list()]);
    setEvents(nextEvents.sort((a, b) => b.timestamp.localeCompare(a.timestamp)));
    setPreferences(nextPreferences);
    setExclusions(nextExclusions);
  }
  useEffect(() => { void refresh(); }, []);
  async function confirm(id: string) { setBusy(true); try { await preferenceService.setStatus(id, "CONFIRMED"); await refresh(); } finally { setBusy(false); } }
  async function forget(id: string) { setBusy(true); try { await experienceService.forget(id); await refresh(); } finally { setBusy(false); } }
  async function saveExclusion() { setBusy(true); try { await learningExclusionService.disable(scope, scope === "GLOBAL" ? undefined : scopeId, reason); setReason(""); await refresh(); } finally { setBusy(false); } }
  async function removeExclusion(item: LearningExclusion) { setBusy(true); try { await learningExclusionService.enable(item.scope, item.scopeId); await refresh(); } finally { setBusy(false); } }
  async function exportData() {
    const [allEvents, allPreferences, allExperiences, allExclusions] = await Promise.all([experienceService.list(), preferenceService.exportAll(), experienceRepository.getAll(), learningExclusionService.list()]);
    const file = new Blob([JSON.stringify({ schemaVersion: 1, exportedAt: new Date().toISOString(), storage: "local-device", events: allEvents, preferences: allPreferences, experiences: allExperiences, learningExclusions: allExclusions }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(file); const link = document.createElement("a"); link.href = url; link.download = `varynth-experience-${new Date().toISOString().slice(0, 10)}.json`; link.click(); URL.revokeObjectURL(url);
  }
  return <PageLayout title="Experience Layer" subtitle="Evidência, preferências e adaptação controlável">
    <main className="p-6 space-y-6 animate-fade-in">
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[['Eventos', events.length], ['Preferências', preferences.length], ['Confirmadas', preferences.filter((p) => p.status === "CONFIRMED").length], ['Inferidas', preferences.filter((p) => p.status === "INFERRED").length]].map(([label, value]) => <div key={String(label)} className="rounded-xl border border-white/10 bg-white/[0.03] p-4"><p className="text-[10px] uppercase tracking-widest text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold text-white">{value}</p></div>)}
      </section>
      <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-slate-500">Os dados permanecem neste dispositivo; isso não altera pesos de modelos.</p><button type="button" onClick={() => void exportData()} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-200 hover:bg-white/5">Exportar dados da Experience Layer</button></div>
      <section className="rounded-xl border border-amber-400/20 bg-amber-500/[0.04] p-5">
        <h2 className="text-sm font-semibold text-white">Não aprender neste escopo</h2>
        <p className="mt-1 text-xs text-slate-400">Os eventos continuam registrados para rastreabilidade, mas não podem alimentar sinais, padrões ou preferências enquanto a exclusão estiver ativa.</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <select aria-label="Escopo de exclusão" value={scope} onChange={(event) => setScope(event.target.value as LearningExclusionScope)} className="min-h-10 rounded-lg border border-white/10 bg-slate-950 px-3 text-xs text-white">
            {(["GLOBAL", "DOMAIN", "AGENT", "MODULE", "PROJECT", "ARTIFACT", "SESSION"] as const).map((item) => <option key={item} value={item}>{item === "GLOBAL" ? "Toda a Experience Layer" : item}</option>)}
          </select>
          {scope !== "GLOBAL" && <input aria-label="Identificador do escopo" value={scopeId} onChange={(event) => setScopeId(event.target.value)} placeholder="ID do escopo" className="min-h-10 rounded-lg border border-white/10 bg-slate-950 px-3 text-xs text-white" />}
          <input aria-label="Motivo da exclusão" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Motivo (opcional)" className="min-h-10 flex-1 rounded-lg border border-white/10 bg-slate-950 px-3 text-xs text-white" />
          <button disabled={busy || (scope !== "GLOBAL" && !scopeId.trim())} onClick={() => void saveExclusion()} className="min-h-10 rounded-lg border border-amber-300/30 px-3 text-xs font-semibold text-amber-200 disabled:opacity-40">Desativar aprendizado</button>
        </div>
        <div className="mt-3 space-y-2">{exclusions.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-amber-300/10 px-3 py-2"><span className="text-xs text-amber-100">{item.scope}{item.scopeId ? ` · ${item.scopeId}` : ""}{item.reason ? ` · ${item.reason}` : ""}</span><button disabled={busy} onClick={() => void removeExclusion(item)} className="text-[10px] text-slate-300 underline">Reativar</button></div>)}</div>
      </section>
      <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5"><h2 className="text-sm font-semibold text-white">Preferências com proveniência</h2><p className="mt-1 text-xs text-slate-500">Inferência não é fato. Confirme, rejeite ou esqueça quando necessário.</p><div className="mt-4 space-y-2">{preferences.length === 0 ? <p className="text-xs text-slate-500">Nenhuma preferência recuperável ainda.</p> : preferences.map((preference) => <article key={preference.id} className="rounded-lg border border-white/10 p-3"><div className="flex items-start justify-between gap-3"><div><p className="text-sm text-slate-100">{preference.key}: {String(preference.value)}</p><p className="mt-1 text-[10px] text-slate-500">{preference.domain} · {preference.scope}{preference.scopeId ? `:${preference.scopeId}` : ""} · confiança {Math.round(preference.confidence * 100)}%</p></div><div className="flex gap-2">{preference.status === "INFERRED" && <button disabled={busy} onClick={() => void confirm(preference.id)} className="rounded border border-emerald-500/30 px-2 py-1 text-[10px] text-emerald-300">Confirmar</button>}<button disabled={busy} onClick={() => void preferenceService.setStatus(preference.id, "REJECTED").then(refresh)} className="rounded border border-rose-500/30 px-2 py-1 text-[10px] text-rose-300">Rejeitar</button></div></div><p className="mt-2 text-[10px] text-slate-500">Evidências: {preference.evidence.map((e) => e.eventId).join(", ") || "nenhuma"}</p></article>)}</div></section>
      <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5"><div className="flex items-center justify-between"><div><h2 className="text-sm font-semibold text-white">Eventos observados</h2><p className="mt-1 text-xs text-slate-500">Registro local, escopado e reversível.</p></div><button disabled={busy} onClick={() => events[0] && void forget(events[0].id)} className="rounded border border-white/10 px-2 py-1 text-[10px] text-slate-400">Esquecer último</button></div><div className="mt-4 space-y-2">{events.slice(0, 20).map((event) => <div key={event.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 px-3 py-2"><span className="text-xs text-slate-200">{event.actionType} · {event.source} · {event.learningEligible ? "elegível" : "não aprendível"}</span><span className="flex items-center gap-3 text-[10px] text-slate-500">{event.privacyScope} · {new Date(event.timestamp).toLocaleString("pt-BR")}<button disabled={busy} onClick={() => void forget(event.id)} className="text-rose-300 underline">Esquecer</button></span></div>)}</div></section>
    </main>
  </PageLayout>;
}
