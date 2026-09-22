import { createDrumPattern, drumPatternToNotes, resolveDrumSampler, shouldTrigger, stepTimeBeats } from "./drum-sequencer-domain";

const pattern = createDrumPattern({ id: "beat-1", name: "Beat", steps: 4, subdivision: 16, swing: 0.25, lanes: { kick: [{ active: true, velocity: 140, probability: 1, microtimingMs: -4 }] } } as never);
if (pattern.steps !== 4 || pattern.lanes.kick.length !== 4 || pattern.lanes.kick[0].velocity !== 127) throw new Error("Drum pattern deve normalizar passos e velocity.");
if (stepTimeBeats(2, pattern) !== 0.5) throw new Error("Conversão de passo para beat inválida.");
if (!shouldTrigger(pattern.lanes.kick[0], 0.5) || shouldTrigger({ ...pattern.lanes.kick[0], probability: 0.2 }, 0.5) || shouldTrigger({ ...pattern.lanes.kick[0], probability: 0 }, 0)) throw new Error("Probabilidade de disparo inválida.");
const converted = drumPatternToNotes({ ...pattern, lanes: { ...pattern.lanes, kick: [{ ...pattern.lanes.kick[0], microtimingMs: 4 }] } }, [{ beat: 0, bpm: 60 }]);
if (converted.length !== 1 || converted[0].pitch !== "C" || converted[0].octave !== 2 || converted[0].drum?.lane !== "kick" || Math.abs(converted[0].startBeat - 0.004) > 0.0001) throw new Error("Conversão de padrão para notas falhou: MIDI, proveniência ou microtiming.");
const sampler = { id: "kick-sample", name: "Kick", assetId: "asset-kick", rootMidi: 36, minMidi: 0, maxMidi: 127, gain: 1, envelope: { attackMs: 1, decayMs: 10, sustain: 0.8, releaseMs: 20 } };
const mapped = createDrumPattern({ ...pattern, laneSamplers: { kick: sampler.id } });
if (resolveDrumSampler(mapped, [sampler], "kick").assetId !== sampler.assetId) throw new Error("Resolução do sample da lane falhou.");
let unassignedError = ""; try { resolveDrumSampler(pattern, [sampler], "kick"); } catch (error) { unassignedError = error instanceof Error ? error.message : ""; }
if (!unassignedError.includes("DRUM_SAMPLE_UNASSIGNED")) throw new Error("Lane sem sample deve falhar com erro específico.");
console.log("Drum sequencer tests passed: normalization, timing and probability.");
