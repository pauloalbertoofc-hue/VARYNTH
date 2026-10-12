"use client";

import { useState } from "react";
import { simulateLearningPipeline, type LearningSandboxObservation, type LearningSandboxResult } from "@/lib/experience/learning-sandbox";

type DraftObservation = Pick<LearningSandboxObservation, "artifactId" | "value" | "actor" | "correlationId" | "generatedAutomatically">;

export function ExperienceLearningSandbox() {
  const [domain, setDomain] = useState("audio");
  const [key, setKey] = useState("tempoDirection");
  const [observations, setObservations] = useState<DraftObservation[]>([
    { artifactId: "track-a", value: "increase", actor: "USER", generatedAutomatically: false },
    { artifactId: "track-b", value: "increase", actor: "USER", generatedAutomatically: false },
    { artifactId: "track-a", value: "increase", actor: "USER", generatedAutomatically: false },
  ]);
  const [result, setResult] = useState<LearningSandboxResult>();
  const [error, setError] = useState("");

  function updateObservation(index: number, update: Partial<DraftObservation>) {
    setObservations((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...update } : item));
    setResult(undefined);
  }

  function simulate() {
    setError("");
    try {
      setResult(simulateLearningPipeline(observations.map((observation) => ({ ...observation, domain, key }))));
    } catch (cause) {
      setResult(undefined);
      setError(cause instanceof Error ? cause.message : "Não foi possível simular estas observações.");
    }
  }

  return (
    <section className="rounded-xl border border-fuchsia-300/20 bg-fuchsia-500/[0.035] p-5" aria-labelledby="experience-sandbox-title">
      <h2 id="experience-sandbox-title" className="text-sm font-semibold text-white">Laboratório de hipóteses — modo volátil</h2>
      <p className="mt-1 text-xs text-slate-400">Teste como o pipeline real transforma sinais repetidos em candidatos. Estes dados são sintéticos, ficam somente nesta tela e não criam eventos, preferências ou experiências.</p>
      <div className="mt-3 rounded-lg border border-emerald-300/15 bg-emerald-500/[0.035] px-3 py-2 text-[10px] text-emerald-100">Isolamento confirmado pelo simulador: 0 gravações persistentes. Fechar ou atualizar a página descarta a simulação.</div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <label className="text-[10px] text-slate-400">Domínio sintético<input aria-label="Domínio sintético" value={domain} onChange={(event) => { setDomain(event.target.value); setResult(undefined); }} maxLength={80} className="mt-1 min-h-10 w-full rounded-lg border border-white/10 bg-slate-950 px-3 text-xs text-white" /></label>
        <label className="text-[10px] text-slate-400">Chave de preferência sintética<input aria-label="Chave de preferência sintética" value={key} onChange={(event) => { setKey(event.target.value); setResult(undefined); }} maxLength={80} className="mt-1 min-h-10 w-full rounded-lg border border-white/10 bg-slate-950 px-3 text-xs text-white" /></label>
      </div>
      <div className="mt-3 space-y-2">
        {observations.map((observation, index) => <div key={index} className="rounded-lg border border-white/5 p-2">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
          <label className="sr-only" htmlFor={`sandbox-artifact-${index}`}>Artefato sintético {index + 1}</label>
          <input id={`sandbox-artifact-${index}`} aria-label={`Artefato sintético ${index + 1}`} value={observation.artifactId} onChange={(event) => updateObservation(index, { artifactId: event.target.value })} maxLength={80} placeholder="Artefato (ex.: track-a)" className="min-h-10 min-w-0 rounded-lg border border-white/10 bg-slate-950 px-3 text-xs text-white" />
          <label className="sr-only" htmlFor={`sandbox-value-${index}`}>Valor sintético {index + 1}</label>
          <input id={`sandbox-value-${index}`} aria-label={`Valor sintético ${index + 1}`} value={String(observation.value)} onChange={(event) => updateObservation(index, { value: event.target.value })} maxLength={120} placeholder="Escolha (ex.: increase)" className="min-h-10 min-w-0 rounded-lg border border-white/10 bg-slate-950 px-3 text-xs text-white" />
          <label className="sr-only" htmlFor={`sandbox-correlation-${index}`}>Correlação sintética {index + 1}</label>
          <input id={`sandbox-correlation-${index}`} aria-label={`Correlação sintética ${index + 1}`} value={observation.correlationId ?? ""} onChange={(event) => updateObservation(index, { correlationId: event.target.value || undefined })} maxLength={80} placeholder="Correlação (opcional)" className="min-h-10 min-w-0 rounded-lg border border-white/10 bg-slate-950 px-3 text-xs text-white col-span-2 md:col-span-1" />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <label className="text-[10px] text-slate-400">Ator
              <select aria-label={`Ator sintético ${index + 1}`} value={observation.actor} onChange={(event) => updateObservation(index, { actor: event.target.value as LearningSandboxObservation["actor"] })} className="ml-2 min-h-8 rounded border border-white/10 bg-slate-950 px-2 text-[10px] text-white"><option value="USER">Usuário</option><option value="AGENT">Agente</option><option value="SYSTEM">Sistema</option></select>
            </label>
            <label className="flex items-center gap-2 text-[10px] text-slate-400"><input type="checkbox" checked={observation.generatedAutomatically} onChange={(event) => updateObservation(index, { generatedAutomatically: event.target.checked })} />Gerado automaticamente</label>
            <button type="button" aria-label={`Remover observação ${index + 1}`} disabled={observations.length <= 1} onClick={() => { setObservations((current) => current.filter((_, itemIndex) => itemIndex !== index)); setResult(undefined); }} className="ml-auto rounded-lg border border-white/10 px-3 py-1 text-xs text-slate-300 disabled:opacity-30">Remover</button>
          </div>
        </div>)}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={observations.length >= 20} onClick={() => { setObservations((current) => [...current, { artifactId: `track-${String.fromCharCode(97 + current.length)}`, value: "increase", actor: "USER", generatedAutomatically: false }]); setResult(undefined); }} className="rounded-lg border border-white/10 px-3 py-2 text-[10px] text-slate-200 disabled:opacity-40">Adicionar observação</button>
        <button type="button" onClick={simulate} className="rounded-lg border border-fuchsia-300/30 px-3 py-2 text-[10px] font-semibold text-fuchsia-100">Executar simulação</button>
      </div>
      {error && <p className="mt-3 text-xs text-rose-300" role="alert">{error}</p>}
      {result && <div className="mt-4 space-y-3" aria-live="polite">
        <p className="text-[10px] text-slate-400">{result.events.length} eventos sintéticos → {result.signals.filter((signal) => signal.eligible).length} sinais elegíveis → {result.candidates.length} candidatos. Nenhum candidato é salvo ou aplicado.</p>
        <ol className="space-y-1">{result.events.map((event, index) => { const signal = result.signals[index]; return <li key={event.id} className="rounded border border-white/5 px-3 py-2 text-[10px] text-slate-300"><span className="font-mono text-slate-400">{event.id}</span> · {event.actor} / {event.actionType} · {event.artifactId} · {String((event.metadata.preferenceSignal as { value: unknown }).value)} · {signal?.eligible ? `${signal.kind} (${signal.strength})` : `${signal?.kind ?? "sem sinal"} — inelegível`}</li>; })}</ol>
        {result.candidates.length ? result.candidates.map((candidate) => <article key={`${candidate.domain}:${candidate.key}`} className="rounded-lg border border-fuchsia-300/15 p-3 text-xs text-fuchsia-100"><p>Candidato sintético: {candidate.domain}.{candidate.key} = {String(candidate.value)}</p><p className="mt-1 text-[10px] text-slate-400">Evidências independentes: {candidate.evidence.map((evidence) => evidence.eventId).join(", ")}. Isto é uma hipótese de teste, não uma preferência.</p></article>) : <p className="rounded-lg border border-amber-300/10 px-3 py-2 text-[10px] text-amber-100">Nenhum candidato: o pipeline real exige pelo menos três sinais independentes, dois artefatos e valores consistentes.</p>}
      </div>}
    </section>
  );
}
