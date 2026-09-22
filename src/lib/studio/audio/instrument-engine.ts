import { midiToFrequency } from "./music-domain";
import { SamplerDefinition, mapSamplerVoice, validateSamplerDefinition } from "./sampler-domain";

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

/** Plays a preloaded local AudioBuffer through the shared InstrumentEngine contract. */
export class LocalSamplerInstrument implements InstrumentEngine {
  private context: AudioContext | null;
  private output: GainNode | null;
  private buffer: AudioBuffer | null = null;
  private voices = new Map<number, { source: AudioBufferSourceNode; gain: GainNode; release: number }>();
  private oneShots = new Set<AudioBufferSourceNode>();
  private definition: SamplerDefinition;
  constructor(definition: SamplerDefinition, context?: AudioContext, destination?: AudioNode) { this.definition = validateSamplerDefinition(definition); this.context = context || (typeof window !== "undefined" && window.AudioContext ? new AudioContext() : null); this.output = this.context?.createGain() || null; this.output?.connect(destination || this.context?.destination || this.output); }
  loadBuffer(buffer: AudioBuffer): void { this.buffer = buffer; }
  triggerOneShot(velocity: number): void {
    if (!this.context || !this.output || !this.buffer) throw new Error("[SAMPLER_BUFFER_UNAVAILABLE] Carregue um asset de áudio antes de disparar o sampler.");
    const source = this.context.createBufferSource();
    const gain = this.context.createGain();
    source.buffer = this.buffer;
    source.loop = false;
    gain.gain.value = Math.min(1, this.definition.gain * Math.max(0, Math.min(127, velocity)) / 127);
    source.connect(gain).connect(this.output);
    this.oneShots.add(source);
    source.onended = () => { this.oneShots.delete(source); source.disconnect(); gain.disconnect(); };
    source.start();
  }
  noteOn(note: InstrumentNote): void { if (!this.context || !this.output || !this.buffer) return; this.noteOff(note.midi); const mapping = mapSamplerVoice(this.definition, note.midi); const now = this.context.currentTime; const source = this.context.createBufferSource(); const gain = this.context.createGain(); source.buffer = this.buffer; source.playbackRate.value = mapping.playbackRate; if (this.definition.loop?.enabled) { source.loop = true; source.loopStart = this.definition.loop.startMs / 1000; source.loopEnd = this.definition.loop.endMs / 1000; } source.connect(gain); gain.connect(this.output); const velocity = Math.max(0, Math.min(127, note.velocity)) / 127; const peak = Math.min(1, this.definition.gain * velocity); const attack = Math.max(0.001, this.definition.envelope.attackMs / 1000); const decay = Math.max(0, this.definition.envelope.decayMs / 1000); gain.gain.setValueAtTime(0.0001, now); gain.gain.linearRampToValueAtTime(peak, now + attack); gain.gain.linearRampToValueAtTime(peak * this.definition.envelope.sustain, now + attack + decay); source.start(now); this.voices.set(note.midi, { source, gain, release: Math.max(0.01, this.definition.envelope.releaseMs / 1000) }); }
  noteOff(midi: number): void { const voice = this.voices.get(midi); if (!voice || !this.context) return; const now = this.context.currentTime; voice.gain.gain.cancelScheduledValues(now); voice.gain.gain.setValueAtTime(Math.max(0.0001, voice.gain.gain.value), now); voice.gain.gain.linearRampToValueAtTime(0.0001, now + voice.release); voice.source.stop(now + voice.release + 0.02); this.voices.delete(midi); }
  setParameter(name: keyof SynthPreset, value: number | OscillatorType): void { if (name === "gain") this.definition = { ...this.definition, gain: Math.max(0, Number(value)) }; }
  loadPreset(preset: Partial<SynthPreset>): void { if (typeof preset.gain === "number") this.definition = { ...this.definition, gain: Math.max(0, preset.gain) }; }
  dispose(): void { for (const midi of [...this.voices.keys()]) this.noteOff(midi); for (const source of this.oneShots) { try { source.stop(); } catch {} } this.oneShots.clear(); this.output?.disconnect(); this.output = null; }
}
