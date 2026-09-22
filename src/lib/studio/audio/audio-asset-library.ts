import { AssetFile } from "../../artifacts/types";
import { AudioAssetProjectMetadata } from "./types";

export interface AudioAssetLibraryFilters {
  query?: string;
  category?: string;
  tag?: string;
  character?: string;
  bpm?: string;
  key?: string;
  minDurationMs?: number;
  maxDurationMs?: number;
  sampleRate?: string;
  channels?: string;
}

function text(value: unknown): string { return typeof value === "string" || typeof value === "number" ? String(value).trim() : ""; }
function list(value: unknown): string[] { return Array.isArray(value) ? value.map(text).filter(Boolean) : text(value).split(/[,;|]/).map((item) => item.trim()).filter(Boolean); }
function normalized(value: string): string { return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase(); }

export function audioAssetCategories(asset: AssetFile): string[] {
  const metadata = asset.metadata || {};
  const categories = new Set([...list(metadata.category), ...list(metadata.categories), ...list(metadata.assetType)]);
  if (metadata.isRecording === true || normalized(text(metadata.source)) === "recorded") categories.add("Recorded");
  else if (metadata.isSource === true || normalized(text(metadata.source)) === "imported") categories.add("Imported");
  if (metadata.provider || metadata.generationMetadata || metadata.generationPrompt || normalized(text(metadata.origin)) === "generated") categories.add("Generated");
  if (metadata.loopable === true) categories.add("Loop");
  return [...categories];
}

export function audioAssetTags(asset: AssetFile): string[] { return [...new Set([...list(asset.metadata?.tags), ...list(asset.metadata?.tag)])]; }
export function audioAssetCharacter(asset: AssetFile): string { return text(asset.metadata?.character) || text(asset.metadata?.characterId) || text(asset.metadata?.voiceCharacter); }
export function audioAssetBpm(asset: AssetFile): string { const value = asset.metadata?.bpm ?? asset.metadata?.tempoBpm; return typeof value === "number" && Number.isFinite(value) ? String(value) : text(value); }
export function audioAssetKey(asset: AssetFile): string { return text(asset.metadata?.key) || text(asset.metadata?.musicalKey); }
export function audioAssetDurationMs(asset: AssetFile): number | undefined { return numeric(asset.metadata?.durationMs); }
export function audioAssetSampleRate(asset: AssetFile): number | undefined { return numeric(asset.metadata?.sampleRate); }
export function audioAssetChannels(asset: AssetFile): number | undefined { return numeric(asset.metadata?.channels); }

function numeric(value: unknown): number | undefined {
  const number = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : NaN;
  return Number.isFinite(number) && number > 0 ? number : undefined;
}

/** Applies editorial values for one project without mutating the shared asset or its provenance. */
export function applyAudioProjectMetadata(asset: AssetFile, override?: AudioAssetProjectMetadata): AssetFile {
  if (!override) return asset;
  const metadata = { ...(asset.metadata || {}) };
  if (override.category !== undefined) { metadata.category = override.category; metadata.categories = override.category ? [override.category] : []; metadata.assetType = ""; }
  if (override.tags !== undefined) { metadata.tags = [...override.tags]; metadata.tag = ""; }
  if (override.character !== undefined) { metadata.character = override.character; metadata.characterId = ""; metadata.voiceCharacter = ""; }
  if (override.bpm !== undefined) { metadata.bpm = override.bpm ?? ""; metadata.tempoBpm = ""; }
  if (override.key !== undefined) { metadata.key = override.key; metadata.musicalKey = ""; }
  if (override.licenseClaim !== undefined) metadata.projectLicenseClaim = override.licenseClaim;
  if (override.attribution !== undefined) metadata.projectAttribution = override.attribution;
  if (override.notes !== undefined) metadata.projectNotes = override.notes;
  return { ...asset, metadata };
}

export function getAudioAssetFacets(assets: AssetFile[]) {
  const collect = (values: string[]) => [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));
  return {
    categories: collect(assets.flatMap(audioAssetCategories)),
    tags: collect(assets.flatMap(audioAssetTags)),
    characters: collect(assets.map(audioAssetCharacter)),
    bpms: collect(assets.map(audioAssetBpm)),
    keys: collect(assets.map(audioAssetKey)),
    sampleRates: [...new Set(assets.map(audioAssetSampleRate).filter((value): value is number => value !== undefined))].sort((a, b) => a - b).map(String),
    channels: [...new Set(assets.map(audioAssetChannels).filter((value): value is number => value !== undefined))].sort((a, b) => a - b).map(String),
  };
}

export function searchAudioAssets(assets: AssetFile[], filters: AudioAssetLibraryFilters): AssetFile[] {
  const queryTokens = normalized(text(filters.query)).split(/\s+/).filter(Boolean);
  const category = normalized(text(filters.category));
  const tag = normalized(text(filters.tag));
  const character = normalized(text(filters.character));
  const bpm = normalized(text(filters.bpm));
  const key = normalized(text(filters.key));
  return assets.filter((asset) => {
    const metadataText = (() => { try { return JSON.stringify(asset.metadata || {}); } catch { return ""; } })();
    const searchable = normalized([asset.name, asset.mimeType, audioAssetCharacter(asset), audioAssetBpm(asset), audioAssetKey(asset), audioAssetCategories(asset).join(" "), audioAssetTags(asset).join(" "), metadataText].join(" "));
    if (queryTokens.some((token) => !searchable.includes(token))) return false;
    if (category && !audioAssetCategories(asset).some((item) => normalized(item) === category)) return false;
    if (tag && !audioAssetTags(asset).some((item) => normalized(item) === tag)) return false;
    if (character && normalized(audioAssetCharacter(asset)) !== character) return false;
    if (bpm && normalized(audioAssetBpm(asset)) !== bpm) return false;
    if (key && normalized(audioAssetKey(asset)) !== key) return false;
    const duration = audioAssetDurationMs(asset);
    if ((filters.minDurationMs !== undefined || filters.maxDurationMs !== undefined) && duration === undefined) return false;
    if (filters.minDurationMs !== undefined && duration! < filters.minDurationMs) return false;
    if (filters.maxDurationMs !== undefined && duration! > filters.maxDurationMs) return false;
    if (filters.sampleRate && String(audioAssetSampleRate(asset) ?? "") !== filters.sampleRate) return false;
    if (filters.channels && String(audioAssetChannels(asset) ?? "") !== filters.channels) return false;
    return true;
  }).sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
}
