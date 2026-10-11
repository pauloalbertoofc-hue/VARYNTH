"use client";

import { useEffect, useMemo, useState } from "react";
import { Accidental, ArrangementSectionKind, ChordQuality, MusicProjectState, MusicSyncPointKind, MusicalChord, ScaleName, chordToNotes, upsertArrangementSection, upsertMusicKeyPoint, upsertMusicSyncPoint } from "@/lib/studio/audio/music-domain";

const SECTION_KINDS: Array<{ value: ArrangementSectionKind; label: string }> = [
  { value: "intro", label: "Intro" }, { value: "verse", label: "Verso" }, { value: "pre-chorus", label: "Pré-refrão" }, { value: "chorus", label: "Refrão" }, { value: "bridge", label: "Ponte" }, { value: "break", label: "Break" }, { value: "build", label: "Build" }, { value: "drop", label: "Drop" }, { value: "outro", label: "Outro" }, { value: "custom", label: "Personalizada" },
];
const ROOTS: MusicProjectState["key"]["tonic"][] = ["C", "D", "E", "F", "G", "A", "B"];
const QUALITIES: Array<{ value: ChordQuality; label: string }> = [{ value: "major", label: "maior" }, { value: "minor", label: "menor" }, { value: "diminished", label: "dim" }, { value: "augmented", label: "aug" }, { value: "sus2", label: "sus2" }, { value: "sus4", label: "sus4" }, { value: "7", label: "7" }, { value: "maj7", label: "maj7" }, { value: "min7", label: "min7" }];
const MARKER_KINDS: Array<{ value: MusicSyncPointKind; label: string }> = [{ value: "beat", label: "Beat" }, { value: "bar", label: "Compasso" }, { value: "section", label: "Seção" }, { value: "transition", label: "Transição" }];
const inputClass = "vly-field px-2 py-1 text-[10px]";
const EMPTY_SECTIONS: NonNullable<MusicProjectState["arrangementSections"]> = [];
const EMPTY_SYNC_POINTS: NonNullable<MusicProjectState["syncPoints"]> = [];
const EMPTY_CHORDS: MusicProjectState["chords"] = [];
const SCALES: ScaleName[] = ["major", "minor", "dorian", "phrygian", "lydian", "mixolydian", "aeolian", "locrian", "pentatonic", "chromatic"];

export function MusicArrangementTrack({ music, onChange }: { music: MusicProjectState; onChange: (music: MusicProjectState) => void }) {
  const sections = music.arrangementSections ?? EMPTY_SECTIONS;
  const syncPoints = music.syncPoints ?? EMPTY_SYNC_POINTS;
  const chords = music.chords ?? EMPTY_CHORDS;
  const maxBeat = Math.max(16, ...sections.map((item) => item.endBeat), ...chords.map((item) => item.startBeat + item.durationBeats), ...syncPoints.map((item) => item.beat + 1));
  const [sectionKind, setSectionKind] = useState<ArrangementSectionKind>("verse");
  const [sectionName, setSectionName] = useState("Verso");
  const [sectionStart, setSectionStart] = useState("0");
  const [sectionEnd, setSectionEnd] = useState("8");
  const [root, setRoot] = useState<MusicProjectState["key"]["tonic"]>(music.key.tonic);
  const [quality, setQuality] = useState<ChordQuality>("major");
  const [chordBeat, setChordBeat] = useState("0");
  const [chordDuration, setChordDuration] = useState("4");
  const [markerKind, setMarkerKind] = useState<MusicSyncPointKind>("transition");
  const [markerBeat, setMarkerBeat] = useState("0");
  const [markerLabel, setMarkerLabel] = useState("Transição");
  const [error, setError] = useState("");
  const [keyBeat, setKeyBeat] = useState("0");
  const [keyTonic, setKeyTonic] = useState(music.key.tonic);
  const [keyAccidental, setKeyAccidental] = useState<Accidental>(music.key.accidental);
  const [keyScale, setKeyScale] = useState<ScaleName>(music.key.scale);
  useEffect(() => {
    if (!Array.isArray(music.arrangementSections) || !Array.isArray(music.syncPoints)) onChange({ ...music, arrangementSections: music.arrangementSections || [], syncPoints: music.syncPoints || [] });
  }, [music, onChange]);
  const orderedChords = useMemo(() => [...chords].sort((a, b) => a.startBeat - b.startBeat), [chords]);
  const id = (prefix: string) => `${prefix}-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
  const commitSection = () => {
    const kind = sectionKind;
    const name = (kind === "custom" ? sectionName : SECTION_KINDS.find((item) => item.value === kind)?.label || sectionName).trim();
    const section = { id: id("section"), name, kind, startBeat: Number(sectionStart), endBeat: Number(sectionEnd) };
    try {
      const nextSections = upsertArrangementSection(sections, section);
      const marker = { id: `section-marker-${section.id}`, kind: "section" as const, beat: section.startBeat, label: section.name, sectionId: section.id };
      const nextSyncPoints = upsertMusicSyncPoint(syncPoints, marker, music.timeSignature);
      onChange({ ...music, arrangementSections: nextSections, syncPoints: nextSyncPoints });
      setError("");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível salvar a seção."); }
  };
  const removeSection = (sectionId: string) => onChange({ ...music, arrangementSections: sections.filter((item) => item.id !== sectionId), syncPoints: syncPoints.filter((point) => point.sectionId !== sectionId) });
  const commitChord = () => {
    const startBeat = Number(chordBeat), durationBeats = Number(chordDuration);
    if (!Number.isFinite(startBeat) || startBeat < 0 || !Number.isFinite(durationBeats) || durationBeats <= 0) { setError("Acorde exige início não negativo e duração positiva."); return; }
    const chord: MusicalChord = { id: id("chord"), root, accidental: "natural", octave: 4, quality, startBeat, durationBeats };
    onChange({ ...music, chords: [...chords, chord], notes: [...music.notes, ...chordToNotes(chord)] });
    setChordBeat(String(startBeat + durationBeats)); setError("");
  };
  const removeChord = (chord: MusicalChord) => onChange({ ...music, chords: chords.filter((item) => item.id !== chord.id), notes: music.notes.filter((note) => note.chordId !== chord.id) });
  const commitMarker = () => {
    try {
      const beat = Number(markerBeat);
      const point = { id: id("marker"), kind: markerKind, beat, label: markerLabel.trim() || MARKER_KINDS.find((item) => item.value === markerKind)?.label || markerKind };
      onChange({ ...music, syncPoints: upsertMusicSyncPoint(syncPoints, point, music.timeSignature) }); setError("");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Marcador inválido."); }
  };
  const commitKeyPoint = () => {
    try {
      const keyMap = upsertMusicKeyPoint(music.keyMap || [{ beat: 0, ...music.key }], { beat: Number(keyBeat), tonic: keyTonic, accidental: keyAccidental, scale: keyScale }, music.timeSignature);
      onChange({ ...music, keyMap, ...(Number(keyBeat) === 0 ? { key: { tonic: keyTonic, accidental: keyAccidental, scale: keyScale } } : {}) }); setError("");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Mudança tonal inválida."); }
  };
  const removeKeyPoint = (beat: number) => {
    if (beat === 0) return;
    onChange({ ...music, keyMap: (music.keyMap || []).filter((point) => point.beat !== beat) });
  };
  const removeMarker = (markerId: string) => onChange({ ...music, syncPoints: syncPoints.filter((item) => item.id !== markerId) });
  const percent = (beat: number) => `${Math.min(99, Math.max(0, beat / maxBeat * 100))}%`;

  return <section aria-label="Faixas de arranjo musical" data-music-arrangement-track className="border-b border-[var(--vly-border-default)] bg-[var(--vly-surface)] px-3 py-2 text-[var(--vly-text-secondary)]">
    <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-[10px] font-semibold uppercase tracking-wider text-violet-200">Arranjo · Acordes · Sync</h3><p className="text-[9px] text-slate-500">Estado compartilhado do projeto · seções {sections.length} · acordes {chords.length} · marcadores {syncPoints.length}</p></div><span className="text-[9px] text-slate-500">{music.timeSignature.numerator}/{music.timeSignature.denominator} · escala {music.key.tonic} {music.key.scale}</span></div>
    <div aria-label="Visão geral das faixas musicais" className="mt-2 space-y-1 rounded border border-[var(--vly-border-default)] bg-[var(--vly-surface-raised)] p-2">
      {[{ label: "Seções", items: sections.map((item) => ({ id: item.id, beat: item.startBeat, text: `${item.name} · ${item.endBeat - item.startBeat} beats`, tint: "border-violet-400 text-violet-200" })) }, { label: "Acordes", items: orderedChords.map((item) => ({ id: item.id, beat: item.startBeat, text: `${item.root}${item.accidental === "sharp" ? "#" : item.accidental === "flat" ? "b" : ""} ${item.quality}`, tint: "border-emerald-400 text-emerald-200" })) }, { label: "Sync", items: syncPoints.map((item) => ({ id: item.id, beat: item.beat, text: `${item.kind}: ${item.label}`, tint: "border-amber-400 text-amber-200" })) }].map((lane) => <div key={lane.label} className="flex min-h-7 items-center gap-2"><strong className="w-12 shrink-0 text-[9px] text-slate-500">{lane.label}</strong><div className="relative h-7 min-w-0 flex-1 rounded bg-[#090b14]">{lane.items.map((item) => <span key={item.id} title={`Beat ${item.beat} · ${item.text}`} className={`absolute top-1 h-5 max-w-[38%] truncate rounded border-l-2 bg-[#151a2b] px-1 text-[9px] ${item.tint}`} style={{ left: percent(item.beat) }}>{item.text}</span>)}</div></div>)}
    </div>
    <div className="mt-2 grid gap-2 xl:grid-cols-4">
      <fieldset className="min-w-0 rounded border border-[#252844] p-2"><legend className="px-1 text-[9px] font-semibold text-violet-200">Seções do arranjo</legend><div className="flex flex-wrap items-end gap-1.5"><label className="text-[9px] text-slate-500">Tipo<select aria-label="Tipo de seção" value={sectionKind} onChange={(event) => { const kind = event.target.value as ArrangementSectionKind; setSectionKind(kind); if (kind !== "custom") setSectionName(SECTION_KINDS.find((item) => item.value === kind)?.label || ""); }} className={`ml-1 ${inputClass}`}>{SECTION_KINDS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>{sectionKind === "custom" && <label className="text-[9px] text-slate-500">Nome<input aria-label="Nome da seção personalizada" value={sectionName} onChange={(event) => setSectionName(event.target.value)} className={`ml-1 w-24 ${inputClass}`} /></label>}<label className="text-[9px] text-slate-500">Início<input aria-label="Beat inicial da seção" type="number" min="0" step="0.25" value={sectionStart} onChange={(event) => setSectionStart(event.target.value)} className={`ml-1 w-16 ${inputClass}`} /></label><label className="text-[9px] text-slate-500">Fim<input aria-label="Beat final da seção" type="number" min="0.25" step="0.25" value={sectionEnd} onChange={(event) => setSectionEnd(event.target.value)} className={`ml-1 w-16 ${inputClass}`} /></label><button type="button" onClick={commitSection} className="rounded bg-violet-800 px-2 py-1 text-[10px] text-white">Adicionar seção</button></div><ul className="mt-2 flex flex-wrap gap-1">{sections.map((item) => <li key={item.id} className="flex items-center gap-1 rounded bg-violet-950/50 px-1.5 py-1 text-[9px]">{item.name} · {item.startBeat}–{item.endBeat}<button type="button" aria-label={`Remover seção ${item.name}`} onClick={() => removeSection(item.id)} className="text-rose-300">×</button></li>)}</ul></fieldset>
      <fieldset className="min-w-0 rounded border border-[#252844] p-2"><legend className="px-1 text-[9px] font-semibold text-emerald-200">Chord Track</legend><div className="flex flex-wrap items-end gap-1.5"><label className="text-[9px] text-slate-500">Raiz<select aria-label="Raiz do acorde na Chord Track" value={root} onChange={(event) => setRoot(event.target.value as typeof root)} className={`ml-1 ${inputClass}`}>{ROOTS.map((value) => <option key={value}>{value}</option>)}</select></label><label className="text-[9px] text-slate-500">Qualidade<select aria-label="Qualidade do acorde na Chord Track" value={quality} onChange={(event) => setQuality(event.target.value as ChordQuality)} className={`ml-1 ${inputClass}`}>{QUALITIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label><label className="text-[9px] text-slate-500">Beat<input aria-label="Beat inicial do acorde" type="number" min="0" step="0.25" value={chordBeat} onChange={(event) => setChordBeat(event.target.value)} className={`ml-1 w-14 ${inputClass}`} /></label><label className="text-[9px] text-slate-500">Duração<input aria-label="Duração do acorde" type="number" min="0.25" step="0.25" value={chordDuration} onChange={(event) => setChordDuration(event.target.value)} className={`ml-1 w-14 ${inputClass}`} /></label><button type="button" onClick={commitChord} aria-label="Adicionar acorde na Chord Track" className="rounded bg-emerald-800 px-2 py-1 text-[10px] text-white">Adicionar acorde</button></div><ul className="mt-2 flex flex-wrap gap-1">{orderedChords.map((item) => <li key={item.id} className="flex items-center gap-1 rounded bg-emerald-950/50 px-1.5 py-1 text-[9px]">{item.root} {item.quality} · beat {item.startBeat}<button type="button" aria-label={`Remover acorde ${item.root} ${item.quality}`} onClick={() => removeChord(item)} className="text-rose-300">×</button></li>)}</ul></fieldset>
      <fieldset className="min-w-0 rounded border border-[#252844] p-2"><legend className="px-1 text-[9px] font-semibold text-amber-200">Beat · Compasso · Seção · Transição</legend><div className="flex flex-wrap items-end gap-1.5"><label className="text-[9px] text-slate-500">Tipo<select aria-label="Tipo de marcador musical" value={markerKind} onChange={(event) => setMarkerKind(event.target.value as MusicSyncPointKind)} className={`ml-1 ${inputClass}`}>{MARKER_KINDS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label><label className="text-[9px] text-slate-500">Beat<input aria-label="Beat do marcador musical" type="number" min="0" step="0.25" value={markerBeat} onChange={(event) => setMarkerBeat(event.target.value)} className={`ml-1 w-14 ${inputClass}`} /></label><label className="text-[9px] text-slate-500">Rótulo<input aria-label="Rótulo do marcador musical" value={markerLabel} onChange={(event) => setMarkerLabel(event.target.value)} className={`ml-1 w-24 ${inputClass}`} /></label><button type="button" onClick={commitMarker} className="rounded bg-amber-700 px-2 py-1 text-[10px] text-white">Adicionar marcador</button></div><ul className="mt-2 flex flex-wrap gap-1">{syncPoints.map((item) => <li key={item.id} className="flex items-center gap-1 rounded bg-amber-950/50 px-1.5 py-1 text-[9px]">{item.kind} · {item.label} · {item.beat}<button type="button" aria-label={`Remover marcador ${item.label}`} onClick={() => removeMarker(item.id)} className="text-rose-300">×</button></li>)}</ul></fieldset>
      <fieldset className="min-w-0 rounded border border-[#252844] p-2"><legend className="px-1 text-[9px] font-semibold text-cyan-200">Key / Scale Track</legend><div className="flex flex-wrap items-end gap-1.5"><label className="text-[9px] text-slate-500">Beat<input aria-label="Beat da mudança tonal" type="number" min="0" step="0.25" value={keyBeat} onChange={(event) => setKeyBeat(event.target.value)} className={`ml-1 w-14 ${inputClass}`} /></label><label className="text-[9px] text-slate-500">Tônica<select aria-label="Tônica da mudança tonal" value={keyTonic} onChange={(event) => setKeyTonic(event.target.value as typeof keyTonic)} className={`ml-1 ${inputClass}`}>{ROOTS.map((value) => <option key={value}>{value}</option>)}</select></label><label className="text-[9px] text-slate-500">Acidente<select aria-label="Acidente da mudança tonal" value={keyAccidental} onChange={(event) => setKeyAccidental(event.target.value as Accidental)} className={`ml-1 ${inputClass}`}><option value="natural">natural</option><option value="sharp">sustenido</option><option value="flat">bemol</option></select></label><label className="text-[9px] text-slate-500">Escala<select aria-label="Escala da mudança tonal" value={keyScale} onChange={(event) => setKeyScale(event.target.value as ScaleName)} className={`ml-1 ${inputClass}`}>{SCALES.map((item) => <option key={item}>{item}</option>)}</select></label><button type="button" onClick={commitKeyPoint} className="rounded bg-cyan-800 px-2 py-1 text-[10px] text-white">Definir tonalidade</button></div><ul className="mt-2 flex flex-wrap gap-1">{(music.keyMap || [{ beat: 0, ...music.key }]).map((item) => <li key={item.beat} className="flex items-center gap-1 rounded bg-cyan-950/50 px-1.5 py-1 text-[9px]">{item.tonic}{item.accidental === "sharp" ? "#" : item.accidental === "flat" ? "b" : ""} {item.scale} · beat {item.beat}<button type="button" disabled={item.beat === 0} aria-label={`Remover mudança tonal no beat ${item.beat}`} onClick={() => removeKeyPoint(item.beat)} className="text-rose-300 disabled:opacity-30">×</button></li>)}</ul></fieldset>
    </div>{error && <p role="alert" className="mt-1 text-[10px] text-rose-300">{error}</p>}
  </section>;
}
