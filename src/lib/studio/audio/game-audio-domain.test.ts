import { assignVariationGroup, audioEventConditionsPass, buildGameAudioPackage, createGameAudioPackage, parseGameAudioPackage, parseGameAudioTags, selectVariation, selectVariationSequence, validateGameAudioPackage, validateLoop } from "./game-audio-domain";
import { AudioTrack } from "./types";

if (!validateLoop({ startMs: 1000, endMs: 5000, crossfadeMs: 200, loopable: true }, 10000).valid) throw new Error("Loop válido rejeitado");
if (validateLoop({ startMs: 0, endMs: 12000, crossfadeMs: 7000, loopable: true }, 10000).valid) throw new Error("Loop inválido aceito");
const group = { id: "steps", name: "Footsteps", category: "Footstep", seed: 4, variations: [{ id: "1", assetId: "a", weight: 1, tags: ["grass"] }, { id: "2", assetId: "b", weight: 3, tags: ["gravel"] }] };
if (!selectVariation(group)?.assetId || selectVariation(group, 9)?.assetId !== selectVariation(group, 9)?.assetId) throw new Error("Variação determinística inválida");
const sequence = selectVariationSequence(group, 12, 9); if (sequence.length !== 12 || sequence.some((variation, index) => variation.id === sequence[index - 1]?.id)) throw new Error("Sequenciamento de variações deve ser determinístico e evitar repetição imediata.");
if (!audioEventConditionsPass([{ variableId: "weather", operator: "EQUALS", value: "rain" }, { variableId: "danger", operator: "GREATER_THAN", value: 2 }], { weather: "rain", danger: 3 }) || audioEventConditionsPass([{ variableId: "weather", operator: "EQUALS", value: "rain" }], { weather: "clear" })) throw new Error("Condições de evento não foram avaliadas fail-closed corretamente.");
if (parseGameAudioTags("Metal, bright; metal |  Grass ").join("|") !== "Metal|bright|Grass") throw new Error("Project variation tags must be trimmed and deduplicated case-insensitively");
const distributionGroup = { ...group, variations: [{ id: "light", assetId: "a", weight: 1, tags: [] }, { id: "heavy", assetId: "b", weight: 3, tags: [] }, { id: "disabled", assetId: "c", weight: 0, tags: [] }] };
let lightSelections = 0;
let heavySelections = 0;
for (let seed = 1; seed <= 20_000; seed++) {
  const selected = selectVariation(distributionGroup, seed)?.id;
  if (selected === "light") lightSelections++;
  else if (selected === "heavy") heavySelections++;
  else throw new Error("A variação de peso zero não pode ser selecionada.");
}
const lightRatio = lightSelections / 20_000;
if (Math.abs(lightRatio - 0.25) > 0.015 || lightSelections + heavySelections !== 20_000) throw new Error(`Distribuição ponderada fora da tolerância em 20 mil seleções: ${lightRatio}.`);
if (createGameAudioPackage("Demo", [], [group], []).version !== 1) throw new Error("Compatibilidade do formato v1 quebrada");

const track = (id: string, assetId: string, name: string, loop = false): AudioTrack => ({ id, name, type: "SFX", muted: false, solo: false, volume: 1, pan: 0, effects: [], clips: [{ id: `clip-${id}`, assetId, trackId: id, name, timelineStartMs: 0, sourceStartMs: 100, sourceEndMs: 900, gain: 0.8, playbackRate: 1.05, loop: loop ? { enabled: true, startMs: 100, endMs: 900, crossfadeMs: 100 } : undefined } as never] });
const assets = [
  { id: "a", name: "Grass step.wav", mimeType: "audio/wav", sizeBytes: 100, storageType: "INDEXEDDB_BLOB" as const, storageKey: "a", createdAt: "", createdBy: "USER" as const, artifactIds: ["p"], metadata: { durationMs: 1000, tags: ["grass", "footstep"], license: "CC0", source: "recorded" } },
  { id: "b", name: "Gravel step.wav", mimeType: "audio/wav", sizeBytes: 100, storageType: "INDEXEDDB_BLOB" as const, storageKey: "b", createdAt: "", createdBy: "USER" as const, artifactIds: ["p"], metadata: { durationMs: 1000, tags: ["gravel", "footstep"], license: "CC0", source: "recorded" } },
];
const groupedTracks = [track("footsteps", "a", "Grass", true), track("footsteps-2", "b", "Gravel")].map((item) => ({ ...item, variationGroup: "steps" }));
const reassigned = assignVariationGroup(groupedTracks, [groupedTracks[0]!.id], "footsteps-new");
if (reassigned[0]?.variationGroup !== "footsteps-new" || reassigned[1]?.variationGroup !== "steps" || groupedTracks[0]?.variationGroup !== "steps") throw new Error("Variation-group assignment must be scoped and immutable");
const weightedTrack = { ...groupedTracks[0]!, variationSeed: 19, clips: groupedTracks[0]!.clips.map((clip) => ({ ...clip, variationWeight: 3.5, gameAudioTags: ["Metal", "Bright", "metal"], gameAudioVolumeRange: [0.4, 0.9] as [number, number], gameAudioPitchRange: [0.8, 1.2] as [number, number] })) };
const weightedPackage = buildGameAudioPackage("Game", [weightedTrack], [], assets);
if (weightedPackage.variationGroups[0]?.seed !== 19 || weightedPackage.variationGroups[0]?.variations[0]?.weight !== 3.5) throw new Error("Project-scoped variation seed and weight must be serialized");
if (weightedPackage.events[0]?.volumeRange.join() !== "0.4,0.9" || weightedPackage.events[0]?.pitchRange.join() !== "0.8,1.2") throw new Error("Audio event randomization ranges must be serialized");
if (!weightedPackage.variationGroups[0]?.variations[0]?.tags.includes("Metal") || weightedPackage.variationGroups[0]?.variations[0]?.tags.filter((tag) => tag.toLowerCase() === "metal").length !== 1) throw new Error("Clip-scoped variation tags must merge into export without duplicates");
if (!weightedPackage.assets[0]?.tags.includes("Metal") || assets[0]?.metadata.tags?.includes("Metal")) throw new Error("Clip tags must export but never mutate shared asset metadata");
const pack = buildGameAudioPackage("Game", groupedTracks, [], assets);
if (pack.assets.length !== 2 || pack.events.length !== 2 || pack.variationGroups[0]?.variations.length !== 2) throw new Error("Package must include deduplicated assets, derived variation group and one event per clip");
if (pack.assets[0].provenance?.license !== "CC0" || !pack.assets[0].tags.includes("grass")) throw new Error("Asset license/provenance/tags were not carried into package");
if (!pack.events.find((event) => event.clipId === "clip-footsteps")?.loop || pack.events[0].trigger !== "PLAY") throw new Error("Timeline clip loop and explicit event trigger were not serialized");
if (validateGameAudioPackage(pack, new Set(["a", "b"])).length) throw new Error("A complete game-audio package should validate");
if (!parseGameAudioPackage(JSON.parse(JSON.stringify(pack)), new Set(["a", "b"])).package) throw new Error("Serialized v1 package must be safely importable");
const spatialTrack = { ...track("spatial", "a", "Spatial"), clips: track("spatial", "a", "Spatial").clips.map((clip) => ({ ...clip, spatial: { x: 2.5, y: -1, z: 4, refDistance: 2, maxDistance: 80, rolloffFactor: 1.5 } })) };
const spatialPackage = buildGameAudioPackage("Spatial", [spatialTrack], [], assets);
const spatialEvent = spatialPackage.events[0]?.spatial;
if (!spatialEvent || spatialEvent.x !== 2.5 || spatialEvent.y !== -1 || spatialEvent.z !== 4 || spatialEvent.maxDistance !== 80 || parseGameAudioPackage(JSON.parse(JSON.stringify(spatialPackage)), new Set(["a"])).package?.events[0]?.spatial?.rolloffFactor !== 1.5) throw new Error("Spatial audio metadata was not preserved through Game Audio JSON roundtrip");
const invalidSpatial = { ...spatialPackage, events: spatialPackage.events.map((event) => ({ ...event, spatial: { ...event.spatial!, refDistance: 100, maxDistance: 2, rolloffFactor: -1 } })) };
if (!validateGameAudioPackage(invalidSpatial, new Set(["a"])).some((issue) => issue.code === "GAME_AUDIO_SPATIAL_INVALID")) throw new Error("Invalid spatial package was not rejected");
if (!parseGameAudioPackage({ version: 2, assets: [], events: [], variationGroups: [] }).issues.length || !parseGameAudioPackage({ version: 1, name: "broken", assets: [null], events: [], variationGroups: [] }).issues.length) throw new Error("Untrusted package schemas must fail closed rather than throw");
if (validateGameAudioPackage(pack, new Set(["a"])).every((issue) => issue.code !== "GAME_AUDIO_ASSET_MISSING")) throw new Error("Missing source asset must fail package validation");

const invalid = createGameAudioPackage("Broken", [{ assetId: "a", category: "SFX", tags: [], durationMs: 1000 }], [{ id: "g", name: "Empty weights", category: "SFX", variations: [{ id: "v", assetId: "outside", weight: 0, tags: [] }] }], [{ id: "evt", name: "Broken event", variationGroupId: "missing", assetIds: ["outside"], volumeRange: [-1, 0.5], pitchRange: [2, 1] }]);
const issueCodes = new Set(validateGameAudioPackage(invalid).map((issue) => issue.code));
for (const code of ["GAME_AUDIO_VARIATION_ASSET_MISSING", "GAME_AUDIO_VARIATION_WEIGHTS_ZERO", "GAME_AUDIO_EVENT_GROUP_MISSING", "GAME_AUDIO_EVENT_ASSET_MISSING", "GAME_AUDIO_EVENT_RANGE_INVALID"]) if (!issueCodes.has(code)) throw new Error(`Expected package issue ${code}`);
const excessiveRange = createGameAudioPackage("Range", [], [], [{ id: "too-loud", name: "Too loud", assetIds: [], volumeRange: [0, 5], pitchRange: [1, 1] }]);
if (!validateGameAudioPackage(excessiveRange).some((issue) => issue.code === "GAME_AUDIO_EVENT_RANGE_INVALID")) throw new Error("Out-of-policy event randomization must fail closed");

if (buildGameAudioPackage("Game", [track("dup", "a", "A"), track("dup2", "a", "A2")], [], assets).assets.length !== 1) throw new Error("Builder must deduplicate source assets");
console.log("Game audio domain tests passed: package provenance/events, weighted variations, loops, compatibility and fail-closed validation.");
