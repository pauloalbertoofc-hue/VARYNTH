import { createAudioExportPlan } from "./audio-export-plan";
const state = { artifactId: "a", timeline: { durationMs: 10000, zoom: 1, markers: [], snapToGrid: true, timeUnit: "ms" as const }, tracks: [{ id: "t1", name: "T", type: "AUDIO" as const, muted: false, solo: false, volume: 1, pan: 0, clips: [{ id: "clip-1", assetId: "asset-1", trackId: "t1", timelineStartMs: 2000, sourceStartMs: 500, sourceEndMs: 2500, gain: 1 }], effects: [] }], selectedClipIds: [], playheadMs: 0, updatedAt: new Date().toISOString() };
if (createAudioExportPlan(state, { format: "WAV", target: { type: "SELECTED_REGION", startMs: 1000, endMs: 5000 } }).endMs !== 5000) throw new Error("Plano de região inválido");
let missingTrackRejected = false;
try { createAudioExportPlan(state, { format: "WAV", target: { type: "STEMS", trackIds: ["missing-track"] } }); } catch (error) { missingTrackRejected = error instanceof Error && error.message.includes("AUDIO_EXPORT_TRACK_NOT_FOUND"); }
if (!missingTrackRejected) throw new Error("Plano aceitou faixa inexistente");
let invalidRegionRejected = false;
try { createAudioExportPlan(state, { format: "WAV", target: { type: "SELECTED_REGION", startMs: 5000, endMs: 1000 } }); } catch (error) { invalidRegionRejected = error instanceof Error && error.message.includes("AUDIO_EXPORT_REGION_INVALID"); }
if (!invalidRegionRejected) throw new Error("Plano aceitou região invertida");
let emptyStemRejected = false;
try { createAudioExportPlan(state, { format: "WAV", target: { type: "STEMS", trackIds: [] } }); } catch (error) { emptyStemRejected = error instanceof Error && error.message.includes("AUDIO_EXPORT_TRACK_REQUIRED"); }
if (!emptyStemRejected) throw new Error("Plano aceitou seleção vazia de stems");
const selectedStems = createAudioExportPlan(state, { format: "WAV", target: { type: "STEMS", trackIds: ["t1"] } });
if (selectedStems.trackIds.length !== 1 || selectedStems.trackIds[0] !== "t1") throw new Error("Seleção explícita de stems não foi preservada");
const clipPlan = createAudioExportPlan(state, { format: "WAV", target: { type: "CLIP", clipId: "clip-1" } });
if (clipPlan.type !== "CLIP" || clipPlan.trackIds[0] !== "t1" || clipPlan.startMs !== 2000 || clipPlan.endMs !== 4000 || clipPlan.clipId !== "clip-1") throw new Error("Plano de exportação de clip inválido");
let missingClipRejected = false;
try { createAudioExportPlan(state, { format: "WAV", target: { type: "CLIP", clipId: "missing" } }); } catch (error) { missingClipRejected = error instanceof Error && error.message.includes("AUDIO_EXPORT_CLIP_NOT_FOUND"); }
if (!missingClipRejected) throw new Error("Plano aceitou clip inexistente");
console.log("Audio export plan tests passed: mix, region, track, stem and individual clip targets.");
