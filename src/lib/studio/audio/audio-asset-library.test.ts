import { AssetFile } from "../../artifacts/types";
import { applyAudioProjectMetadata, audioAssetCategories, getAudioAssetFacets, searchAudioAssets } from "./audio-asset-library";

function asset(overrides: Partial<AssetFile>): AssetFile { return { id: "asset", name: "rain-forest.wav", mimeType: "audio/wav", sizeBytes: 128, storageType: "INDEXEDDB_BLOB", storageKey: "blob-asset", createdAt: "2026-09-21T00:00:00.000Z", createdBy: "USER", artifactIds: ["project"], metadata: { tags: ["rain", "forest"], category: "Ambience", durationMs: 8000, bpm: 120, key: "C minor", loopable: true, characterId: "euterpe", isSource: true }, ...overrides }; }
const ambient = asset({ id: "rain", name: "Rain forest.wav", metadata: { tags: ["rain", "forest"], category: "Ambience", durationMs: 8000, sampleRate: 48000, channels: 2, bpm: 120, key: "C minor", loopable: true, characterId: "euterpe", isSource: true } });
const voice = asset({ id: "voice", name: "Euterpe Happy 120 BPM.wav", metadata: { tags: ["dialogue", "happy"], characterId: "Euterpe", bpm: 120, key: "C minor", provider: "local-fixture", generationMetadata: { model: "test" } } });
const incomplete = asset({ id: "unknown", name: "untagged.wav", metadata: {} });
const all = [ambient, voice, incomplete];
if (!audioAssetCategories(ambient).includes("Imported") || !audioAssetCategories(ambient).includes("Loop")) throw new Error("Imported/Loop categories should be inferred only from stored metadata");
if (searchAudioAssets(all, { query: "Euterpe happy 120 BPM" }).map((item) => item.id).join() !== "voice") throw new Error("Token search should combine filename and real metadata facets");
if (searchAudioAssets(all, { category: "generated", character: "euterpe", bpm: "120", key: "c minor" }).map((item) => item.id).join() !== "voice") throw new Error("Exact metadata filters should be case-insensitive");
if (searchAudioAssets(all, { tag: "RAIN", category: "ambience" }).map((item) => item.id).join() !== "rain") throw new Error("Tag/category filters should match metadata without mutating assets");
const facets = getAudioAssetFacets(all);
if (!facets.categories.includes("Generated") || !facets.categories.includes("Imported") || !facets.tags.includes("happy") || facets.bpms.join() !== "120") throw new Error("Asset facets should reflect available metadata and omit unknown values");
if (searchAudioAssets(all, { query: "missing" }).length !== 0 || searchAudioAssets(all, {}).length !== 3) throw new Error("Empty and unmatched library searches should be deterministic");
if (searchAudioAssets(all, { minDurationMs: 7000, maxDurationMs: 9000, sampleRate: "48000", channels: "2" }).map((item) => item.id).join() !== "rain") throw new Error("Technical audio filters must compose with duration range and exact sample-rate/channel facts");
if (searchAudioAssets(all, { minDurationMs: 1 }).some((item) => item.id === "unknown")) throw new Error("Unknown duration must not pass an explicit duration filter");
const projectView = applyAudioProjectMetadata(ambient, { category: "Field Recording", tags: ["storm"], licenseClaim: "CC0", attribution: "Archive A" });
if (projectView.metadata?.category !== "Field Recording" || JSON.stringify(projectView.metadata?.tags) !== JSON.stringify(["storm"]) || ambient.metadata?.category !== "Ambience" || JSON.stringify(ambient.metadata?.tags) !== JSON.stringify(["rain", "forest"]) || projectView.metadata?.license !== undefined || projectView.metadata?.projectLicenseClaim !== "CC0") throw new Error("Project editorial metadata must be isolated from shared asset facts and source-license provenance");
const facetsWithTechnical = getAudioAssetFacets(all);
if (facetsWithTechnical.sampleRates.join() !== "48000" || facetsWithTechnical.channels.join() !== "2") throw new Error("Technical facets must include only measured sample rates/channel counts");
console.log("Audio asset library tests passed: token search, project-isolated metadata, technical duration/rate/channel filters and measured-data facets.");
