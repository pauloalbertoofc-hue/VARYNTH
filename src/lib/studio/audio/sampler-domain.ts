export interface SamplerLoop { startMs: number; endMs: number; crossfadeMs: number; enabled: boolean; }
export interface SamplerEnvelope { attackMs: number; decayMs: number; sustain: number; releaseMs: number; }
export interface SamplerDefinition { id: string; name: string; assetId: string; rootMidi: number; minMidi: number; maxMidi: number; gain: number; loop?: SamplerLoop; envelope: SamplerEnvelope; filter?: { type: "lowpass" | "highpass"; frequencyHz: number; q: number }; }
export interface SamplerVoiceMapping { sourceAssetId: string; midi: number; playbackRate: number; cents: number; }

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const finite = (value: unknown, fallback: number) => Number.isFinite(Number(value)) ? Number(value) : fallback;

export function validateSamplerDefinition(input: unknown): SamplerDefinition {
  if (!input || typeof input !== "object") throw new Error("[SAMPLER_DEFINITION_INVALID] Definição de sampler inválida.");
  const source = input as Partial<SamplerDefinition>;
  if (typeof source.id !== "string" || !source.id.trim() || typeof source.name !== "string" || !source.name.trim() || typeof source.assetId !== "string" || !source.assetId.trim()) throw new Error("[SAMPLER_REQUIRED_FIELDS] Sampler precisa de id, nome e assetId.");
  const rootMidi = clamp(Math.round(finite(source.rootMidi, 60)), 0, 127); const minMidi = clamp(Math.round(finite(source.minMidi, 0)), 0, rootMidi); const maxMidi = clamp(Math.round(finite(source.maxMidi, 127)), rootMidi, 127);
  const envelope = source.envelope || {} as SamplerEnvelope; const loop = source.loop;
  const normalizedLoop = loop ? { startMs: Math.max(0, finite(loop.startMs, 0)), endMs: Math.max(0, finite(loop.endMs, 0)), crossfadeMs: Math.max(0, finite(loop.crossfadeMs, 0)), enabled: loop.enabled === true } : undefined;
  if (normalizedLoop && normalizedLoop.enabled && normalizedLoop.endMs <= normalizedLoop.startMs) throw new Error("[SAMPLER_LOOP_INVALID] O fim do loop deve ser maior que o início.");
  const filter = source.filter ? { type: source.filter.type === "highpass" ? "highpass" as const : "lowpass" as const, frequencyHz: clamp(finite(source.filter.frequencyHz, 12000), 20, 24000), q: clamp(finite(source.filter.q, 0.707), 0.01, 20) } : undefined;
  return { id: source.id.trim(), name: source.name.trim(), assetId: source.assetId.trim(), rootMidi, minMidi, maxMidi, gain: clamp(finite(source.gain, 1), 0, 2), loop: normalizedLoop, envelope: { attackMs: Math.max(0, finite(envelope.attackMs, 5)), decayMs: Math.max(0, finite(envelope.decayMs, 80)), sustain: clamp(finite(envelope.sustain, 0.8), 0, 1), releaseMs: Math.max(0, finite(envelope.releaseMs, 120)) }, filter };
}

export function mapSamplerVoice(definition: SamplerDefinition, midi: number): SamplerVoiceMapping {
  const validated = validateSamplerDefinition(definition); const target = clamp(Math.round(finite(midi, validated.rootMidi)), validated.minMidi, validated.maxMidi); const semitones = target - validated.rootMidi;
  return { sourceAssetId: validated.assetId, midi: target, playbackRate: Math.pow(2, semitones / 12), cents: semitones * 100 };
}
