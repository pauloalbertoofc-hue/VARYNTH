"use client";

import { useEffect, useState } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { experienceService } from "@/lib/experience/experience-service";
import { preferenceService } from "@/lib/experience/preference-service";
import { learningExclusionService } from "@/lib/experience/learning-exclusion-service";
import { derivePreferenceCandidates } from "@/lib/experience/preference-candidate-service";
import type { ExperienceEvent, LearningExclusion, LearningExclusionScope, Preference, PreferenceCandidate } from "@/lib/experience";
import { experienceRepository } from "@/lib/persistence/repositories";
import { confidenceFromEvidence } from "@/lib/experience/signals";
import { getExperienceOwnerId } from "@/lib/experience/identity";
import { legacyExperienceMigrationService } from "@/lib/experience/legacy-migration-service";

export default function ExperiencePage() {
  const [events, setEvents] = useState<ExperienceEvent[]>([]);
  const [preferences, setPreferences] = useState<Preference[]>([]);
  const [candidates, setCandidates] = useState<PreferenceCandidate[]>([]);
  const [exclusions, setExclusions] = useState<LearningExclusion[]>([]);
  const [scope, setScope] = useState<LearningExclusionScope>("GLOBAL");
  const [scopeId, setScopeId] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [ownerId, setOwnerId] = useState<string>();
  const [legacyInventory, setLegacyInventory] = useState({ events: 0, preferences: 0, experiences: 0, learningExclusions: 0 });
  const [legacySelection, setLegacySelection] = useState({ events: true, preferences: false, experiences: false });
  const [manualDomain, setManualDomain] = useState("");
  const [manualKey, setManualKey] = useState("");
  const [manualValue, setManualValue] = useState("");
  const [manualScope, setManualScope] = useState<"GLOBAL" | "DOMAIN">("DOMAIN");
  async function refresh() {
    const currentOwnerId = await getExperienceOwnerId();
    const [nextEvents, allPreferences, nextExclusions] = await Promise.all([experienceService.list(undefined, currentOwnerId), preferenceService.exportAll(currentOwnerId), learningExclusionService.list(currentOwnerId)]);
    const legacy = await legacyExperienceMigrationService.preview();
    const nextPreferences = allPreferences.filter((preference) => preference.status === "CONFIRMED" || preference.status === "INFERRED");
    setEvents(nextEvents.sort((a, b) => b.timestamp.localeCompare(a.timestamp)));
    setPreferences(nextPreferences);
    setExclusions(nextExclusions);
    setLegacyInventory(legacy);
    setOwnerId(currentOwnerId);
    setCandidates(derivePreferenceCandidates(nextEvents, currentOwnerId).filter((candidate) => !allPreferences.some((preference) => preference.subject === candidate.subject && preference.domain === candidate.domain && preference.key === candidate.key && JSON.stringify(preference.value) === JSON.stringify(candidate.value))));
  }
  useEffect(() => { void refresh(); }, []);
  async function confirm(id: string) { setBusy(true); try { await preferenceService.setStatus(id, "CONFIRMED", undefined, ownerId); await refresh(); } finally { setBusy(false); } }
  async function forget(id: string) { setBusy(true); try { await experienceService.forget(id, ownerId); await refresh(); } finally { setBusy(false); } }
  async function saveExclusion() { setBusy(true); try { await learningExclusionService.disable(scope, scope === "GLOBAL" ? undefined : scopeId, reason, ownerId); setReason(""); await refresh(); } finally { setBusy(false); } }
  async function removeExclusion(item: LearningExclusion) { setBusy(true); try { await learningExclusionService.enable(item.scope, item.scopeId, ownerId); await refresh(); } finally { setBusy(false); } }
  async function saveCandidate(candidate: PreferenceCandidate) { setBusy(true); try { await preferenceService.propose(candidate, ownerId); await refresh(); } finally { setBusy(false); } }
  async function saveManualPreference() {
    setBusy(true);
    try {
      await preferenceService.declare({ domain: manualDomain, key: manualKey, value: manualValue, scope: manualScope }, ownerId);
      setManualKey(""); setManualValue(""); await refresh();
    } finally { setBusy(false); }
  }
  async function exportData() {
    const currentOwnerId = await getExperienceOwnerId();
    const [allEvents, allPreferences, allExperiences, allExclusions] = await Promise.all([experienceService.list(undefined, currentOwnerId), preferenceService.exportAll(currentOwnerId), experienceRepository.getAll((experience) => experience.ownerId === currentOwnerId), learningExclusionService.list(currentOwnerId)]);
    const file = new Blob([JSON.stringify({ schemaVersion: 1, exportedAt: new Date().toISOString(), storage: "local-device", events: allEvents, preferences: allPreferences, experiences: allExperiences, learningExclusions: allExclusions }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(file); const link = document.createElement("a"); link.href = url; link.download = `varynth-experience-${new Date().toISOString().slice(0, 10)}.json`; link.click(); URL.revokeObjectURL(url);
  }
  async function migrateLegacy() {
    if (!ownerId) return;
    const counts = await legacyExperienceMigrationService.migrate(legacySelection, true, ownerId);
    await refresh();
    window.alert(`Recuperação concluída para esta conta: ${counts.events} eventos, ${counts.preferences} preferências e ${counts.experiences} experiências. Exclusões antigas continuam bloqueadas e sem dono.`);
  }
  return <PageLayout title="Experience Layer" subtitle="Evidência, preferências e adaptação controlável">
    <main className="p-6 space-y-6 animate-fade-in">
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[['Eventos', events.length], ['Preferências', preferences.length], ['Confirmadas', preferences.filter((p) => p.status === "CONFIRMED").length], ['Inferidas', preferences.filter((p) => p.status === "INFERRED").length]].map(([label, value]) => <div key={String(label)} className="rounded-xl border border-white/10 bg-white/[0.03] p-4"><p className="text-[10px] uppercase tracking-widest text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold text-white">{value}</p></div>)}
      </section>
      <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-slate-500">Os dados permanecem neste dispositivo; isso não altera pesos de modelos.</p><button type="button" onClick={() => void exportData()} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-200 hover:bg-white/5">Exportar dados da Experience Layer</button></div>
      {(legacyInventory.events + legacyInventory.preferences + legacyInventory.experiences + legacyInventory.learningExclusions) > 0 && <section className="rounded-xl border border-amber-300/25 bg-amber-500/[0.04] p-5"><h2 className="text-sm font-semibold text-white">Revisar dados anteriores à separação por conta</h2><p className="mt-1 text-xs text-slate-400">Estes registros continuam locais e invisíveis para o aprendizado. Escolha categorias para reassociar à conta atual. Preferências e experiências só podem ser recuperadas quando todas as evidências apontarem para registros recuperados ou já pertencentes a esta conta. Exclusões antigas permanecem bloqueios globais até revisão própria.</p><div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-200">{([['events', 'Eventos', legacyInventory.events], ['preferences', 'Preferências', legacyInventory.preferences], ['experiences', 'Experiências', legacyInventory.experiences]] as const).map(([key, label, count]) => <label key={key} className="flex items-center gap-2"><input type="checkbox" checked={legacySelection[key]} disabled={count === 0 || busy} onChange={(event) => setLegacySelection((current) => ({ ...current, [key]: event.target.checked }))} />{label}: {count}</label>)}<span>Exclusões não reassociáveis: {legacyInventory.learningExclusions}</span></div><button type="button" disabled={busy || !ownerId || !Object.values(legacySelection).some(Boolean)} onClick={() => { if (window.confirm("Confirma reassociar os registros selecionados à conta autenticada neste dispositivo? Essa ação altera o proprietário local dos registros.")) void migrateLegacy(); }} className="mt-4 rounded-lg border border-amber-300/30 px-3 py-2 text-xs font-semibold text-amber-100 disabled:opacity-40">Reassociar itens selecionados a esta conta</button></section>}
      <section className="rounded-xl border border-amber-400/20 bg-amber-500/[0.04] p-5">
        <h2 className="text-sm font-semibold text-white">Não aprender neste escopo</h2>
        <p className="mt-1 text-xs text-slate-400">Os eventos continuam registrados para rastreabilidade, mas não podem alimentar sinais, padrões ou preferências enquanto a exclusão estiver ativa.</p>
        {exclusions.some((item) => !item.ownerId) && <p role="status" className="mt-3 rounded-lg border border-amber-300/20 bg-amber-400/[0.04] px-3 py-2 text-xs text-amber-100">Há uma exclusão anterior à separação por conta. Ela continua bloqueando aprendizado por segurança e aguarda uma migração revisada; não foi atribuída a esta conta.</p>}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <select aria-label="Escopo de exclusão" value={scope} onChange={(event) => setScope(event.target.value as LearningExclusionScope)} className="min-h-10 rounded-lg border border-white/10 bg-slate-950 px-3 text-xs text-white">
            {(["GLOBAL", "DOMAIN", "AGENT", "MODULE", "PROJECT", "ARTIFACT", "SESSION"] as const).map((item) => <option key={item} value={item}>{item === "GLOBAL" ? "Toda a Experience Layer" : item}</option>)}
          </select>
          {scope !== "GLOBAL" && <input aria-label="Identificador do escopo" value={scopeId} onChange={(event) => setScopeId(event.target.value)} placeholder="ID do escopo" className="min-h-10 rounded-lg border border-white/10 bg-slate-950 px-3 text-xs text-white" />}
          <input aria-label="Motivo da exclusão" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Motivo (opcional)" className="min-h-10 flex-1 rounded-lg border border-white/10 bg-slate-950 px-3 text-xs text-white" />
          <button disabled={busy || !ownerId || (scope !== "GLOBAL" && !scopeId.trim())} onClick={() => void saveExclusion()} className="min-h-10 rounded-lg border border-amber-300/30 px-3 text-xs font-semibold text-amber-200 disabled:opacity-40">Desativar aprendizado</button>
        </div>
        <div className="mt-3 space-y-2">{exclusions.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-amber-300/10 px-3 py-2"><span className="text-xs text-amber-100">{item.scope}{item.scopeId ? ` · ${item.scopeId}` : ""}{item.reason ? ` · ${item.reason}` : ""}</span>{item.ownerId === ownerId ? <button disabled={busy} onClick={() => void removeExclusion(item)} className="text-[10px] text-slate-300 underline">Reativar</button> : <span className="text-[10px] text-amber-200/70">legada · bloqueio mantido</span>}</div>)}</div>
      </section>
      <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5"><h2 className="text-sm font-semibold text-white">Preferências com proveniência</h2><p className="mt-1 text-xs text-slate-500">Inferência não é fato. Declare uma preferência diretamente ou revise hipóteses inferidas; tudo permanece corrigível e reversível.</p><div className="mt-4 rounded-lg border border-emerald-400/15 bg-emerald-500/[0.03] p-3"><p className="text-xs font-medium text-emerald-100">Adicionar preferência declarada</p><p className="mt-1 text-[10px] text-slate-400">A declaração explícita prevalece sobre inferências anteriores do mesmo escopo e recebe um evento verificável de proveniência.</p><div className="mt-3 grid gap-2 sm:grid-cols-2"><input aria-label="Domínio da preferência" value={manualDomain} onChange={(event) => setManualDomain(event.target.value)} placeholder="Domínio (ex.: music)" className="min-h-10 rounded-lg border border-white/10 bg-slate-950 px-3 text-xs text-white" /><input aria-label="Chave da preferência" value={manualKey} onChange={(event) => setManualKey(event.target.value)} placeholder="Chave (ex.: mixDensity)" className="min-h-10 rounded-lg border border-white/10 bg-slate-950 px-3 text-xs text-white" /><input aria-label="Valor da preferência" value={manualValue} onChange={(event) => setManualValue(event.target.value)} placeholder="Valor desejado" className="min-h-10 rounded-lg border border-white/10 bg-slate-950 px-3 text-xs text-white" /><select aria-label="Escopo da preferência" value={manualScope} onChange={(event) => setManualScope(event.target.value as "GLOBAL" | "DOMAIN")} className="min-h-10 rounded-lg border border-white/10 bg-slate-950 px-3 text-xs text-white"><option value="DOMAIN">Somente este domínio</option><option value="GLOBAL">Global</option></select></div><button type="button" disabled={busy || !ownerId || !manualDomain.trim() || !manualKey.trim() || !manualValue.trim()} onClick={() => void saveManualPreference()} className="mt-3 rounded-lg border border-emerald-300/30 px-3 py-2 text-xs font-semibold text-emerald-100 disabled:opacity-40">Salvar preferência confirmada</button></div><div className="mt-4 space-y-2">{preferences.length === 0 ? <p className="text-xs text-slate-500">Nenhuma preferência recuperável ainda.</p> : preferences.map((preference) => <article key={preference.id} className="rounded-lg border border-white/10 p-3"><div className="flex items-start justify-between gap-3"><div><p className="text-sm text-slate-100">{preference.key}: {String(preference.value)}</p><p className="mt-1 text-[10px] text-slate-500">{preference.domain} · {preference.scope}{preference.scopeId ? `:${preference.scopeId}` : ""} · confiança {Math.round(preference.confidence * 100)}% · {preference.source === "MANUAL" ? "declarada" : "inferida"}</p></div><div className="flex gap-2">{preference.status === "INFERRED" && <button disabled={busy || !ownerId} onClick={() => void confirm(preference.id)} className="rounded border border-emerald-500/30 px-2 py-1 text-[10px] text-emerald-300">Confirmar</button>}<button disabled={busy || !ownerId} onClick={() => void preferenceService.setStatus(preference.id, "REJECTED", undefined, ownerId).then(refresh)} className="rounded border border-rose-500/30 px-2 py-1 text-[10px] text-rose-300">Rejeitar</button></div></div><p className="mt-2 text-[10px] text-slate-500">Evidências: {preference.evidence.map((e) => e.eventId).join(", ") || "nenhuma"}</p></article>)}</div></section>
      <section className="rounded-xl border border-cyan-400/20 bg-cyan-500/[0.03] p-5"><h2 className="text-sm font-semibold text-white">Hipóteses aguardando revisão</h2><p className="mt-1 text-xs text-slate-400">Só aparecem após três sinais independentes em pelo menos dois artefatos. Nenhuma hipótese é aplicada automaticamente. A análise considera somente registros associados à conta atual.</p><div className="mt-4 space-y-2">{candidates.length === 0 ? <p className="text-xs text-slate-500">Ainda não há evidência repetida suficiente para sugerir uma preferência.</p> : candidates.map((candidate) => <article key={`${candidate.domain}:${candidate.key}:${JSON.stringify(candidate.value)}`} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-cyan-300/10 p-3"><div><p className="text-sm text-slate-100">{candidate.key}: {String(candidate.value)}</p><p className="mt-1 text-[10px] text-slate-500">{candidate.domain} · {candidate.evidence.length} sinais · confiança calculada {Math.round(confidenceFromEvidence(candidate.evidence) * 100)}%</p><p className="mt-1 text-[10px] text-slate-500">Proveniência: {candidate.evidence.map((item) => item.eventId).join(", ")}</p></div><button disabled={busy || !ownerId} onClick={() => void saveCandidate(candidate)} className="rounded border border-cyan-300/30 px-3 py-2 text-[10px] font-semibold text-cyan-200 disabled:opacity-50">Salvar hipótese para revisão</button></article>)}</div></section>
      <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5"><div className="flex items-center justify-between"><div><h2 className="text-sm font-semibold text-white">Eventos observados</h2><p className="mt-1 text-xs text-slate-500">Registro local, escopado e reversível.</p></div><button disabled={busy} onClick={() => events[0] && void forget(events[0].id)} className="rounded border border-white/10 px-2 py-1 text-[10px] text-slate-400">Esquecer último</button></div><div className="mt-4 space-y-2">{events.slice(0, 20).map((event) => <div key={event.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 px-3 py-2"><span className="text-xs text-slate-200">{event.actionType} · {event.source} · {event.learningEligible ? "elegível" : "não aprendível"}</span><span className="flex items-center gap-3 text-[10px] text-slate-500">{event.privacyScope} · {new Date(event.timestamp).toLocaleString("pt-BR")}<button disabled={busy} onClick={() => void forget(event.id)} className="text-rose-300 underline">Esquecer</button></span></div>)}</div></section>
    </main>
  </PageLayout>;
}
