import { BUILTIN_SYNTH_PRESETS, getSynthPreset, parseSynthPresetBank } from "./synth-presets";
for (const [name, preset] of Object.entries(BUILTIN_SYNTH_PRESETS)) { if (!preset.oscillator || preset.attack < 0 || preset.release <= 0) throw new Error(`Preset inválido: ${name}`); }
const copy = getSynthPreset("Warm Pad"); if (!copy || copy.oscillator !== "triangle") throw new Error("Preset Warm Pad ausente");
if (copy === BUILTIN_SYNTH_PRESETS["Warm Pad"]) throw new Error("Preset deve ser copiado antes de editar");
const parsed = parseSynthPresetBank({ schemaVersion: 1, versions: [{ name: "Imported", createdAt: "2026-09-21T00:00:00.000Z", preset: { oscillator: "square", attack: 0.1 } }] }); if (parsed[0].preset.release !== BUILTIN_SYNTH_PRESETS.Init.release) throw new Error("Importação não aplicou defaults compatíveis");
let rejected = false; try { parseSynthPresetBank({ schemaVersion: 2, versions: [] }); } catch { rejected = true; } if (!rejected) throw new Error("Schema inválido não foi rejeitado");
console.log("Synth preset tests passed: built-ins, validation and copy isolation.");
