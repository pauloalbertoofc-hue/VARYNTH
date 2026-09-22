"use client";

import { useState } from "react";
import { ChordQuality, MusicProjectState, chordToNotes, midiToPitch, pitchToMidi, transposeNote } from "@/lib/studio/audio/music-domain";

export function ScoreView({ music, onChange }: { music: MusicProjectState; onChange?: (music: MusicProjectState) => void }) {
  const [selectedId, setSelectedId] = useState<string>();
  const [chordRoot, setChordRoot] = useState<MusicProjectState["key"]["tonic"]>("C");
  const [chordQuality, setChordQuality] = useState<ChordQuality>("major");
  const [chordInversion, setChordInversion] = useState(0);
  const [chordExtension, setChordExtension] = useState<number | undefined>();
  const [chordVoicing, setChordVoicing] = useState<NonNullable<import("@/lib/studio/audio/music-domain").MusicalChord["voicing"]>>("close");
  const [selectedChordId, setSelectedChordId] = useState<string>();
  const notes = [...music.notes].sort((a, b) => a.startBeat - b.startBeat);
  const selected = notes.find((note) => note.id === selectedId);
  const lines = [0, 1, 2, 3, 4];
  const updateSelected = (updates: Partial<NonNullable<typeof selected>>) => {
    if (!selected || !onChange) return;
    onChange({ ...music, notes: music.notes.map((note) => note.id === selected.id ? { ...note, ...updates } : note) });
  };
  const addChord = () => {
    if (!onChange) return;
    const chord = { id: `score-chord-${Date.now()}`, root: chordRoot, accidental: "natural" as const, octave: 4, quality: chordQuality, extensions: chordExtension ? [chordExtension] : undefined, inversion: chordInversion, voicing: chordVoicing, startBeat: selected?.startBeat ?? 0, durationBeats: 1 };
    const notes = chordToNotes(chord).map((note) => ({ ...note, voice: 1 }));
    onChange({ ...music, chords: [...(music.chords || []), chord], notes: [...music.notes, ...notes] });
  };
  const updateChord = () => {
    if (!onChange || !selectedChordId) return;
    const current = music.chords?.find((chord) => chord.id === selectedChordId);
    if (!current) return;
    const chord = { ...current, root: chordRoot, quality: chordQuality, inversion: chordInversion, voicing: chordVoicing, extensions: chordExtension ? [chordExtension] : undefined };
    const prefix = `${current.id}-note-`;
    onChange({ ...music, chords: (music.chords || []).map((item) => item.id === current.id ? chord : item), notes: [...music.notes.filter((note) => note.chordId !== current.id && !note.id.startsWith(prefix)), ...chordToNotes(chord)] });
  };
  return <section className="flex h-full flex-col overflow-auto bg-[#faf8f0] text-slate-900" aria-label="Score View">
    <header className="flex items-center justify-between border-b border-slate-300 bg-white px-4 py-3">
      <div><h2 className="text-sm font-bold">Score View</h2><p className="text-[10px] text-slate-500">Partitura editável · mesmo modelo musical do Piano Roll</p></div>
      <span className="text-[10px] text-slate-500">{music.timeSignature.numerator}/{music.timeSignature.denominator} · {music.tempoMap[0]?.bpm || 120} BPM</span>
    </header>
    <div className="px-4 pt-2 text-xs">Voicing <select aria-label="Voicing do acorde" value={chordVoicing} onChange={(event) => setChordVoicing(event.target.value as NonNullable<import("@/lib/studio/audio/music-domain").MusicalChord["voicing"]>)} className="ml-1 rounded border px-1"><option value="close">close</option><option value="drop2">drop2</option><option value="spread">spread</option></select></div>
    <div className="min-w-[900px] p-8">
      <div className="relative h-44 border-y-2 border-slate-700" onDoubleClick={(event) => {
        if (!onChange || (event.target as HTMLElement).closest("button")) return;
        const rect = event.currentTarget.getBoundingClientRect();
        const beat = Math.max(0, Math.round(((event.clientX - rect.left - 92) / 56) * 4) / 4);
        const pitch = midiToPitch(Math.max(48, Math.min(84, Math.round(76 - ((event.clientY - rect.top - 28) / 18) * 2))));
        const note = { id: `score-note-${Date.now()}`, ...pitch, startBeat: beat, durationBeats: 1, velocity: 96 };
        onChange({ ...music, notes: [...music.notes, note] }); setSelectedId(note.id);
      }}>
        <span className="absolute right-2 top-2 text-[9px] text-slate-500">duplo clique para inserir · clique numa nota para editar · cores indicam vozes</span>
        {lines.map((line) => <div key={line} className="absolute left-0 right-0 border-t border-slate-400" style={{ top: 28 + line * 18 }} />)}
        <div className="absolute left-3 top-4 text-5xl leading-none">𝄞</div>
        {notes.map((note) => {
          const midi = pitchToMidi(note.pitch, note.octave, note.accidental);
          const y = 28 + Math.max(0, Math.min(4, 4 - (midi - 64) * 0.5)) * 18;
          const voiceClass = ["bg-slate-900", "bg-blue-700", "bg-emerald-700", "bg-fuchsia-700"][(note.voice ?? 1) - 1] || "bg-slate-900";
          return <button key={note.id} type="button" aria-label={`Nota ${note.pitch}${note.accidental === "sharp" ? "#" : note.accidental === "flat" ? "b" : ""}${note.octave}, início ${note.startBeat}, duração ${note.durationBeats}, voz ${note.voice ?? 1}`} aria-pressed={selectedId === note.id} onClick={() => setSelectedId(note.id)} title={`${note.pitch}${note.octave} · ${note.durationBeats} beats · velocity ${note.velocity} · voz ${note.voice ?? 1}`} className={`absolute h-3 w-5 rounded-[50%] border-2 ${selectedId === note.id ? "border-amber-700 bg-amber-400" : `border-slate-800 ${voiceClass}`}`} style={{ left: 92 + note.startBeat * 56, top: y, transform: "rotate(-18deg)" }}><span className="absolute -left-1 -top-5 text-[9px]">{midiToPitch(midi).pitch}{midiToPitch(midi).octave}</span></button>;
        })}
      </div>
      <div className="mt-3 flex gap-14 text-[10px] text-slate-500">{Array.from({ length: Math.max(4, Math.ceil((notes.at(-1)?.startBeat || 0) / 4)) }, (_, index) => <span key={index}>compasso {index + 1}</span>)}</div>
    </div>
    <footer className="flex flex-wrap items-center gap-3 border-t border-slate-300 bg-white px-4 py-3 text-xs">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-300 px-4 py-2 text-xs"><strong>Acorde</strong><select aria-label="Raiz do acorde" value={chordRoot} onChange={(event) => setChordRoot(event.target.value as MusicProjectState["key"]["tonic"])} className="rounded border px-1"><option>C</option><option>D</option><option>E</option><option>F</option><option>G</option><option>A</option><option>B</option></select><select aria-label="Qualidade do acorde" value={chordQuality} onChange={(event) => setChordQuality(event.target.value as ChordQuality)} className="rounded border px-1"><option value="major">maior</option><option value="minor">menor</option><option value="diminished">diminuto</option><option value="augmented">aumentado</option><option value="sus2">sus2</option><option value="sus4">sus4</option><option value="7">7</option><option value="maj7">maj7</option><option value="min7">min7</option></select><select aria-label="Inversão do acorde" value={chordInversion} onChange={(event) => setChordInversion(Number(event.target.value))} className="rounded border px-1"><option value="0">posição fundamental</option><option value="1">1ª inversão</option><option value="2">2ª inversão</option><option value="3">3ª inversão</option></select><select aria-label="Extensão do acorde" value={chordExtension ?? "none"} onChange={(event) => setChordExtension(event.target.value === "none" ? undefined : Number(event.target.value))} className="rounded border px-1"><option value="none">sem extensão</option><option value="9">9ª</option><option value="11">11ª</option><option value="13">13ª</option></select><button type="button" onClick={addChord} className="rounded bg-indigo-100 px-2 py-1 text-indigo-900">Adicionar acorde</button>{selectedChordId && <button type="button" onClick={updateChord} className="rounded bg-amber-100 px-2 py-1 text-amber-900">Atualizar acorde selecionado</button>}</div>
      {(music.chords || []).length > 0 && <div className="flex flex-wrap gap-2 border-b border-slate-300 px-4 py-2 text-xs"><strong>Acordes do projeto</strong>{(music.chords || []).map((chord) => <button key={chord.id} type="button" onClick={() => { setSelectedChordId(chord.id); setChordRoot(chord.root); setChordQuality(chord.quality); setChordInversion(chord.inversion || 0); setChordExtension(chord.extensions?.[0]); setChordVoicing(chord.voicing || "close"); }} className={`rounded px-2 py-1 ${selectedChordId === chord.id ? "bg-amber-200" : "bg-slate-100"}`}>{chord.root} {chord.quality}{chord.extensions?.length ? ` add${chord.extensions.join("/")}` : ""} · {chord.voicing || "close"} · beat {chord.startBeat}</button>)}</div>}
      {selected ? <>
        <strong>{selected.pitch}{selected.accidental === "sharp" ? "#" : selected.accidental === "flat" ? "b" : ""}{selected.octave}</strong>
        <label>Início <input aria-label="Início da nota na partitura" type="number" min="0" step="0.25" value={selected.startBeat} onChange={(event) => updateSelected({ startBeat: Math.max(0, Number(event.target.value) || 0) })} className="w-16 rounded border px-1" /></label>
        <label>Duração <input aria-label="Duração da nota na partitura" type="number" min="0.125" step="0.125" value={selected.durationBeats} onChange={(event) => updateSelected({ durationBeats: Math.max(0.125, Number(event.target.value) || 0.125) })} className="w-16 rounded border px-1" /></label>
        <label>Velocity <input aria-label="Velocity da partitura" type="range" min="1" max="127" value={selected.velocity} onChange={(event) => updateSelected({ velocity: Number(event.target.value) })} /></label>
        <label>Voz <select aria-label="Voz da partitura" value={selected.voice ?? 1} onChange={(event) => updateSelected({ voice: Number(event.target.value) })} className="rounded border px-1"><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option></select></label>
        <button type="button" onClick={() => updateSelected(transposeNote(selected, 1))} className="rounded bg-violet-100 px-2 py-1">+ semitom</button>
        <button type="button" onClick={() => updateSelected(transposeNote(selected, -1))} className="rounded bg-violet-100 px-2 py-1">− semitom</button>
        <button type="button" onClick={() => onChange?.({ ...music, notes: music.notes.filter((note) => note.id !== selected.id) })} className="rounded bg-rose-100 px-2 py-1 text-rose-800">Excluir nota</button>
      </> : <span className="text-slate-500">Selecione uma nota ou dê duplo clique no pentagrama para inserir.</span>}
    </footer>
  </section>;
}
