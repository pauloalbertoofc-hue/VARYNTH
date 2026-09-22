import { SynthPreset } from "./instrument-engine";

export const BUILTIN_SYNTH_PRESETS: Record<string, SynthPreset> = {
  Init: { oscillator: "sine", attack: 0.01, decay: 0.12, sustain: 0.65, release: 0.25, gain: 0.25, detune: 0, filterFrequency: 12000 },
  "Warm Pad": { oscillator: "triangle", attack: 0.18, decay: 0.5, sustain: 0.72, release: 0.8, gain: 0.22, detune: -4, filterFrequency: 4200, lfoRate: 0.22, lfoDepth: 0.35 },
  "Bright Lead": { oscillator: "sawtooth", attack: 0.005, decay: 0.16, sustain: 0.78, release: 0.2, gain: 0.18, detune: 3, filterFrequency: 9800 },
};

export function getSynthPreset(name: string): SynthPreset | undefined { const preset = BUILTIN_SYNTH_PRESETS[name]; return preset ? { ...preset } : undefined; }
export function diffSynthPresets(left: SynthPreset, right: SynthPreset): Array<{ key: keyof SynthPreset; left: SynthPreset[keyof SynthPreset]; right: SynthPreset[keyof SynthPreset] }> { return (Object.keys(left) as Array<keyof SynthPreset>).filter((key) => left[key] !== right[key]).map((key) => ({ key, left: left[key], right: right[key] })); }
export function parseSynthPresetBank(input: unknown): Array<{ name: string; createdAt: string; preset: SynthPreset }> {
  if (!input || typeof input !== "object" || (input as { schemaVersion?: unknown }).schemaVersion !== 1 || !Array.isArray((input as { versions?: unknown }).versions)) throw new Error("[SYNTH_PRESET_BANK_INVALID] Banco de presets inválido.");
  const versions = (input as { versions: unknown[] }).versions;
  return versions.map((item) => {
    if (!item || typeof item !== "object") throw new Error("[SYNTH_PRESET_VERSION_INVALID] Versão de preset inválida.");
    const value = item as { name?: unknown; createdAt?: unknown; preset?: Partial<SynthPreset> };
    const preset = value.preset;
    if (typeof value.name !== "string" || !value.name.trim() || typeof value.createdAt !== "string" || !preset || !["sine", "triangle", "square", "sawtooth"].includes(String(preset.oscillator))) throw new Error("[SYNTH_PRESET_VERSION_INVALID] Metadados ou waveform inválidos.");
    const numeric = [preset.attack, preset.decay, preset.sustain, preset.release, preset.gain, preset.detune, preset.filterFrequency, preset.lfoRate, preset.lfoDepth];
    if (numeric.some((value) => value !== undefined && !Number.isFinite(value))) throw new Error("[SYNTH_PRESET_VERSION_INVALID] Parâmetro não numérico.");
    return { name: value.name.trim(), createdAt: value.createdAt, preset: { ...BUILTIN_SYNTH_PRESETS.Init, ...preset } as SynthPreset };
  });
}
