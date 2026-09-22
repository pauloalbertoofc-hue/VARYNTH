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
}

export interface MusicalRest { id: string; startBeat: number; durationBeats: number; }
export interface MusicalChord { id: string; root: PitchClass; accidental: Accidental; octave: number; quality: ChordQuality; extensions?: number[]; inversion?: number; voicing?: "close" | "drop2" | "spread"; startBeat: number; durationBeats: number; }
export interface TempoPoint { beat: number; bpm: number; }
export interface TimeSignature { numerator: number; denominator: 2 | 4 | 8 | 16; }
export interface MusicProjectState {
  version: 1;
  tuning: { concertPitchHz: number; temperament: "12-TET" };
  tempoMap: TempoPoint[];
  timeSignature: TimeSignature;
  key: { tonic: PitchClass; accidental: Accidental; scale: ScaleName };
  notes: MusicalNote[];
  rests: MusicalRest[];
  chords: MusicalChord[];
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
export function beatsPerMeasure(timeSignature: TimeSignature): number { return timeSignature.numerator * (4 / timeSignature.denominator); }
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
export function tempoMapBeatsToSeconds(beats: number, tempoMap: TempoPoint[]): number { if (beats <= 0) return 0; const points = [...tempoMap].sort((a, b) => a.beat - b.beat); let seconds = 0; for (let index = 0; index < points.length; index++) { const point = points[index]; const next = points[index + 1]; const from = Math.max(0, point.beat); const to = next ? Math.min(beats, next.beat) : beats; if (to > from) seconds += beatsToSeconds(to - from, point.bpm); if (next && beats <= next.beat) break; } return seconds; }
export function tempoMapSecondsToBeats(seconds: number, tempoMap: TempoPoint[]): number { if (seconds <= 0) return 0; const points = [...tempoMap].sort((a, b) => a.beat - b.beat); let remaining = seconds; for (let index = 0; index < points.length; index++) { const point = points[index]; const next = points[index + 1]; const segmentBeats = next ? Math.max(0, next.beat - point.beat) : Infinity; const segmentSeconds = Number.isFinite(segmentBeats) ? beatsToSeconds(segmentBeats, point.bpm) : Infinity; if (remaining <= segmentSeconds) return point.beat + secondsToBeats(remaining, point.bpm); remaining -= segmentSeconds; } return 0; }
export function upsertTempoPoint(tempoMap: TempoPoint[], point: TempoPoint): TempoPoint[] { if (point.beat < 0 || point.bpm <= 0) throw new Error("Tempo point inválido."); return [...tempoMap.filter((item) => item.beat !== point.beat), point].sort((a, b) => a.beat - b.beat); }
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
export function chordIntervals(quality: ChordQuality): number[] { return { major: [0, 4, 7], minor: [0, 3, 7], diminished: [0, 3, 6], augmented: [0, 4, 8], sus2: [0, 2, 7], sus4: [0, 5, 7], "7": [0, 4, 7, 10], maj7: [0, 4, 7, 11], min7: [0, 3, 7, 10] }[quality]; }
export function chordToNotes(chord: MusicalChord, velocity = 96): MusicalNote[] { const root = pitchToMidi(chord.root, chord.octave, chord.accidental); const extensionIntervals: Record<number, number> = { 9: 14, 11: 17, 13: 21 }; const intervals = [...chordIntervals(chord.quality), ...(chord.extensions || []).map((extension) => extensionIntervals[extension]).filter((interval): interval is number => interval !== undefined)].filter((interval, index, all) => all.indexOf(interval) === index).sort((a, b) => a - b); const inversion = Math.max(0, Math.min(intervals.length - 1, Math.floor(chord.inversion || 0))); let voiced = [...intervals.slice(inversion).map((interval) => interval), ...intervals.slice(0, inversion).map((interval) => interval + 12)]; if (chord.voicing === "drop2" && voiced.length > 2) { const index = voiced.length - 2; voiced[index] -= 12; voiced.sort((a, b) => a - b); } else if (chord.voicing === "spread") voiced = voiced.map((interval, index) => interval + (index % 2 ? 12 : 0)); return voiced.map((interval, index) => { const pitch = midiToPitch(root + interval); return { id: `${chord.id}-note-${index}`, chordId: chord.id, ...pitch, startBeat: chord.startBeat, durationBeats: chord.durationBeats, velocity, voice: 1 }; }); }
export function flattenMusicNotes(project: MusicProjectState): MusicalNote[] { if (!project.clips?.length) return project.notes; return project.clips.flatMap((clip) => { const timelineOffsetBeats = tempoMapSecondsToBeats(clip.timelineStartMs / 1000, project.tempoMap); return clip.notes.map((note) => ({ ...transposeNote(note, clip.transposeSemitones), startBeat: note.startBeat + clip.startBeat + timelineOffsetBeats })); }); }
export function defaultMusicProject(): MusicProjectState { return { version: 1, tuning: { concertPitchHz: 440, temperament: "12-TET" }, tempoMap: [{ beat: 0, bpm: 120 }], timeSignature: { numerator: 4, denominator: 4 }, key: { tonic: "C", accidental: "natural", scale: "major" }, notes: [], rests: [], chords: [], clips: [] }; }
export function quantizeNotes(notes: MusicalNote[], grid: 1 | 2 | 4 | 8 | 16 | 32, strength = 1): MusicalNote[] { return notes.map((note) => { const target = quantizeBeat(note.startBeat, grid); return { ...note, originalStartBeat: note.originalStartBeat ?? note.startBeat, startBeat: note.startBeat + (target - note.startBeat) * Math.max(0, Math.min(1, strength)) }; }); }
export function humanizeNotes(notes: MusicalNote[], timingBeats = 0.04, velocity = 8, seed = 1): MusicalNote[] { return notes.map((note, index) => { const random = Math.sin(seed * 12.9898 + index * 78.233) * 43758.5453; const unit = random - Math.floor(random); const timingOffset = (unit * 2 - 1) * Math.max(0, timingBeats); const velocityOffset = Math.round((unit * 2 - 1) * Math.max(0, velocity)); return { ...note, originalStartBeat: note.originalStartBeat ?? note.startBeat, originalVelocity: note.originalVelocity ?? note.velocity, startBeat: Math.max(0, note.startBeat + timingOffset), velocity: Math.max(1, Math.min(127, note.velocity + velocityOffset)) }; }); }
