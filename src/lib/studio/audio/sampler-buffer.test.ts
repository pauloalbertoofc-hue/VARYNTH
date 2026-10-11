import { prepareSamplerBuffer } from "./instrument-engine";
import { validateSamplerDefinition } from "./sampler-domain";

const sourceChannels = [Float32Array.from([0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7]), Float32Array.from([0, 0.2, 0.4, 0.6, 0.8, 1, 0.8, 0.6])];
const source = { numberOfChannels: 2, duration: 0.008, sampleRate: 1000, length: 8, getChannelData: (channel: number) => sourceChannels[channel] } as unknown as AudioBuffer;
const context = { createBuffer: (channels: number, length: number, sampleRate: number) => {
  const data = Array.from({ length: channels }, () => new Float32Array(length));
  return { numberOfChannels: channels, length, sampleRate, duration: length / sampleRate, getChannelData: (channel: number) => data[channel] } as unknown as AudioBuffer;
} } as unknown as BaseAudioContext;
const definition = validateSamplerDefinition({ id: "loop-test", name: "loop-test", assetId: "asset", rootMidi: 60, minMidi: 48, maxMidi: 72, gain: 1, loop: { startMs: 1, endMs: 7, crossfadeMs: 2, enabled: true }, envelope: { attackMs: 5, decayMs: 10, sustain: 0.8, releaseMs: 50 } });
const prepared = prepareSamplerBuffer(context, definition, source);
if (prepared.buffer === source || prepared.loopStart !== 0.003 || prepared.loopEnd !== 0.007) throw new Error("Loop com crossfade deve criar buffer editado em cópia e respeitar limites exatos.");
if (sourceChannels[0][0] !== 0 || Math.abs(sourceChannels[0][7] - 0.7) > 0.00001) throw new Error("Preparação de loop não pode alterar o buffer de origem.");
if (prepared.buffer.getChannelData(0)[0] !== sourceChannels[0][0]) throw new Error("Crossfade não deve alterar amostras fora da região de loop.");
let rejected = false;
try { prepareSamplerBuffer(context, definition, { ...source, duration: 0.004 } as AudioBuffer); } catch (error) { rejected = error instanceof Error && error.message.includes("SAMPLER_LOOP_OUT_OF_BOUNDS"); }
if (!rejected) throw new Error("Loop que excede duração medida deve falhar fechado.");
console.log("Sampler buffer tests passed: copied crossfade loop, exact bounds, source immutability and out-of-bounds rejection.");
