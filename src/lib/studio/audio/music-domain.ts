export type PitchClass = "C" | "D" | "E" | "F" | "G" | "A" | "B";
export type Accidental = "natural" | "sharp" | "flat";
export type NoteDuration = "whole" | "half" | "quarter" | "eighth" | "sixteenth" | "thirtySecond";
export type MusicalArticulation = "normal" | "legato" | "staccato" | "accent" | "tenuto" | "sustain";
export type ScaleName = "major" | "minor" | "dorian" | "phrygian" | "lydian" | "mixolydian" | "aeolian" | "locrian" | "pentatonic" | "chromatic";
export type ChordQuality = "major" | "minor" | "diminished" | "augmented" | "sus2" | "sus4" | "7" | "maj7" | "min7";

export interface MusicalNote {
  id: string;
  pitch: PitchClass;
  accidental: Accidental;
  octave: number;
  startBeat: number;
  durationBeats: number;
  /** Optional tuplet ratio: actual notes fit into normal note slots. */
  tuplet?: { actual: number; normal: number };
  velocity: number;
  /** Notação polifônica: voz independente dentro da mesma pauta. */
  voice?: number;
  /** Relação opcional com o acorde que materializou a nota. */
  chordId?: string;
  articulation?: MusicalArticulation;
  tie?: "start" | "stop" | "continue";
  expression?: number;
  originalStartBeat?: number;
  originalVelocity?: number;
  /** Proveniência de um passo convertido do Drum Sequencer. */
  drum?: { patternId: string; lane: import("./drum-sequencer-domain").DrumLane; step: number; probability: number; microtimingMs: number };
}

export interface MusicalRest { id: string; startBeat: number; durationBeats: number; }
export interface MusicalChord { id: string; root: PitchClass; accidental: Accidental; octave: number; quality: ChordQuality; extensions?: number[]; inversion?: number; voicing?: "close" | "drop2" | "spread"; startBeat: number; durationBeats: number; }
export type ArrangementSectionKind = "intro" | "verse" | "pre-chorus" | "chorus" | "bridge" | "break" | "build" | "drop" | "outro" | "custom";
export interface ArrangementSection { id: string; name: string; kind: ArrangementSectionKind; startBeat: number; endBeat: number; }
export interface MusicKeyPoint { beat: number; tonic: PitchClass; accidental: Accidental; scale: ScaleName; }
export type MusicSyncPointKind = "beat" | "bar" | "section" | "transition";
export interface MusicSyncPoint { id: string; kind: MusicSyncPointKind; beat: number; label: string; sectionId?: string; }
export interface TempoPoint { beat: number; bpm: number; }
export interface TimeSignature { numerator: number; denominator: 2 | 4 | 8 | 16; }
export interface MusicProjectState {
  version: 1;
  tuning: { concertPitchHz: number; temperament: "12-TET" };
  tempoMap: TempoPoint[];
  timeSignature: TimeSignature;
  key: { tonic: PitchClass; accidental: Accidental; scale: ScaleName };
  /** Optional legacy-compatible key/scale changes, sorted by absolute beat. */
  keyMap?: MusicKeyPoint[];
  notes: MusicalNote[];
  rests: MusicalRest[];
  chords: MusicalChord[];
  /** Optional in saved legacy projects; populated by the project migrator. */
  arrangementSections?: ArrangementSection[];
  /** Semantic markers use absolute quarter-note beats. */
  syncPoints?: MusicSyncPoint[];
  clips?: import("./types").MusicClip[];
  quantizeGrid?: 1 | 2 | 4 | 8 | 16 | 32;
  loopRegion?: { enabled: boolean; startBeat: number; endBeat: number };
}

const PITCH_TO_SEMITONE: Record<PitchClass, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const ACCIDENTAL_OFFSET: Record<Accidental, number> = { natural: 0, sharp: 1, flat: -1 };
const SCALE_INTERVALS: Record<ScaleName, number[]> = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10], phrygian: [0, 1, 3, 5, 7, 8, 10], lydian: [0, 2, 4, 6, 7, 9, 11], mixolydian: [0, 2, 4, 5, 7, 9, 10], aeolian: [0, 2, 3, 5, 7, 8, 10], locrian: [0, 1, 3, 5, 6, 8, 10], pentatonic: [0, 2, 4, 7, 9], chromatic: [...Array(12).keys()] };

export function pitchToMidi(pitch: PitchClass, octave: number, accidental: Accidental = "natural"): number { return (octave + 1) * 12 + PITCH_TO_SEMITONE[pitch] + ACCIDENTAL_OFFSET[accidental]; }
export function midiToFrequency(midi: number, concertPitchHz = 440): number { return concertPitchHz * Math.pow(2, (midi - 69) / 12); }
export function pitchToFrequency(pitch: PitchClass, octave: number, accidental: Accidental = "natural", concertPitchHz = 440): number { return midiToFrequency(pitchToMidi(pitch, octave, accidental), concertPitchHz); }
export function midiToPitch(midi: number, preferFlats = false): { pitch: PitchClass; accidental: Accidental; octave: number } {
  const names = preferFlats ? [["C", "natural"], ["D", "flat"], ["D", "natural"], ["E", "flat"], ["E", "natural"], ["F", "natural"], ["G", "flat"], ["G", "natural"], ["A", "flat"], ["A", "natural"], ["B", "flat"], ["B", "natural"]] : [["C", "natural"], ["C", "sharp"], ["D", "natural"], ["D", "sharp"], ["E", "natural"], ["F", "natural"], ["F", "sharp"], ["G", "natural"], ["G", "sharp"], ["A", "natural"], ["A", "sharp"], ["B", "natural"]];
  const [pitch, accidental] = names[((Math.round(midi) % 12) + 12) % 12] as [PitchClass, Accidental];
  return { pitch, accidental, octave: Math.floor(midi / 12) - 1 };
}
export function beatsToSeconds(beats: number, bpm: number): number { if (bpm <= 0) throw new Error("BPM deve ser maior que zero."); return beats * 60 / bpm; }
export function beatsPerMeasure(timeSignature: TimeSignature): number {
  if (!Number.isInteger(timeSignature.numerator) || timeSignature.numerator < 1 || ![2, 4, 8, 16].includes(timeSignature.denominator)) {
    throw new Error("Compasso musical inválido.");
  }
  return timeSignature.numerator * (4 / timeSignature.denominator);
}
export function setMusicLoopBars(project: MusicProjectState, startBar: number, endBar: number, enabled = project.loopRegion?.enabled ?? true): MusicProjectState {
  const start = Math.max(1, Math.floor(startBar)); const end = Math.max(start + 1, Math.floor(endBar)); const beats = beatsPerMeasure(project.timeSignature);
  return { ...project, loopRegion: { enabled, startBeat: (start - 1) * beats, endBeat: (end - 1) * beats } };
}
export function musicLoopPositionAtMs(positionMs: number, loopRegion: MusicProjectState["loopRegion"], tempoMap: TempoPoint[]): number | null {
  if (!loopRegion?.enabled || loopRegion.endBeat <= loopRegion.startBeat) return null;
  const startMs = tempoMapBeatsToSeconds(loopRegion.startBeat, tempoMap) * 1000;
  const endMs = tempoMapBeatsToSeconds(loopRegion.endBeat, tempoMap) * 1000;
  return positionMs >= endMs ? startMs : null;
}
export function secondsToBeats(seconds: number, bpm: number): number { if (bpm <= 0) throw new Error("BPM deve ser maior que zero."); return seconds * bpm / 60; }
function normalizeTempoMap(tempoMap: TempoPoint[]): TempoPoint[] {
  if (!tempoMap.length) throw new Error("O mapa de tempo precisa conter ao menos um ponto.");
  const points = tempoMap.map((point) => ({ beat: Number(point.beat), bpm: Number(point.bpm) })).sort((a, b) => a.beat - b.beat);
  if (points.some((point, index) => !Number.isFinite(point.beat) || point.beat < 0 || !Number.isFinite(point.bpm) || point.bpm <= 0 || (index > 0 && point.beat === points[index - 1].beat))) {
    throw new Error("Mapa de tempo inválido: beats devem ser únicos e não negativos, e BPM deve ser positivo.");
  }
  if (points[0].beat !== 0) points.unshift({ beat: 0, bpm: points[0].bpm });
  return points;
}
export function tempoMapBeatsToSeconds(beats: number, tempoMap: TempoPoint[]): number {
  if (!Number.isFinite(beats)) throw new Error("A posição musical precisa ser finita.");
  if (beats <= 0) return 0;
  const points = normalizeTempoMap(tempoMap); let seconds = 0;
  for (let index = 0; index < points.length; index++) {
    const point = points[index]; const next = points[index + 1]; const to = next ? Math.min(beats, next.beat) : beats;
    if (to > point.beat) seconds += beatsToSeconds(to - point.beat, point.bpm);
    if (next && beats <= next.beat) break;
  }
  return seconds;
}
export function tempoMapSecondsToBeats(seconds: number, tempoMap: TempoPoint[]): number {
  if (!Number.isFinite(seconds)) throw new Error("A posição em segundos precisa ser finita.");
  if (seconds <= 0) return 0;
  const points = normalizeTempoMap(tempoMap); let remaining = seconds;
  for (let index = 0; index < points.length; index++) {
    const point = points[index]; const next = points[index + 1]; const segmentBeats = next ? next.beat - point.beat : Infinity;
    const segmentSeconds = Number.isFinite(segmentBeats) ? beatsToSeconds(segmentBeats, point.bpm) : Infinity;
    if (remaining <= segmentSeconds) return point.beat + secondsToBeats(remaining, point.bpm);
    remaining -= segmentSeconds;
  }
  return 0;
}
export function musicNoteScheduleTiming(startBeat: number, endBeat: number, positionMs: number, tempoMap: TempoPoint[]): { positionBeat: number; startMs: number; endMs: number; delayMs: number; durationMs: number } {
  if (!Number.isFinite(startBeat) || startBeat < 0 || !Number.isFinite(endBeat) || endBeat <= startBeat || !Number.isFinite(positionMs) || positionMs < 0) {
    throw new Error("Posição ou duração da nota musical inválida.");
  }
  const startMs = tempoMapBeatsToSeconds(startBeat, tempoMap) * 1000;
  const endMs = tempoMapBeatsToSeconds(endBeat, tempoMap) * 1000;
  return { positionBeat: tempoMapSecondsToBeats(positionMs / 1000, tempoMap), startMs, endMs, delayMs: Math.max(0, startMs - positionMs), durationMs: endMs - startMs };
}
export function upsertTempoPoint(tempoMap: TempoPoint[], point: TempoPoint): TempoPoint[] {
  if (!Number.isFinite(point.beat) || point.beat < 0 || !Number.isFinite(point.bpm) || point.bpm <= 0) throw new Error("Tempo point inválido.");
  return normalizeTempoMap([...tempoMap.filter((item) => item.beat !== point.beat), point]);
}
export function durationToBeats(duration: NoteDuration, dotted = false): number { const value: Record<NoteDuration, number> = { whole: 4, half: 2, quarter: 1, eighth: 0.5, sixteenth: 0.25, thirtySecond: 0.125 }; return value[duration] * (dotted ? 1.5 : 1); }
export function effectiveNoteDurationBeats(note: Pick<MusicalNote, "durationBeats" | "tuplet">): number { const actual = note.tuplet?.actual; const normal = note.tuplet?.normal; return actual && normal && actual > 0 && normal > 0 ? note.durationBeats * normal / actual : note.durationBeats; }
export function quantizeBeat(beat: number, grid: 1 | 2 | 4 | 8 | 16 | 32): number { const step = 4 / grid; return Math.round(beat / step) * step; }
export function transposeNote(note: MusicalNote, semitones: number): MusicalNote { const next = midiToPitch(pitchToMidi(note.pitch, note.octave, note.accidental) + semitones); return { ...note, pitch: next.pitch, accidental: next.accidental, octave: next.octave }; }
export function isPitchInScale(midi: number, tonicMidi: number, scale: ScaleName): boolean { return SCALE_INTERVALS[scale].includes(((midi - tonicMidi) % 12 + 12) % 12); }
export function constrainNotesToScale(notes: MusicalNote[], tonicMidi: number, scale: ScaleName): MusicalNote[] {
  return notes.map((note) => {
    const midi = pitchToMidi(note.pitch, note.octave, note.accidental);
    if (isPitchInScale(midi, tonicMidi, scale)) return note;
    let bestMidi = midi;
    let bestDistance = Infinity;
    for (let offset = -12; offset <= 12; offset += 1) {
      const candidate = midi + offset;
      if (isPitchInScale(candidate, tonicMidi, scale) && Math.abs(offset) < bestDistance) { bestMidi = candidate; bestDistance = Math.abs(offset); }
    }
    return { ...note, ...midiToPitch(bestMidi, note.accidental === "flat") };
  });
}
export function constrainNotesToKeyMap(notes: MusicalNote[], keyMap: MusicKeyPoint[] | undefined, fallback: MusicProjectState["key"]): MusicalNote[] {
  return notes.map((note) => {
    const key = musicKeyAtBeat(keyMap, fallback, note.startBeat);
    const tonicMidi = pitchToMidi(key.tonic, 0, key.accidental);
    const midi = pitchToMidi(note.pitch, note.octave, note.accidental);
    if (isPitchInScale(midi, tonicMidi, key.scale)) return note;
    let nearest = midi;
    let distance = Infinity;
    for (let offset = -12; offset <= 12; offset += 1) {
      const candidate = midi + offset;
      if (isPitchInScale(candidate, tonicMidi, key.scale) && Math.abs(offset) < distance) { nearest = candidate; distance = Math.abs(offset); }
    }
    return { ...note, ...midiToPitch(nearest, note.accidental === "flat") };
  });
}
export function chordIntervals(quality: ChordQuality): number[] { return { major: [0, 4, 7], minor: [0, 3, 7], diminished: [0, 3, 6], augmented: [0, 4, 8], sus2: [0, 2, 7], sus4: [0, 5, 7], "7": [0, 4, 7, 10], maj7: [0, 4, 7, 11], min7: [0, 3, 7, 10] }[quality]; }
export function chordToNotes(chord: MusicalChord, velocity = 96): MusicalNote[] { const root = pitchToMidi(chord.root, chord.octave, chord.accidental); const extensionIntervals: Record<number, number> = { 9: 14, 11: 17, 13: 21 }; const intervals = [...chordIntervals(chord.quality), ...(chord.extensions || []).map((extension) => extensionIntervals[extension]).filter((interval): interval is number => interval !== undefined)].filter((interval, index, all) => all.indexOf(interval) === index).sort((a, b) => a - b); const inversion = Math.max(0, Math.min(intervals.length - 1, Math.floor(chord.inversion || 0))); let voiced = [...intervals.slice(inversion).map((interval) => interval), ...intervals.slice(0, inversion).map((interval) => interval + 12)]; if (chord.voicing === "drop2" && voiced.length > 2) { const index = voiced.length - 2; voiced[index] -= 12; voiced.sort((a, b) => a - b); } else if (chord.voicing === "spread") voiced = voiced.map((interval, index) => interval + (index % 2 ? 12 : 0)); return voiced.map((interval, index) => { const pitch = midiToPitch(root + interval); return { id: `${chord.id}-note-${index}`, chordId: chord.id, ...pitch, startBeat: chord.startBeat, durationBeats: chord.durationBeats, velocity, voice: 1 }; }); }
export function flattenMusicNotes(project: MusicProjectState): MusicalNote[] { if (!project.clips?.length) return project.notes; return project.clips.flatMap((clip) => { const timelineOffsetBeats = tempoMapSecondsToBeats(clip.timelineStartMs / 1000, project.tempoMap); return clip.notes.map((note) => ({ ...transposeNote(note, clip.transposeSemitones), startBeat: note.startBeat + clip.startBeat + timelineOffsetBeats })); }); }
export function defaultMusicProject(): MusicProjectState { return { version: 1, tuning: { concertPitchHz: 440, temperament: "12-TET" }, tempoMap: [{ beat: 0, bpm: 120 }], timeSignature: { numerator: 4, denominator: 4 }, key: { tonic: "C", accidental: "natural", scale: "major" }, keyMap: [{ beat: 0, tonic: "C", accidental: "natural", scale: "major" }], notes: [], rests: [], chords: [], arrangementSections: [], syncPoints: [], clips: [] }; }

export function upsertMusicKeyPoint(keyMap: MusicKeyPoint[], point: MusicKeyPoint, timeSignature: TimeSignature = { numerator: 4, denominator: 4 }): MusicKeyPoint[] {
  if (!Number.isFinite(point.beat) || point.beat < 0) throw new Error("A posição da mudança tonal precisa ser um beat não negativo.");
  const measureBeats = beatsPerMeasure(timeSignature);
  if (Math.abs(point.beat / measureBeats - Math.round(point.beat / measureBeats)) > 1e-6) throw new Error("Mudanças de tonalidade devem começar no início de um compasso.");
  const next = [...keyMap.filter((item) => item.beat !== point.beat), point].sort((a, b) => a.beat - b.beat);
  if (!next.some((item) => item.beat === 0)) next.unshift({ tonic: "C", accidental: "natural", scale: "major", beat: 0 });
  return next;
}

export function musicKeyAtBeat(keyMap: MusicKeyPoint[] | undefined, fallback: MusicProjectState["key"], beat: number): MusicProjectState["key"] {
  const map = keyMap?.length ? keyMap : [{ beat: 0, ...fallback }];
  return [...map].sort((a, b) => a.beat - b.beat).filter((point) => point.beat <= beat).at(-1) || fallback;
}

export function upsertArrangementSection(sections: ArrangementSection[], section: ArrangementSection): ArrangementSection[] {
  if (!section.id.trim() || !section.name.trim() || !Number.isFinite(section.startBeat) || !Number.isFinite(section.endBeat) || section.startBeat < 0 || section.endBeat <= section.startBeat) throw new Error("Seção inválida: nome obrigatório e intervalo musical positivo esperado.");
  const next = [...sections.filter((item) => item.id !== section.id), { ...section, name: section.name.trim() }].sort((a, b) => a.startBeat - b.startBeat || a.endBeat - b.endBeat);
  if (next.some((item, index) => index > 0 && item.startBeat < next[index - 1].endBeat)) throw new Error("As seções do arranjo não podem se sobrepor.");
  return next;
}

export function upsertMusicSyncPoint(points: MusicSyncPoint[], point: MusicSyncPoint, timeSignature: TimeSignature): MusicSyncPoint[] {
  if (!point.id.trim() || !point.label.trim() || !Number.isFinite(point.beat) || point.beat < 0) throw new Error("Marcador musical inválido.");
  if (point.kind === "bar" && Math.abs(point.beat / beatsPerMeasure(timeSignature) - Math.round(point.beat / beatsPerMeasure(timeSignature))) > 1e-6) throw new Error("Marcador de compasso deve cair no início de um compasso.");
  return [...points.filter((item) => item.id !== point.id), { ...point, label: point.label.trim() }].sort((a, b) => a.beat - b.beat || a.kind.localeCompare(b.kind));
}
export function quantizeNotes(notes: MusicalNote[], grid: 1 | 2 | 4 | 8 | 16 | 32, strength = 1): MusicalNote[] { return notes.map((note) => { const target = quantizeBeat(note.startBeat, grid); return { ...note, originalStartBeat: note.originalStartBeat ?? note.startBeat, startBeat: note.startBeat + (target - note.startBeat) * Math.max(0, Math.min(1, strength)) }; }); }
export function humanizeNotes(notes: MusicalNote[], timingBeats = 0.04, velocity = 8, seed = 1): MusicalNote[] { return notes.map((note, index) => { const random = Math.sin(seed * 12.9898 + index * 78.233) * 43758.5453; const unit = random - Math.floor(random); const timingOffset = (unit * 2 - 1) * Math.max(0, timingBeats); const velocityOffset = Math.round((unit * 2 - 1) * Math.max(0, velocity)); return { ...note, originalStartBeat: note.originalStartBeat ?? note.startBeat, originalVelocity: note.originalVelocity ?? note.velocity, startBeat: Math.max(0, note.startBeat + timingOffset), velocity: Math.max(1, Math.min(127, note.velocity + velocityOffset)) }; }); }
