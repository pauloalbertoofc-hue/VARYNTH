import { processVoiceWav } from "./voice-processing";

function fixture(): ArrayBuffer { const samples = new Int16Array([30000, 12000, 30000, 12000]); const output = new ArrayBuffer(44 + samples.byteLength); const view = new DataView(output); const text = (at: number, value: string) => [...value].forEach((char, index) => view.setUint8(at + index, char.charCodeAt(0))); text(0, "RIFF"); view.setUint32(4, output.byteLength - 8, true); text(8, "WAVEfmt "); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, 8000, true); view.setUint32(28, 16000, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true); text(36, "data"); view.setUint32(40, samples.byteLength, true); samples.forEach((sample, index) => view.setInt16(44 + index * 2, sample, true)); return output; }
const result = processVoiceWav(fixture(), { effects: ["Noise Gate", "Compressor", "Gain"], gateThreshold: 0.1, compressorThreshold: 0.5, compressorRatio: 4, gainDb: -3 });
if (result.sampleRate !== 8000 || result.channels !== 1 || result.samples !== 4 || result.data.byteLength !== 52) throw new Error("Processamento vocal local perdeu metadados ou duração.");
const processed = new DataView(result.data); if (processed.getInt16(44, true) >= 30000) throw new Error("Cadeia vocal local não aplicou compressor/gain.");
const safe = processVoiceWav(fixture(), { effects: ["Gain"], gainDb: Number.NaN });
if (new Uint8Array(safe.data).some((value) => Number.isNaN(value))) throw new Error("Parâmetro inválido não pode produzir bytes inválidos.");
let rejected = false; try { processVoiceWav(new ArrayBuffer(4), { effects: [] }); } catch (error) { rejected = error instanceof Error && error.message.includes("VOICE_PROCESSING_WAV_REQUIRED"); }
if (!rejected) throw new Error("Processamento vocal deve rejeitar bytes que não sejam WAV.");
console.log("Voice processing tests passed: deterministic local PCM chain, metadata and fail-closed validation.");
