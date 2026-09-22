export type VoiceProcessingEffect = "EQ" | "De-esser" | "Compressor" | "Noise Gate" | "Gain";

export interface VoiceProcessingOptions {
  effects: VoiceProcessingEffect[];
  eqGainDb?: number;
  deEsserThreshold?: number;
  compressorThreshold?: number;
  compressorRatio?: number;
  gateThreshold?: number;
  gainDb?: number;
}

export interface ProcessedVoiceAudio {
  data: ArrayBuffer;
  sampleRate: number;
  channels: 1 | 2;
  samples: number;
}

function readText(view: DataView, offset: number, length: number): string { return String.fromCharCode(...Array.from({ length }, (_, index) => view.getUint8(offset + index))); }
function writeText(view: DataView, offset: number, value: string): void { for (let index = 0; index < value.length; index++) view.setUint8(offset + index, value.charCodeAt(index)); }
function finite(value: number | undefined, fallback: number): number { return Number.isFinite(value) ? value as number : fallback; }

function readPcm16(input: ArrayBuffer): { samples: Float32Array; sampleRate: number; channels: 1 | 2 } {
  const view = new DataView(input);
  if (input.byteLength < 44 || readText(view, 0, 4) !== "RIFF" || readText(view, 8, 4) !== "WAVE") throw new Error("[VOICE_PROCESSING_WAV_REQUIRED] O processamento vocal local requer WAV PCM 16-bit.");
  let format = 0; let channels = 0; let sampleRate = 0; let bits = 0; let dataOffset = -1; let dataLength = 0;
  let offset = 12;
  while (offset + 8 <= input.byteLength) {
    const id = readText(view, offset, 4); const length = view.getUint32(offset + 4, true); const body = offset + 8;
    if (id === "fmt ") { format = view.getUint16(body, true); channels = view.getUint16(body + 2, true); sampleRate = view.getUint32(body + 4, true); bits = view.getUint16(body + 14, true); }
    if (id === "data") { dataOffset = body; dataLength = Math.min(length, input.byteLength - body); break; }
    offset = body + length + (length % 2);
  }
  if (format !== 1 || (channels !== 1 && channels !== 2) || bits !== 16 || dataOffset < 0 || !sampleRate || dataLength % (channels * 2) !== 0) throw new Error("[VOICE_PROCESSING_PCM_UNSUPPORTED] WAV precisa ser PCM 16-bit mono ou estéreo válido.");
  const samples = new Float32Array(dataLength / 2);
  for (let index = 0; index < samples.length; index++) samples[index] = view.getInt16(dataOffset + index * 2, true) / 32768;
  return { samples, sampleRate, channels: channels as 1 | 2 };
}

function encodePcm16(samples: Float32Array, sampleRate: number, channels: 1 | 2): ArrayBuffer {
  const dataLength = samples.length * 2; const output = new ArrayBuffer(44 + dataLength); const view = new DataView(output);
  writeText(view, 0, "RIFF"); view.setUint32(4, 36 + dataLength, true); writeText(view, 8, "WAVEfmt "); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, channels, true); view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * channels * 2, true); view.setUint16(32, channels * 2, true); view.setUint16(34, 16, true); writeText(view, 36, "data"); view.setUint32(40, dataLength, true);
  for (let index = 0; index < samples.length; index++) view.setInt16(44 + index * 2, Math.round(Math.max(-1, Math.min(1, samples[index])) * 32767), true);
  return output;
}

export function processVoiceWav(input: ArrayBuffer, options: VoiceProcessingOptions): ProcessedVoiceAudio {
  const decoded = readPcm16(input); const samples = new Float32Array(decoded.samples); const effects = new Set(options.effects);
  const gain = Math.pow(10, (Math.max(-60, Math.min(24, finite(options.gainDb, 0))) / 20)) * (effects.has("EQ") ? Math.pow(10, (Math.max(-24, Math.min(24, finite(options.eqGainDb, 0))) / 20)) : 1);
  const gate = effects.has("Noise Gate") ? Math.max(0, Math.min(1, finite(options.gateThreshold, 0.015))) : 0;
  const deEsser = effects.has("De-esser") ? Math.max(0, Math.min(1, finite(options.deEsserThreshold, 0.45))) : 1;
  const threshold = Math.max(0.01, Math.min(1, finite(options.compressorThreshold, 0.7))); const ratio = Math.max(1, Math.min(20, finite(options.compressorRatio, 4)));
  for (let index = 0; index < samples.length; index++) {
    let value = samples[index] * gain;
    if (gate && Math.abs(value) < gate) value = 0;
    if (deEsser < 1 && Math.abs(value) > deEsser) value *= 0.82;
    if (effects.has("Compressor") && Math.abs(value) > threshold) { const sign = Math.sign(value); value = sign * (threshold + (Math.abs(value) - threshold) / ratio); }
    samples[index] = value;
  }
  return { data: encodePcm16(samples, decoded.sampleRate, decoded.channels), sampleRate: decoded.sampleRate, channels: decoded.channels, samples: samples.length / decoded.channels };
}
