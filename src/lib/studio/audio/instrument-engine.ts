import { midiToFrequency } from "./music-domain";

export interface InstrumentNote { midi: number; velocity: number; concertPitchHz?: number; articulation?: "normal" | "legato" | "staccato" | "accent" | "tenuto" | "sustain"; expression?: number; }
export interface SynthPreset { oscillator: OscillatorType; attack: number; decay: number; sustain: number; release: number; gain: number; detune: number; filterFrequency?: number; lfoRate?: number; lfoDepth?: number; }
export interface InstrumentEngine { noteOn(note: InstrumentNote): void; noteOff(midi: number): void; setParameter(name: keyof SynthPreset, value: number | OscillatorType): void; loadPreset(preset: Partial<SynthPreset>): void; setSustain?(enabled: boolean): void; setPitchBend?(semitones: number): void; dispose(): void; }

const DEFAULT_PRESET: SynthPreset = { oscillator: "sine", attack: 0.01, decay: 0.12, sustain: 0.65, release: 0.25, gain: 0.25, detune: 0, filterFrequency: 12000, lfoRate: 0, lfoDepth: 0 };

export class LocalSynthInstrument implements InstrumentEngine {
  private context: AudioContext | null = null;
  private output: GainNode | null = null;
  private active = new Map<number, { oscillator: OscillatorNode; gain: GainNode; concertPitchHz: number; release: number; lfo?: OscillatorNode; lfoGain?: GainNode }>();
  private sustained = new Set<number>();
  private sustain = false;
  private pitchBendSemitones = 0;
  private preset: SynthPreset = { ...DEFAULT_PRESET };

  constructor(context?: AudioContext, destination?: AudioNode) { this.context = context || (typeof window !== "undefined" && window.AudioContext ? new AudioContext() : null); if (this.context) { this.output = this.context.createGain(); this.output.gain.value = 1; this.output.connect(destination || this.context.destination); } }
  noteOn(note: InstrumentNote): void { if (!this.context || !this.output) return; this.noteOff(note.midi); const now = this.context.currentTime; const oscillator = this.context.createOscillator(); const gain = this.context.createGain(); const articulation = note.articulation || "normal"; const velocity = Math.max(0, Math.min(127, note.velocity)) / 127; const expression = Math.max(0, Math.min(1, (note.expression ?? 1))); const accent = articulation === "accent" ? 1.2 : 1; const peak = Math.min(1, this.preset.gain * velocity * expression * accent); const attack = this.preset.attack * (articulation === "legato" ? 0.5 : 1); const release = this.preset.release * (articulation === "staccato" ? 0.25 : articulation === "tenuto" || articulation === "sustain" ? 1.35 : 1); const concertPitchHz = note.concertPitchHz ?? 440; oscillator.type = this.preset.oscillator; oscillator.frequency.value = midiToFrequency(note.midi, concertPitchHz) * Math.pow(2, (this.preset.detune + this.pitchBendSemitones * 100) / 1200); let lfo: OscillatorNode | undefined; let lfoGain: GainNode | undefined; if (this.preset.filterFrequency) { const filter = this.context.createBiquadFilter(); filter.type = "lowpass"; filter.frequency.value = this.preset.filterFrequency; oscillator.connect(filter); filter.connect(gain); const rate = Math.max(0, this.preset.lfoRate ?? 0); const depth = Math.max(0, Math.min(1, this.preset.lfoDepth ?? 0)); if (rate > 0 && depth > 0) { lfo = this.context.createOscillator(); lfoGain = this.context.createGain(); lfo.type = "sine"; lfo.frequency.value = rate; lfoGain.gain.value = this.preset.filterFrequency * depth; lfo.connect(lfoGain); lfoGain.connect(filter.frequency); lfo.start(now); } } else oscillator.connect(gain); gain.connect(this.output); gain.gain.setValueAtTime(0.0001, now); gain.gain.linearRampToValueAtTime(peak, now + Math.max(0.001, attack)); gain.gain.linearRampToValueAtTime(peak * this.preset.sustain, now + attack + this.preset.decay); oscillator.start(now); this.active.set(note.midi, { oscillator, gain, concertPitchHz, release, lfo, lfoGain }); }
  noteOff(midi: number): void { if (this.sustain) { this.sustained.add(midi); return; } this.releaseNote(midi); }
  private releaseNote(midi: number): void { const voice = this.active.get(midi); if (!voice || !this.context) return; const now = this.context.currentTime; const release = Math.max(0.01, voice.release); const stopAt = now + release + 0.02; voice.gain.gain.cancelScheduledValues(now); voice.gain.gain.setValueAtTime(Math.max(0.0001, voice.gain.gain.value), now); voice.gain.gain.linearRampToValueAtTime(0.0001, now + release); voice.oscillator.stop(stopAt); voice.lfo?.stop(stopAt); this.active.delete(midi); this.sustained.delete(midi); }
  setSustain(enabled: boolean): void { this.sustain = enabled; if (!enabled) for (const midi of [...this.sustained]) this.releaseNote(midi); }
  setPitchBend(semitones: number): void { this.pitchBendSemitones = Math.max(-2, Math.min(2, semitones)); for (const [midi, voice] of this.active) voice.oscillator.frequency.value = midiToFrequency(midi, voice.concertPitchHz) * Math.pow(2, (this.preset.detune + this.pitchBendSemitones * 100) / 1200); }
  setParameter(name: keyof SynthPreset, value: number | OscillatorType): void { this.preset[name] = value as never; }
  loadPreset(preset: Partial<SynthPreset>): void { this.preset = { ...this.preset, ...preset }; }
  dispose(): void { for (const midi of this.active.keys()) this.noteOff(midi); this.output?.disconnect(); this.output = null; }
}

export function createLocalSynthInstrument(context?: AudioContext, destination?: AudioNode): LocalSynthInstrument { return new LocalSynthInstrument(context, destination); }
