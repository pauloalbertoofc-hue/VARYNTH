import { mapSamplerVoice, validateSamplerDefinition } from "./sampler-domain";
const sampler = validateSamplerDefinition({ id: "sampler-1", name: "Taça", assetId: "asset-glass", rootMidi: 60, minMidi: 48, maxMidi: 72, gain: 0.8, loop: { startMs: 100, endMs: 500, crossfadeMs: 20, enabled: true }, envelope: { attackMs: 10, decayMs: 80, sustain: 0.7, releaseMs: 150 } });
const mapped = mapSamplerVoice(sampler, 72);
if (mapped.midi !== 72 || Math.abs(mapped.playbackRate - 2) > 0.0001 || mapped.cents !== 1200) throw new Error("Mapeamento de sampler não transpôs uma oitava corretamente.");
if (mapSamplerVoice(sampler, 100).midi !== 72 || sampler.loop?.crossfadeMs !== 20) throw new Error("Faixa ou loop do sampler não foram preservados.");
let rejected = false; try { validateSamplerDefinition({ id: "bad", name: "bad", assetId: "asset", rootMidi: 60, loop: { startMs: 4, endMs: 2, enabled: true } }); } catch (error) { rejected = error instanceof Error && error.message.includes("SAMPLER_LOOP_INVALID"); }
if (!rejected) throw new Error("Sampler deveria rejeitar loop invertido.");
console.log("Sampler domain tests passed: serializable mapping, range clamping and fail-closed loop validation.");
