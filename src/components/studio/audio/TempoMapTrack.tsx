"use client";

import { useEffect, useMemo, useState } from "react";
import { TempoPoint } from "@/lib/studio/audio/music-domain";

type TempoMapTrackProps = { tempoMap: TempoPoint[]; onChange: (tempoMap: TempoPoint[]) => void };
type DraftPoint = { beat: string; bpm: string };

const DEFAULT_MAP: TempoPoint[] = [{ beat: 0, bpm: 120 }];
const toDrafts = (tempoMap: TempoPoint[]): DraftPoint[] => (tempoMap.length ? [...tempoMap] : DEFAULT_MAP)
  .slice().sort((a, b) => a.beat - b.beat).map((point) => ({ beat: String(point.beat), bpm: String(point.bpm) }));

export function TempoMapTrack({ tempoMap, onChange }: TempoMapTrackProps) {
  const points = useMemo(() => tempoMap.length ? [...tempoMap].sort((a, b) => a.beat - b.beat) : DEFAULT_MAP, [tempoMap]);
  const [draft, setDraft] = useState<DraftPoint[]>(() => toDrafts(points));
  const [newBeat, setNewBeat] = useState("");
  const [newBpm, setNewBpm] = useState("120");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const serializedPoints = JSON.stringify(points);
  const dirty = serializedPoints !== JSON.stringify(draft.map((point) => ({ beat: Number(point.beat), bpm: Number(point.bpm) })));

  useEffect(() => {
    setDraft(toDrafts(points));
    setError("");
    setSaved(false);
  }, [points]);

  const updatePoint = (index: number, updates: Partial<DraftPoint>) => {
    setDraft((current) => current.map((point, pointIndex) => pointIndex === index ? { ...point, ...updates } : point));
    setError("");
    setSaved(false);
  };

  const addDraftPoint = () => {
    const beat = Number(newBeat);
    const bpm = Number(newBpm);
    if (!Number.isFinite(beat) || beat <= 0 || !Number.isFinite(bpm) || bpm < 20 || bpm > 300) {
      setError("Informe um beat maior que zero e um BPM entre 20 e 300.");
      setSaved(false);
      return;
    }
    if (draft.some((point) => Number(point.beat) === beat)) {
      setError("Já existe uma mudança nesse beat. Edite o ponto existente para evitar duplicidade.");
      return;
    }
    setDraft((current) => [...current, { beat: String(beat), bpm: String(bpm) }].sort((a, b) => Number(a.beat) - Number(b.beat)));
    setNewBeat("");
    setError("");
    setSaved(false);
  };

  const apply = () => {
    const parsed = draft.map((point) => ({ beat: Number(point.beat), bpm: Number(point.bpm) })).sort((a, b) => a.beat - b.beat);
    const hasBasePoint = parsed.some((point) => point.beat === 0);
    const invalid = parsed.some((point, index) => !Number.isFinite(point.beat) || point.beat < 0 || !Number.isFinite(point.bpm) || point.bpm < 20 || point.bpm > 300 || (index > 0 && point.beat === parsed[index - 1].beat));
    if (!hasBasePoint || invalid) {
      setError("O mapa precisa manter um ponto no beat 0, beats únicos e BPM entre 20 e 300.");
      setSaved(false);
      return;
    }
    onChange(parsed);
    setError("");
    setSaved(true);
  };

  const maxBeat = Math.max(16, points.at(-1)?.beat || 0, ...draft.map((point) => Number(point.beat) || 0));

  return <section aria-label="Tempo Track" data-tempo-track className="border-b border-[var(--vly-border-default)] bg-[var(--vly-surface)] px-3 py-2 text-[var(--vly-text-secondary)]">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div><h3 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--vly-accent)]">Tempo Track</h3><p className="text-[9px] text-[var(--vly-text-muted)]">Mudanças por beat · {points.length} ponto(s) salvo(s)</p></div>
      <div aria-label="Visualização dos pontos de tempo" className="relative h-7 min-w-48 flex-1 overflow-hidden rounded border border-[var(--vly-border-default)] bg-[var(--vly-surface-raised)]">
        <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-[var(--vly-border-strong)]" />
        {draft.map((point, index) => {
          const beat = Number(point.beat);
          const bpm = Number(point.bpm);
          if (!Number.isFinite(beat) || beat < 0 || !Number.isFinite(bpm)) return null;
          return <span key={`${index}-${point.beat}`} title={`Beat ${beat}: ${bpm} BPM`} aria-label={`Ponto visual beat ${beat}, ${bpm} BPM`} className="absolute top-0 h-full border-l-2 border-[var(--vly-accent)]" style={{ left: `${Math.min(99, beat / maxBeat * 100)}%` }} />;
        })}
      </div>
    </div>
    <div role="list" aria-label="Pontos do mapa de tempo" className="mt-2 flex flex-wrap gap-2">
      {draft.map((point, index) => <div role="listitem" key={index} aria-label={`Ponto de tempo ${index + 1}`} className="flex items-end gap-1 rounded border border-[var(--vly-border-default)] bg-[var(--vly-surface-raised)] px-2 py-1">
        <label className="text-[9px] text-[var(--vly-text-muted)]">Beat<input aria-label={`Beat do ponto ${index + 1}`} type="number" min={index === 0 ? 0 : 0.25} step="0.25" value={point.beat} disabled={index === 0} onChange={(event) => updatePoint(index, { beat: event.target.value })} className="vly-field ml-1 w-16 px-1 py-0.5 text-[10px] disabled:opacity-60" /></label>
        <label className="text-[9px] text-[var(--vly-text-muted)]">BPM<input aria-label={`BPM do ponto ${index + 1}`} type="number" min="20" max="300" step="1" value={point.bpm} onChange={(event) => updatePoint(index, { bpm: event.target.value })} className="vly-field ml-1 w-16 px-1 py-0.5 text-[10px]" /></label>
        <button type="button" aria-label={`Remover ponto de tempo ${index + 1}`} disabled={Number(point.beat) === 0} onClick={() => { setDraft((current) => current.filter((_, pointIndex) => pointIndex !== index)); setError(""); setSaved(false); }} className="vly-interactive rounded px-1.5 py-0.5 text-[10px] text-[var(--vly-danger)] disabled:cursor-not-allowed disabled:opacity-30">Remover</button>
      </div>)}
    </div>
    <div className="mt-2 flex flex-wrap items-end gap-2">
      <label className="text-[9px] text-[var(--vly-text-muted)]">Novo ponto · beat<input aria-label="Beat do novo ponto de tempo" type="number" min="0.25" step="0.25" value={newBeat} onChange={(event) => setNewBeat(event.target.value)} className="vly-field ml-1 w-16 px-1 py-0.5 text-[10px]" /></label>
      <label className="text-[9px] text-[var(--vly-text-muted)]">BPM<input aria-label="BPM do novo ponto de tempo" type="number" min="20" max="300" step="1" value={newBpm} onChange={(event) => setNewBpm(event.target.value)} className="vly-field ml-1 w-16 px-1 py-0.5 text-[10px]" /></label>
      <button type="button" onClick={addDraftPoint} className="vly-interactive rounded border border-[var(--vly-border-accent)] bg-[color-mix(in_srgb,var(--vly-accent)_14%,transparent)] px-2 py-1 text-[10px] text-[var(--vly-accent)]">Adicionar mudança</button>
      <button type="button" aria-label="Aplicar mapa de tempo" onClick={apply} disabled={!dirty} className="vly-interactive rounded bg-[var(--vly-accent)] px-2 py-1 text-[10px] font-semibold text-[var(--vly-accent-contrast)] disabled:opacity-40">Aplicar mapa</button>
      <span role={error ? "alert" : "status"} className={error ? "text-[10px] text-[var(--vly-danger)]" : "text-[10px] text-[var(--vly-success)]"}>{error || (saved ? "Mapa aplicado ao projeto; alteração registrada no histórico." : "")}</span>
    </div>
  </section>;
}
