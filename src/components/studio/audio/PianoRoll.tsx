"use client";

import { useMemo, useRef, useState } from "react";
import { MusicProjectState, MusicalNote, constrainNotesToScale, humanizeNotes, isPitchInScale, midiToFrequency, midiToPitch, pitchToMidi, quantizeBeat, quantizeNotes, transposeNote } from "@/lib/studio/audio/music-domain";

function MusicalInspector({ note, onChange }: { note: MusicalNote; onChange: (updates: Partial<MusicalNote>) => void }) {
  const frequency = midiToFrequency(pitchToMidi(note.pitch, note.octave, note.accidental));
  return <div className="flex flex-wrap items-center gap-2 border-b border-[#242943] bg-[#0c0f1d] px-3 py-2 text-[10px] text-slate-400"><strong className="text-slate-300">Inspector musical</strong><span aria-label="Frequência da nota">{frequency.toFixed(2)} Hz</span><label>Articulação<select aria-label="Articulação da nota" value={note.articulation || "normal"} onChange={(event) => onChange({ articulation: event.target.value as MusicalNote["articulation"] })} className="ml-1 rounded border border-[#303650] bg-[#111528] px-1 py-1 text-white"><option>normal</option><option>legato</option><option>staccato</option><option>accent</option><option>tenuto</option><option>sustain</option></select></label><label>Expressão<input aria-label="Expressão da nota" type="range" min="0" max="1" step="0.01" value={note.expression ?? 1} onChange={(event) => onChange({ expression: Number(event.target.value) })} className="ml-1 align-middle" /></label><button type="button" aria-label="Transpor nota um semitom abaixo" onClick={() => onChange(transposeNote(note, -1))} className="rounded bg-violet-900/40 px-2 py-1 text-violet-200">− semitom</button><button type="button" aria-label="Transpor nota um semitom acima" onClick={() => onChange(transposeNote(note, 1))} className="rounded bg-violet-900/40 px-2 py-1 text-violet-200">+ semitom</button></div>;
}

function MusicalContextInspector({ music, onChange, onRevertHumanize, onRevertTiming }: { music: MusicProjectState; onChange: (music: MusicProjectState) => void; onRevertHumanize: () => void; onRevertTiming: () => void }) {
  const canRevert = music.notes.some((note) => note.originalStartBeat !== undefined || note.originalVelocity !== undefined);
  const tonicMidi = pitchToMidi(music.key.tonic, 0, music.key.accidental);
  const outsideScale = music.notes.filter((note) => !isPitchInScale(pitchToMidi(note.pitch, note.octave, note.accidental), tonicMidi, music.key.scale)).length;
  const canRevertTiming = music.notes.some((note) => note.originalStartBeat !== undefined);
  return <div className="flex flex-wrap items-center gap-2 border-b border-[#242943] bg-[#0c0f1d] px-3 py-2 text-[10px] text-slate-400"><strong className="text-slate-300">Contexto musical</strong><label>Tônica<select aria-label="Tônica musical" value={music.key.tonic} onChange={(event) => onChange({ ...music, key: { ...music.key, tonic: event.target.value as MusicProjectState["key"]["tonic"] } })} className="ml-1 rounded border border-[#303650] bg-[#111528] px-1 py-1 text-white">{["C", "D", "E", "F", "G", "A", "B"].map((pitch) => <option key={pitch}>{pitch}</option>)}</select></label><label>Escala<select aria-label="Escala musical" value={music.key.scale} onChange={(event) => onChange({ ...music, key: { ...music.key, scale: event.target.value as MusicProjectState["key"]["scale"] } })} className="ml-1 rounded border border-[#303650] bg-[#111528] px-1 py-1 text-white">{["major", "minor", "dorian", "phrygian", "lydian", "mixolydian", "aeolian", "locrian", "pentatonic", "chromatic"].map((scale) => <option key={scale}>{scale}</option>)}</select></label><span aria-label="Validação da escala" className={outsideScale ? "text-amber-300" : "text-emerald-300"}>{outsideScale ? `${outsideScale} nota(s) fora da escala` : "Notas na escala"}</span><button type="button" disabled={!outsideScale} onClick={() => onChange({ ...music, notes: constrainNotesToScale(music.notes, tonicMidi, music.key.scale) })} className="rounded bg-amber-900/40 px-2 py-1 text-amber-200 disabled:opacity-40">Corrigir escala</button><button type="button" disabled={!canRevertTiming} onClick={onRevertTiming} className="rounded bg-blue-900/40 px-2 py-1 text-blue-200 disabled:opacity-40">Reverter quantização</button><button type="button" disabled={!canRevert} onClick={onRevertHumanize} className="rounded bg-slate-800 px-2 py-1 text-slate-300 disabled:opacity-40">Reverter humanização</button></div>;
}

const ROWS = Array.from({ length: 25 }, (_, index) => 72 - index);
const BEAT_WIDTH = 56;
const ROW_HEIGHT = 24;
type PianoRollProps = { music: MusicProjectState; onChange: (music: MusicProjectState) => void };
type Gesture = { pointerId: number; mode: "move" | "resize"; x: number; y: number; notes: MusicalNote[]; ids: string[] };

export function PianoRoll({ music, onChange }: PianoRollProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [draftNotes, setDraftNotes] = useState<MusicalNote[] | null>(null);
  const gestureRef = useRef<Gesture | null>(null);
  const grid = music.quantizeGrid || 4;
  const step = 4 / grid;
  const maxBeat = Math.max(16, ...music.notes.map((note) => note.startBeat + note.durationBeats));
  const columns = useMemo(() => Array.from({ length: Math.ceil(maxBeat) }, (_, i) => i), [maxBeat]);
  const selected = music.notes.filter((note) => selectedIds.includes(note.id));
  const visibleNotes = draftNotes ?? music.notes;
  const operationIds = selected.length ? new Set(selectedIds) : new Set(music.notes.map((note) => note.id));
  const operationLabel = selected.length ? `selecionadas (${selected.length})` : "todas";
  const selectedVelocity = selected.length && selected.every((note) => note.velocity === selected[0].velocity) ? selected[0].velocity : 96;
  const updateNote = (id: string, updates: Partial<MusicalNote>) => onChange({ ...music, notes: music.notes.map((note) => note.id === id ? { ...note, ...updates } : note) });
  const addNote = (midi: number, beat: number) => { const pitch = midiToPitch(midi); const note: MusicalNote = { id: `note-${Date.now()}-${midi}`, ...pitch, startBeat: quantizeBeat(beat, grid), durationBeats: 1, velocity: 96, articulation: "normal" }; onChange({ ...music, notes: [...music.notes, note] }); setSelectedIds([note.id]); };
  const removeSelected = () => { if (selectedIds.length) onChange({ ...music, notes: music.notes.filter((note) => !selectedIds.includes(note.id)) }); setSelectedIds([]); };
  const duplicateSelected = () => {
    if (!selected.length) return;
    const offset = Math.max(step, ...selected.map((note) => note.durationBeats));
    const copies = selected.map((note, index) => ({ ...note, id: `note-${Date.now()}-${index}`, startBeat: note.startBeat + offset }));
    onChange({ ...music, notes: [...music.notes, ...copies] }); setSelectedIds(copies.map((note) => note.id));
  };
  const [additiveSelection, setAdditiveSelection] = useState(false);
  const selectNote = (event: React.MouseEvent<Element>, noteId: string) => {
    const additive = additiveSelection || event.shiftKey || event.ctrlKey || event.metaKey;
    setSelectedIds((ids) => additive ? (ids.includes(noteId) ? ids : [...ids, noteId]) : [noteId]);
  };
  const beginNoteGesture = (event: React.PointerEvent<HTMLElement>, note: MusicalNote, mode: Gesture["mode"]) => {
    event.preventDefault();
    event.stopPropagation();
    const additive = additiveSelection || event.shiftKey || event.ctrlKey || event.metaKey;
    const ids = additive ? (selectedIds.includes(note.id) ? selectedIds : [...selectedIds, note.id]) : (selectedIds.includes(note.id) ? selectedIds : [note.id]);
    setSelectedIds(ids);
    const gridElement = event.currentTarget.closest<HTMLElement>("[data-piano-roll-grid]");
    if (!gridElement) return;
    gestureRef.current = { pointerId: event.pointerId, mode, x: event.clientX, y: event.clientY, notes: music.notes.map((item) => ({ ...item })), ids };
    gridElement.setPointerCapture(event.pointerId);
  };
  const updateGesture = (event: React.PointerEvent<HTMLDivElement>, commit: boolean) => {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    const beatDelta = Math.round(((event.clientX - gesture.x) / BEAT_WIDTH) / step) * step;
    const pitchDelta = Math.round((gesture.y - event.clientY) / ROW_HEIGHT);
    const ids = new Set(gesture.ids);
    const notes = gesture.notes.map((note) => {
      if (!ids.has(note.id)) return note;
      if (gesture.mode === "resize") return { ...note, durationBeats: Math.max(step, note.durationBeats + beatDelta) };
      const pitch = midiToPitch(Math.max(0, Math.min(127, pitchToMidi(note.pitch, note.octave, note.accidental) + pitchDelta)));
      return { ...note, ...pitch, startBeat: Math.max(0, note.startBeat + beatDelta) };
    });
    if (commit) {
      gestureRef.current = null;
      setDraftNotes(null);
      if (beatDelta !== 0 || (gesture.mode === "move" && pitchDelta !== 0)) onChange({ ...music, notes });
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    } else setDraftNotes(notes);
  };
  const cancelGesture = (event: React.PointerEvent<HTMLDivElement>) => {
    if (gestureRef.current?.pointerId !== event.pointerId) return;
    gestureRef.current = null;
    setDraftNotes(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;
    if (target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target.isContentEditable) return;
    if ((event.key === "Delete" || event.key === "Backspace") && selectedIds.length) { event.preventDefault(); removeSelected(); }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "d" && selectedIds.length) { event.preventDefault(); duplicateSelected(); }
  };
  const revertTiming = () => onChange({ ...music, notes: music.notes.map((note) => ({ ...note, startBeat: note.originalStartBeat ?? note.startBeat, originalStartBeat: undefined })) });
  const revertHumanize = () => onChange({ ...music, notes: music.notes.map((note) => ({ ...note, startBeat: note.originalStartBeat ?? note.startBeat, velocity: note.originalVelocity ?? note.velocity, originalStartBeat: undefined, originalVelocity: undefined })) });
  return <section tabIndex={0} onKeyDown={handleKeyDown} className="flex h-full min-h-0 flex-col bg-[#090b14] text-slate-200 outline-none" aria-label="Piano Roll">
    <MusicalContextInspector music={music} onChange={onChange} onRevertHumanize={revertHumanize} onRevertTiming={revertTiming} />
    {selected.length === 1 && <MusicalInspector note={selected[0]} onChange={(updates) => updateNote(selected[0].id, updates)} />}
    <header className="flex items-center justify-between border-b border-[#242943] px-3 py-2">
      <div><h2 className="text-xs font-bold uppercase tracking-wider text-white">Piano Roll</h2><p className="text-[10px] text-slate-500">Modelo musical · {music.notes.length} notas · {selectedIds.length} selecionadas</p></div>
      <div className="flex items-center gap-1">
        <button type="button" aria-pressed={additiveSelection} onClick={() => setAdditiveSelection((active) => !active)} className={`rounded px-2 py-1 text-[10px] ${additiveSelection ? "bg-amber-600 text-white" : "bg-slate-800 text-slate-200"}`}>{additiveSelection ? "Seleção múltipla ativa" : "Adicionar seleção"}</button>
        <label className="text-[10px] text-slate-500">BPM<input type="number" min="20" max="300" value={music.tempoMap[0]?.bpm || 120} onChange={(event) => onChange({ ...music, tempoMap: [{ beat: 0, bpm: Math.max(20, Math.min(300, Number(event.target.value) || 120)) }] })} className="ml-1 w-12 rounded border border-[#303650] bg-[#111528] px-1.5 py-1 text-[10px] text-white" /></label>
        <label className="text-[10px] text-slate-500">Compasso<select value={`${music.timeSignature.numerator}/${music.timeSignature.denominator}`} onChange={(event) => { const [numerator, denominator] = event.target.value.split("/").map(Number); onChange({ ...music, timeSignature: { numerator, denominator: denominator as 2 | 4 | 8 | 16 } }); }} className="ml-1 rounded border border-[#303650] bg-[#111528] px-1.5 py-1 text-[10px]"><option>4/4</option><option>3/4</option><option>2/4</option><option>6/8</option></select></label>
        <label className="text-[10px] text-slate-500">Quantização</label><select aria-label="Quantização" value={grid} onChange={(event) => onChange({ ...music, quantizeGrid: Number(event.target.value) as 1 | 2 | 4 | 8 | 16 | 32 })} className="rounded border border-[#303650] bg-[#111528] px-1.5 py-1 text-[10px]"><option value="1">1/4</option><option value="2">1/8</option><option value="4">1/16</option><option value="8">1/32</option></select>
        <button type="button" onClick={() => onChange({ ...music, notes: quantizeNotes(music.notes.filter((note) => operationIds.has(note.id)), grid).reduce((all, note) => all.some((item) => item.id === note.id) ? all : [...all, note], music.notes.filter((note) => !operationIds.has(note.id))) })} className="rounded bg-blue-900/40 px-2 py-1 text-[10px] text-blue-200">Quantizar {operationLabel}</button><button type="button" onClick={() => onChange({ ...music, notes: humanizeNotes(music.notes.filter((note) => operationIds.has(note.id)), 0.04, 8, Date.now()).reduce((all, note) => all.some((item) => item.id === note.id) ? all : [...all, note], music.notes.filter((note) => !operationIds.has(note.id))) })} className="rounded bg-violet-900/40 px-2 py-1 text-[10px] text-violet-200">Humanizar {operationLabel}</button><button type="button" onClick={duplicateSelected} disabled={!selected.length} className="rounded bg-indigo-900/40 px-2 py-1 text-[10px] text-indigo-200 disabled:opacity-40">Duplicar</button><button type="button" onClick={removeSelected} disabled={!selected.length} className="rounded bg-rose-900/30 px-2 py-1 text-[10px] text-rose-300 disabled:opacity-40">Excluir</button>
      </div>
    </header>
    <div className="flex-1 overflow-auto"><div data-piano-roll-grid onPointerMove={(event) => updateGesture(event, false)} onPointerUp={(event) => updateGesture(event, true)} onPointerCancel={cancelGesture} className="relative min-w-[900px] touch-none" style={{ height: ROWS.length * ROW_HEIGHT + 28 }}>
      <div className="sticky top-0 z-10 ml-12 flex h-7 border-b border-[#242943] bg-[#0c0f1d]">{columns.map((beat) => <div key={beat} className="w-14 shrink-0 border-l border-[#242943] px-1 text-[9px] text-slate-500">{beat + 1}</div>)}</div>
      {ROWS.map((midi, row) => <div key={midi} className="absolute left-0 flex h-6 w-full" style={{ top: 28 + row * ROW_HEIGHT }}><div className="flex w-12 shrink-0 items-center justify-end border-r border-[#242943] pr-1 text-[9px] text-slate-500">{midiToPitch(midi).pitch}{midiToPitch(midi).octave}</div><div className="relative flex-1" onDoubleClick={(event) => { if ((event.target as HTMLElement).closest("button")) return; const rect = event.currentTarget.getBoundingClientRect(); addNote(midi, (event.clientX - rect.left) / BEAT_WIDTH); }}>{columns.map((beat) => <span key={beat} className={`absolute inset-y-0 w-14 border-l ${beat % (music.timeSignature.numerator || 4) === 0 ? "border-[#465078]" : "border-[#1c2237]"}`} style={{ left: beat * BEAT_WIDTH }} />)}{visibleNotes.filter((note) => pitchToMidi(note.pitch, note.octave, note.accidental) === midi).map((note) => <button data-piano-note type="button" key={note.id} aria-label={`Nota ${note.pitch}${note.accidental === "sharp" ? "#" : note.accidental === "flat" ? "b" : ""}${note.octave}, início ${note.startBeat}, duração ${note.durationBeats}`} onPointerDown={(event) => beginNoteGesture(event, note, "move")} onClick={(event) => selectNote(event, note.id)} className={`absolute top-0 h-5 rounded border px-1 pr-3 text-left text-[9px] text-white touch-none ${selectedIds.includes(note.id) ? "border-amber-200 bg-amber-500/80" : "border-violet-300/50 bg-violet-600/70"}`} style={{ left: note.startBeat * BEAT_WIDTH, width: Math.max(18, note.durationBeats * BEAT_WIDTH - 2) }}>{note.velocity}<span aria-label="Redimensionar nota" onPointerDown={(event) => beginNoteGesture(event, note, "resize")} className="absolute inset-y-0 right-0 w-2 cursor-ew-resize rounded-r bg-white/25" /></button>)}</div></div>)}
    </div><div aria-label="Lane visual de velocity" className="relative min-w-[900px] border-t border-[#242943] bg-[#0c0f1d]" style={{ height: 72 }}><span className="absolute left-1 top-1 text-[9px] uppercase tracking-wider text-slate-600">Velocity</span><div className="absolute inset-x-12 bottom-2 top-5">{visibleNotes.map((note) => <button key={`velocity-${note.id}`} type="button" aria-label={`Velocity visual ${note.pitch}${note.octave}`} onClick={() => selectNote({} as React.MouseEvent, note.id)} className={`absolute bottom-0 w-3 rounded-t ${selectedIds.includes(note.id) ? "bg-amber-400" : "bg-violet-500/70"}`} style={{ left: note.startBeat * BEAT_WIDTH, height: `${Math.max(4, (note.velocity / 127) * 40)}px` }} />)}</div></div></div>
    <footer className="flex flex-wrap items-center gap-2 border-t border-[#242943] px-3 py-2 text-[10px] text-slate-500">{selected.length ? <><span>{selected.length === 1 ? `${selected[0].pitch}${selected[0].accidental === "sharp" ? "#" : selected[0].accidental === "flat" ? "b" : ""}${selected[0].octave}` : `${selected.length} notas selecionadas`}</span>{selected.length === 1 && <><label>Início <input aria-label="Início da nota" type="number" min="0" step={step} value={selected[0].startBeat} onChange={(event) => updateNote(selected[0].id, { startBeat: Math.max(0, Number(event.target.value) || 0) })} className="w-14 rounded bg-[#111528] px-1" /></label><label>Duração <input aria-label="Duração da nota" type="number" min={step} step={step} value={selected[0].durationBeats} onChange={(event) => updateNote(selected[0].id, { durationBeats: Math.max(step, Number(event.target.value) || step) })} className="w-14 rounded bg-[#111528] px-1" /></label><label>Tuplet atual <input aria-label="Tuplet atual" type="number" min="1" max="32" step="1" value={selected[0].tuplet?.actual ?? ""} placeholder="—" onChange={(event) => { const actual = Number(event.target.value); const normal = selected[0].tuplet?.normal ?? 2; updateNote(selected[0].id, { tuplet: Number.isFinite(actual) && actual > 0 ? { actual: Math.min(32, Math.round(actual)), normal } : undefined }); }} className="w-12 rounded bg-[#111528] px-1" /></label><label>Tuplet normal <input aria-label="Tuplet normal" type="number" min="1" max="32" step="1" value={selected[0].tuplet?.normal ?? ""} placeholder="—" onChange={(event) => { const normal = Number(event.target.value); const actual = selected[0].tuplet?.actual ?? 3; updateNote(selected[0].id, { tuplet: Number.isFinite(normal) && normal > 0 ? { actual, normal: Math.min(32, Math.round(normal)) } : undefined }); }} className="w-12 rounded bg-[#111528] px-1" /></label></>}<label>Velocity {selected.length > 1 && <span className="text-slate-600">(lote)</span>}<input aria-label="Velocity" type="range" min="1" max="127" value={selected.length === 1 ? selected[0].velocity : selectedVelocity} onChange={(event) => { const velocity = Number(event.target.value); onChange({ ...music, notes: music.notes.map((note) => selectedIds.includes(note.id) ? { ...note, velocity } : note) }); }} /></label><button type="button" onClick={() => onChange({ ...music, notes: music.notes.map((note) => selectedIds.includes(note.id) ? transposeNote(note, 12) : note) })} className="rounded bg-violet-900/40 px-2 py-1 text-violet-200">+ oitava</button><button type="button" onClick={() => onChange({ ...music, notes: music.notes.map((note) => selectedIds.includes(note.id) ? transposeNote(note, -12) : note) })} className="rounded bg-violet-900/40 px-2 py-1 text-violet-200">− oitava</button></> : "Duplo clique cria nota · Shift/Ctrl/Cmd seleciona várias · Delete exclui · Ctrl/Cmd+D duplica."}</footer>
  </section>;
}
