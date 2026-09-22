import { generateProceduralAmbience } from "./procedural-ambience";
const first = generateProceduralAmbience({ kind: "rain", durationSeconds: 0.1, intensity: 0.6, density: 0.4, distance: 0.2, seed: 42 });
const second = generateProceduralAmbience({ kind: "rain", durationSeconds: 0.1, intensity: 0.6, density: 0.4, distance: 0.2, seed: 42 });
const a = new Uint8Array(first.data); const b = new Uint8Array(second.data);
if (a.length !== 19244 || a.length !== b.length || a.some((value, index) => value !== b[index]) || new DataView(first.data).getUint32(0, false) !== 0x52494646 || new DataView(first.data).getUint16(22, true) !== 2) throw new Error("Ambience procedural não é determinístico ou não gerou WAV estéreo válido.");
for (const kind of ["rain", "wind", "forest"] as const) { const generated = generateProceduralAmbience({ kind, durationSeconds: 0.05, intensity: 0.5, density: 0.5, distance: 0 }); if (generated.seed !== kind.length * 997 + 50 + 16) throw new Error(`Seed padrão inválida para ${kind}.`); }
let rejected = false; try { generateProceduralAmbience({ kind: "rain", durationSeconds: 0, intensity: 0.5, density: 0.5, distance: 0 }); } catch { rejected = true; }
if (!rejected) throw new Error("Duração inválida de ambience deveria falhar fechada.");
console.log("Procedural ambience tests passed: deterministic WAV, stereo metadata, seeds and fail-closed bounds.");
