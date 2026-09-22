import { createDrumPattern, shouldTrigger, stepTimeBeats } from "./drum-sequencer-domain";

const pattern = createDrumPattern({ id: "beat-1", name: "Beat", steps: 4, subdivision: 16, swing: 0.25, lanes: { kick: [{ active: true, velocity: 140, probability: 1, microtimingMs: -4 }] } } as never);
if (pattern.steps !== 4 || pattern.lanes.kick.length !== 4 || pattern.lanes.kick[0].velocity !== 127) throw new Error("Drum pattern deve normalizar passos e velocity.");
if (stepTimeBeats(2, pattern) !== 0.5) throw new Error("Conversão de passo para beat inválida.");
if (!shouldTrigger(pattern.lanes.kick[0], 0.5) || shouldTrigger({ ...pattern.lanes.kick[0], probability: 0.2 }, 0.5)) throw new Error("Probabilidade de disparo inválida.");
console.log("Drum sequencer tests passed: normalization, timing and probability.");
