"use client";

import { useEffect, useState } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { experienceService } from "@/lib/experience/experience-service";
import { preferenceService } from "@/lib/experience/preference-service";
import type { ExperienceEvent, Preference } from "@/lib/experience";

export default function ExperiencePage() {
  const [events, setEvents] = useState<ExperienceEvent[]>([]);
  const [preferences, setPreferences] = useState<Preference[]>([]);
  const [busy, setBusy] = useState(false);
  async function refresh() {
    const [nextEvents, nextPreferences] = await Promise.all([experienceService.list(), preferenceService.resolve({})]);
    setEvents(nextEvents.sort((a, b) => b.timestamp.localeCompare(a.timestamp)));
    setPreferences(nextPreferences);
  }
  useEffect(() => { void refresh(); }, []);
  async function confirm(id: string) { setBusy(true); try { await preferenceService.setStatus(id, "CONFIRMED"); await refresh(); } finally { setBusy(false); } }
  async function forget(id: string) { setBusy(true); try { await experienceService.forget(id); await refresh(); } finally { setBusy(false); } }
  return <PageLayout title="Experience Layer" subtitle="Evidência, preferências e adaptação controlável">
    <main className="p-6 space-y-6 animate-fade-in">
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[['Eventos', events.length], ['Preferências', preferences.length], ['Confirmadas', preferences.filter((p) => p.status === "CONFIRMED").length], ['Inferidas', preferences.filter((p) => p.status === "INFERRED").length]].map(([label, value]) => <div key={String(label)} className="rounded-xl border border-white/10 bg-white/[0.03] p-4"><p className="text-[10px] uppercase tracking-widest text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold text-white">{value}</p></div>)}
      </section>
      <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5"><h2 className="text-sm font-semibold text-white">Preferências com proveniência</h2><p className="mt-1 text-xs text-slate-500">Inferência não é fato. Confirme, rejeite ou esqueça quando necessário.</p><div className="mt-4 space-y-2">{preferences.length === 0 ? <p className="text-xs text-slate-500">Nenhuma preferência recuperável ainda.</p> : preferences.map((preference) => <article key={preference.id} className="rounded-lg border border-white/10 p-3"><div className="flex items-start justify-between gap-3"><div><p className="text-sm text-slate-100">{preference.key}: {String(preference.value)}</p><p className="mt-1 text-[10px] text-slate-500">{preference.domain} · {preference.scope}{preference.scopeId ? `:${preference.scopeId}` : ""} · confiança {Math.round(preference.confidence * 100)}%</p></div><div className="flex gap-2">{preference.status === "INFERRED" && <button disabled={busy} onClick={() => void confirm(preference.id)} className="rounded border border-emerald-500/30 px-2 py-1 text-[10px] text-emerald-300">Confirmar</button>}<button disabled={busy} onClick={() => void preferenceService.setStatus(preference.id, "REJECTED").then(refresh)} className="rounded border border-rose-500/30 px-2 py-1 text-[10px] text-rose-300">Rejeitar</button></div></div><p className="mt-2 text-[10px] text-slate-500">Evidências: {preference.evidence.map((e) => e.eventId).join(", ") || "nenhuma"}</p></article>)}</div></section>
      <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5"><div className="flex items-center justify-between"><div><h2 className="text-sm font-semibold text-white">Eventos observados</h2><p className="mt-1 text-xs text-slate-500">Registro local, escopado e reversível.</p></div><button disabled={busy} onClick={() => events[0] && void forget(events[0].id)} className="rounded border border-white/10 px-2 py-1 text-[10px] text-slate-400">Esquecer último</button></div><div className="mt-4 space-y-2">{events.slice(0, 20).map((event) => <div key={event.id} className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2"><span className="text-xs text-slate-200">{event.actionType} · {event.source}</span><span className="text-[10px] text-slate-500">{event.privacyScope} · {new Date(event.timestamp).toLocaleString("pt-BR")}</span></div>)}</div></section>
    </main>
  </PageLayout>;
}
