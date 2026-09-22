import type { AssetFile } from "../../artifacts/types";
import type { AudioTrack } from "./types";

export interface LoopRegion { startMs: number; endMs: number; crossfadeMs: number; loopable: boolean; }
export interface AudioVariation { id: string; assetId: string; weight: number; tags: string[]; }
export interface VariationGroup { id: string; name: string; category: string; variations: AudioVariation[]; seed?: number; selectionMode?: "weighted" | "sequence"; }
export interface SpatialAudioPosition { x: number; y: number; z: number; refDistance?: number; maxDistance?: number; rolloffFactor?: number; }
export type AudioEventConditionOperator = "EQUALS" | "NOT_EQUALS" | "GREATER_THAN" | "LESS_THAN" | "CONTAINS";
export interface AudioEventCondition { variableId: string; operator: AudioEventConditionOperator; value: string | number | boolean; }
export interface AudioEventDefinition {
  id: string; name: string; variationGroupId?: string; loop?: LoopRegion; volumeRange: [number, number]; pitchRange: [number, number];
  /** Optional v1 additions: identifies the timeline source, runtime trigger and state gate. */
  trackId?: string; clipId?: string; assetIds?: string[]; trigger?: "PLAY"; spatial?: SpatialAudioPosition; conditions?: AudioEventCondition[];
}
export interface GameAudioPackage {
  version: 1; name: string;
  assets: { assetId: string; category: string; tags: string[]; loop?: LoopRegion; variationGroupId?: string; provenance?: Record<string, string>; mimeType?: string; durationMs?: number }[];
  variationGroups: VariationGroup[]; events: AudioEventDefinition[];
}
export interface GameAudioPackageIssue { code: string; message: string; path?: string; }
export interface ParsedGameAudioPackage { package?: GameAudioPackage; issues: GameAudioPackageIssue[]; }

function strings(value: unknown): string[] { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())).map((item) => item.trim()) : typeof value === "string" ? value.split(/[,;|]/).map((item) => item.trim()).filter(Boolean) : []; }
export function parseGameAudioTags(value: string): string[] {
  const tags = new Map<string, string>();
  for (const item of value.split(/[,;|]/)) {
    const tag = item.trim();
    if (tag && !tags.has(tag.toLocaleLowerCase())) tags.set(tag.toLocaleLowerCase(), tag);
  }
  return [...tags.values()];
}
function number(value: unknown): number | undefined { return typeof value === "number" && Number.isFinite(value) ? value : undefined; }

export function createGameAudioPackage(name: string, assets: GameAudioPackage["assets"] = [], variationGroups: VariationGroup[] = [], events: AudioEventDefinition[] = []): GameAudioPackage { return { version: 1, name, assets, variationGroups, events }; }

/** Build a portable, metadata-only package. Binary files remain user-owned source assets. */
export function buildGameAudioPackage(name: string, tracks: AudioTrack[], variationGroups: VariationGroup[] = [], catalog: AssetFile[] = []): GameAudioPackage {
  const catalogById = new Map(catalog.map((asset) => [asset.id, asset]));
  const assets = new Map<string, GameAudioPackage["assets"][number]>();
  const events: AudioEventDefinition[] = [];
  const derivedGroups = new Map<string, VariationGroup>();
  for (const track of tracks) for (const clip of track.clips || []) {
    const source = catalogById.get(clip.assetId);
    const metadata = source?.metadata || {};
    const tags = parseGameAudioTags([...strings(metadata.tags), ...strings(metadata.tag), ...(clip.gameAudioTags || [])].join(","));
    const groupId = track.variationGroup || (typeof metadata.variationGroupId === "string" ? metadata.variationGroupId : undefined);
    if (groupId) {
      const group = derivedGroups.get(groupId) || { id: groupId, name: groupId, category: track.type || "AUDIO", variations: [], seed: track.variationSeed ?? number(metadata.variationSeed) ?? 0, selectionMode: track.variationSelectionMode || "sequence" };
      const existingVariation = group.variations.find((variation) => variation.assetId === clip.assetId);
      if (!existingVariation) group.variations.push({ id: `variation-${clip.assetId}`, assetId: clip.assetId, weight: clip.variationWeight ?? number(metadata.variationWeight) ?? 1, tags });
      else existingVariation.tags = parseGameAudioTags([...existingVariation.tags, ...tags].join(","));
      derivedGroups.set(groupId, group);
    }
    if (!assets.has(clip.assetId)) {
      const provenance: Record<string, string> = {};
      const origin = clip.provenance?.origin || (typeof metadata.source === "string" ? metadata.source : typeof metadata.origin === "string" ? metadata.origin : undefined);
      const provider = clip.provenance?.provider || (typeof metadata.provider === "string" ? metadata.provider : undefined);
      const license = clip.provenance?.license || (typeof metadata.license === "string" ? metadata.license : undefined);
      if (origin) provenance.origin = origin;
      if (provider) provenance.provider = provider;
      if (license) provenance.license = license;
      const assetLoop: LoopRegion | undefined = metadata.loopable === true && number(metadata.loopStartMs) !== undefined && number(metadata.loopEndMs) !== undefined
        ? { startMs: number(metadata.loopStartMs)!, endMs: number(metadata.loopEndMs)!, crossfadeMs: number(metadata.crossfadeMs) || 0, loopable: true }
        : undefined;
      assets.set(clip.assetId, {
        assetId: clip.assetId, category: strings(metadata.category || metadata.assetType)[0] || track.type || "AUDIO", tags,
        loop: assetLoop, variationGroupId: groupId, provenance: Object.keys(provenance).length ? provenance : undefined,
        mimeType: source?.mimeType, durationMs: number(metadata.durationMs),
      });
    } else {
      const existingAsset = assets.get(clip.assetId)!;
      existingAsset.tags = parseGameAudioTags([...existingAsset.tags, ...tags].join(","));
    }
    const eventLoop = clip.loop?.enabled ? {
      startMs: number(clip.loop.startMs) ?? clip.sourceStartMs,
      endMs: number(clip.loop.endMs) ?? clip.sourceEndMs,
      crossfadeMs: number(clip.loop.crossfadeMs) ?? 0,
      loopable: true,
    } : undefined;
    events.push({
      id: `event-${clip.id}`, name: clip.name || source?.name || `${track.name} audio`, trackId: track.id, clipId: clip.id,
      assetIds: [clip.assetId], trigger: "PLAY", variationGroupId: groupId, loop: eventLoop,
      volumeRange: clip.gameAudioVolumeRange || [clip.gain, clip.gain], pitchRange: clip.gameAudioPitchRange || [clip.playbackRate ?? 1, clip.playbackRate ?? 1], spatial: clip.spatial, conditions: clip.gameAudioConditions,
    });
  }
  const groups = new Map(variationGroups.map((group) => [group.id, group]));
  for (const group of derivedGroups.values()) if (!groups.has(group.id)) groups.set(group.id, group);
  return createGameAudioPackage(name, [...assets.values()], [...groups.values()], events);
}

export function validateLoop(loop: LoopRegion, durationMs: number): { valid: boolean; error?: string } {
  if (!loop.loopable) return { valid: true };
  if (!Number.isFinite(durationMs) || durationMs <= 0 || !Number.isFinite(loop.startMs) || !Number.isFinite(loop.endMs) || loop.startMs < 0 || loop.endMs <= loop.startMs || loop.endMs > durationMs) return { valid: false, error: "[AUDIO_LOOP_INVALID] Região de loop fora dos limites do asset." };
  if (!Number.isFinite(loop.crossfadeMs) || loop.crossfadeMs < 0 || loop.crossfadeMs * 2 > loop.endMs - loop.startMs) return { valid: false, error: "[AUDIO_LOOP_CROSSFADE_INVALID] Crossfade maior que a região de loop." };
  return { valid: true };
}

/** Parse untrusted JSON before it is attached to a game document. */
export function parseGameAudioPackage(input: unknown, availableAssetIds?: Set<string>): ParsedGameAudioPackage {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { issues: [{ code: "GAME_AUDIO_PACKAGE_INVALID", message: "O arquivo não contém um objeto Game Audio." }] };
  const value = input as Record<string, unknown>;
  if (value.version !== 1 || typeof value.name !== "string" || !Array.isArray(value.assets) || !Array.isArray(value.variationGroups) || !Array.isArray(value.events)) return { issues: [{ code: "GAME_AUDIO_PACKAGE_SCHEMA_INVALID", message: "Esperado pacote Game Audio v1 com nome, assets, variationGroups e events." }] };
  if (value.name.length > 200 || value.assets.length > 5000 || value.variationGroups.length > 1000 || value.events.length > 10000) return { issues: [{ code: "GAME_AUDIO_PACKAGE_LIMIT_EXCEEDED", message: "O pacote excede o limite de nome ou de elementos suportados." }] };
  const record = (item: unknown): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item);
  const parseLoop = (item: unknown): LoopRegion | undefined => {
    if (item === undefined) return undefined;
    if (!record(item) || typeof item.loopable !== "boolean" || number(item.startMs) === undefined || number(item.endMs) === undefined || number(item.crossfadeMs) === undefined) throw new Error("Região de loop com schema inválido.");
    return { startMs: item.startMs as number, endMs: item.endMs as number, crossfadeMs: item.crossfadeMs as number, loopable: item.loopable };
  };
  const parseStringArray = (item: unknown, field: string, maxCount = 100): string[] => {
    if (!Array.isArray(item) || item.length > maxCount || item.some((entry) => typeof entry !== "string" || entry.length > 256)) throw new Error(`Lista ${field} inválida.`);
    return item as string[];
  };
  try {
    const assets: GameAudioPackage["assets"] = value.assets.map((item, index) => {
      if (!record(item) || typeof item.assetId !== "string" || !item.assetId.trim() || item.assetId.length > 256 || typeof item.category !== "string" || item.category.length > 100) throw new Error(`Asset ${index} inválido.`);
      let provenance: Record<string, string> | undefined;
      if (item.provenance !== undefined) {
        if (!record(item.provenance)) throw new Error(`Proveniência do asset ${item.assetId} inválida.`);
        provenance = {};
        for (const key of ["origin", "provider", "license"] as const) if (item.provenance[key] !== undefined) {
          if (typeof item.provenance[key] !== "string" || item.provenance[key].length > 512) throw new Error(`Proveniência ${key} inválida.`);
          provenance[key] = item.provenance[key] as string;
        }
      }
      if (item.mimeType !== undefined && (typeof item.mimeType !== "string" || item.mimeType.length > 128)) throw new Error(`MIME do asset ${item.assetId} inválido.`);
      if (item.durationMs !== undefined && (number(item.durationMs) === undefined || (item.durationMs as number) < 0)) throw new Error(`Duração do asset ${item.assetId} inválida.`);
      if (item.variationGroupId !== undefined && (typeof item.variationGroupId !== "string" || item.variationGroupId.length > 256)) throw new Error(`Grupo do asset ${item.assetId} inválido.`);
      return { assetId: item.assetId.trim(), category: item.category, tags: parseStringArray(item.tags, `assets.${index}.tags`), loop: parseLoop(item.loop), variationGroupId: item.variationGroupId as string | undefined, provenance, mimeType: item.mimeType as string | undefined, durationMs: item.durationMs as number | undefined };
    });
    const variationGroups: VariationGroup[] = value.variationGroups.map((item, index) => {
      if (!record(item) || typeof item.id !== "string" || !item.id.trim() || item.id.length > 256 || typeof item.name !== "string" || item.name.length > 200 || typeof item.category !== "string" || item.category.length > 100 || !Array.isArray(item.variations) || item.variations.length > 5000) throw new Error(`Grupo de variação ${index} inválido.`);
      if (item.seed !== undefined && number(item.seed) === undefined) throw new Error(`Seed do grupo ${item.id} inválido.`);
      const variations: AudioVariation[] = item.variations.map((variation, variationIndex) => {
        if (!record(variation) || typeof variation.id !== "string" || variation.id.length > 256 || typeof variation.assetId !== "string" || variation.assetId.length > 256 || number(variation.weight) === undefined) throw new Error(`Variação ${variationIndex} do grupo ${item.id} inválida.`);
        return { id: variation.id, assetId: variation.assetId, weight: variation.weight as number, tags: parseStringArray(variation.tags, `variationGroups.${index}.variations.${variationIndex}.tags`) };
      });
      return { id: item.id, name: item.name, category: item.category, variations, seed: item.seed as number | undefined, selectionMode: item.selectionMode === "weighted" ? "weighted" : "sequence" };
    });
    const events: AudioEventDefinition[] = value.events.map((item, index) => {
      if (!record(item) || typeof item.id !== "string" || !item.id.trim() || item.id.length > 256 || typeof item.name !== "string" || item.name.length > 256 || !Array.isArray(item.volumeRange) || item.volumeRange.length !== 2 || !Array.isArray(item.pitchRange) || item.pitchRange.length !== 2 || item.volumeRange.some((v) => number(v) === undefined) || item.pitchRange.some((v) => number(v) === undefined)) throw new Error(`Evento ${index} inválido.`);
      if (item.trigger !== undefined && item.trigger !== "PLAY") throw new Error(`Trigger do evento ${item.id} não suportado.`);
      for (const field of ["trackId", "clipId", "variationGroupId"] as const) if (item[field] !== undefined && (typeof item[field] !== "string" || item[field].length > 256)) throw new Error(`Referência ${field} do evento ${item.id} inválida.`);
      const spatial = item.spatial && typeof item.spatial === "object" ? item.spatial as SpatialAudioPosition : undefined;
      if (spatial && [spatial.x, spatial.y, spatial.z].some((value) => !Number.isFinite(value))) throw new Error(`events.${index}.spatial inválido.`);
      const conditions = item.conditions === undefined ? undefined : Array.isArray(item.conditions) ? item.conditions.map((condition, conditionIndex) => { if (!record(condition) || typeof condition.variableId !== "string" || !(condition.variableId as string).trim() || !["EQUALS", "NOT_EQUALS", "GREATER_THAN", "LESS_THAN", "CONTAINS"].includes(String(condition.operator)) || !["string", "number", "boolean"].includes(typeof condition.value)) throw new Error(`Condição inválida em events.${index}.conditions.${conditionIndex}.`); return { variableId: (condition.variableId as string).trim(), operator: String(condition.operator) as AudioEventConditionOperator, value: condition.value as string | number | boolean }; }) : (() => { throw new Error(`Condições inválidas no evento ${item.id}.`); })();
      return { id: item.id, name: item.name, trackId: item.trackId as string | undefined, clipId: item.clipId as string | undefined, assetIds: item.assetIds === undefined ? undefined : parseStringArray(item.assetIds, `events.${index}.assetIds`, 1000), variationGroupId: item.variationGroupId as string | undefined, trigger: item.trigger as "PLAY" | undefined, loop: parseLoop(item.loop), volumeRange: item.volumeRange as [number, number], pitchRange: item.pitchRange as [number, number], spatial, conditions };
    });
    const pack = createGameAudioPackage(value.name.trim(), assets, variationGroups, events);
    const issues = validateGameAudioPackage(pack, availableAssetIds);
    return issues.length ? { issues } : { package: pack, issues: [] };
  } catch {
    return { issues: [{ code: "GAME_AUDIO_PACKAGE_SCHEMA_INVALID", message: "O JSON contém campos inválidos para um pacote Game Audio v1." }] };
  }
}

export function validateGameAudioPackage(pack: GameAudioPackage, availableAssetIds?: Set<string>): GameAudioPackageIssue[] {
  const issues: GameAudioPackageIssue[] = [];
  if (pack.version !== 1) issues.push({ code: "GAME_AUDIO_VERSION_UNSUPPORTED", message: "Versão do pacote não suportada.", path: "version" });
  if (!pack.name.trim()) issues.push({ code: "GAME_AUDIO_NAME_REQUIRED", message: "O pacote precisa de um nome.", path: "name" });
  const assetIds = new Set<string>();
  for (const [index, asset] of pack.assets.entries()) {
    if (!asset.assetId.trim()) issues.push({ code: "GAME_AUDIO_ASSET_ID_REQUIRED", message: "Asset sem identificador.", path: `assets.${index}.assetId` });
    if (assetIds.has(asset.assetId)) issues.push({ code: "GAME_AUDIO_ASSET_DUPLICATE", message: `Asset repetido: ${asset.assetId}.`, path: `assets.${index}.assetId` });
    assetIds.add(asset.assetId);
    if (availableAssetIds && !availableAssetIds.has(asset.assetId)) issues.push({ code: "GAME_AUDIO_ASSET_MISSING", message: `Asset ${asset.assetId} não existe ou não está disponível.`, path: `assets.${index}.assetId` });
    if (asset.loop) {
      const loopCheck = validateLoop(asset.loop, asset.durationMs ?? 0);
      if (!loopCheck.valid) issues.push({ code: loopCheck.error?.match(/^\[([^\]]+)/)?.[1] || "GAME_AUDIO_LOOP_INVALID", message: loopCheck.error || "Loop inválido.", path: `assets.${index}.loop` });
    }
  }
  const groups = new Map<string, VariationGroup>();
  for (const [index, group] of pack.variationGroups.entries()) {
    if (!group.id.trim() || groups.has(group.id)) issues.push({ code: "GAME_AUDIO_VARIATION_GROUP_ID_INVALID", message: `Identificador de grupo ausente ou duplicado: ${group.id}.`, path: `variationGroups.${index}.id` });
    groups.set(group.id, group);
    if (!group.variations.length) issues.push({ code: "GAME_AUDIO_VARIATIONS_REQUIRED", message: `O grupo ${group.name} não possui variações.`, path: `variationGroups.${index}.variations` });
    let weightTotal = 0;
    const variationIds = new Set<string>();
    for (const [variationIndex, variation] of group.variations.entries()) {
      if (variationIds.has(variation.id)) issues.push({ code: "GAME_AUDIO_VARIATION_ID_DUPLICATE", message: `Variação duplicada ${variation.id}.`, path: `variationGroups.${index}.variations.${variationIndex}.id` });
      variationIds.add(variation.id);
      if (!Number.isFinite(variation.weight) || variation.weight < 0) issues.push({ code: "GAME_AUDIO_VARIATION_WEIGHT_INVALID", message: `Peso inválido na variação ${variation.id}.`, path: `variationGroups.${index}.variations.${variationIndex}.weight` });
      else weightTotal += variation.weight;
      if (!assetIds.has(variation.assetId)) issues.push({ code: "GAME_AUDIO_VARIATION_ASSET_MISSING", message: `A variação ${variation.id} aponta para asset fora do pacote.`, path: `variationGroups.${index}.variations.${variationIndex}.assetId` });
    }
    if (group.variations.length && weightTotal <= 0) issues.push({ code: "GAME_AUDIO_VARIATION_WEIGHTS_ZERO", message: `O grupo ${group.name} precisa de ao menos um peso positivo.`, path: `variationGroups.${index}.variations` });
  }
  for (const [index, asset] of pack.assets.entries()) if (asset.variationGroupId && !groups.has(asset.variationGroupId)) issues.push({ code: "GAME_AUDIO_ASSET_GROUP_MISSING", message: `Asset ${asset.assetId} aponta para grupo inexistente ${asset.variationGroupId}.`, path: `assets.${index}.variationGroupId` });
  const eventIds = new Set<string>();
  for (const [index, event] of pack.events.entries()) {
    if (!event.id.trim() || eventIds.has(event.id)) issues.push({ code: "GAME_AUDIO_EVENT_ID_INVALID", message: `Identificador de evento ausente ou duplicado: ${event.id}.`, path: `events.${index}.id` });
    eventIds.add(event.id);
    if (event.variationGroupId && !groups.has(event.variationGroupId)) issues.push({ code: "GAME_AUDIO_EVENT_GROUP_MISSING", message: `Evento ${event.name} aponta para grupo inexistente ${event.variationGroupId}.`, path: `events.${index}.variationGroupId` });
    for (const assetId of event.assetIds || []) if (!assetIds.has(assetId)) issues.push({ code: "GAME_AUDIO_EVENT_ASSET_MISSING", message: `Evento ${event.name} aponta para asset fora do pacote ${assetId}.`, path: `events.${index}.assetIds` });
    for (const [rangeName, range, min, max] of [["volumeRange", event.volumeRange, 0, 4], ["pitchRange", event.pitchRange, 0.05, 4]] as const) {
      if (!Number.isFinite(range[0]) || !Number.isFinite(range[1]) || range[0] < min || range[1] > max || range[1] < range[0]) issues.push({ code: "GAME_AUDIO_EVENT_RANGE_INVALID", message: `Faixa ${rangeName} inválida no evento ${event.name}.`, path: `events.${index}.${rangeName}` });
    }
    if (event.spatial && (!Number.isFinite(event.spatial.x) || !Number.isFinite(event.spatial.y) || !Number.isFinite(event.spatial.z) || (event.spatial.refDistance !== undefined && (!Number.isFinite(event.spatial.refDistance) || event.spatial.refDistance <= 0)) || (event.spatial.maxDistance !== undefined && (!Number.isFinite(event.spatial.maxDistance) || event.spatial.maxDistance <= 0)) || (event.spatial.refDistance !== undefined && event.spatial.maxDistance !== undefined && event.spatial.maxDistance < event.spatial.refDistance) || (event.spatial.rolloffFactor !== undefined && (!Number.isFinite(event.spatial.rolloffFactor) || event.spatial.rolloffFactor < 0)))) issues.push({ code: "GAME_AUDIO_SPATIAL_INVALID", message: `Espacialização inválida no evento ${event.name}.`, path: `events.${index}.spatial` });
    if (event.loop) {
      const groupAssets = event.variationGroupId ? groups.get(event.variationGroupId)?.variations.map((variation) => variation.assetId) || [] : [];
      const loopAssetIds = [...new Set(groupAssets.length ? groupAssets : event.assetIds || [])];
      if (!loopAssetIds.length) issues.push({ code: "GAME_AUDIO_LOOP_SOURCE_MISSING", message: `O loop do evento ${event.name} não possui asset de origem.`, path: `events.${index}.loop` });
      for (const assetId of loopAssetIds) {
        const source = pack.assets.find((asset) => asset.assetId === assetId);
        const loopCheck = validateLoop(event.loop, source?.durationMs ?? 0);
        if (!loopCheck.valid) issues.push({ code: loopCheck.error?.match(/^\[([^\]]+)/)?.[1] || "GAME_AUDIO_LOOP_INVALID", message: `${loopCheck.error || "Loop inválido."} Evento ${event.name}, asset ${assetId}.`, path: `events.${index}.loop` });
      }
    }
  }
  return issues;
}

export function selectVariation(group: VariationGroup, seed = group.seed ?? 0): AudioVariation | undefined {
  const available = group.variations.filter((variation) => Number.isFinite(variation.weight) && variation.weight > 0);
  if (!available.length) return undefined;
  const total = available.reduce((sum, variation) => sum + variation.weight, 0);
  let value = (Math.abs(Math.sin(seed * 12.9898) * 43758.5453) % 1) * total;
  for (const variation of available) { value -= variation.weight; if (value < 0) return variation; }
  return available[available.length - 1];
}

/** Produces a deterministic weighted sequence while avoiding immediate repeats when possible. */
export function selectVariationSequence(group: VariationGroup, count: number, seed = group.seed ?? 0): AudioVariation[] {
  const result: AudioVariation[] = []; const available = group.variations.filter((variation) => Number.isFinite(variation.weight) && variation.weight > 0);
  if (!available.length || !Number.isFinite(count) || count <= 0) return result;
  for (let index = 0; index < Math.floor(count); index++) {
    const pool = available.length > 1 && result.length ? available.filter((variation) => variation.id !== result[result.length - 1]?.id) : available;
    const chosen = selectVariation({ ...group, variations: pool }, seed + index * 7919);
    if (chosen) result.push(chosen);
  }
  return result;
}

export function audioEventConditionsPass(conditions: AudioEventCondition[] | undefined, variables: Record<string, unknown>): boolean {
  return (conditions || []).every((condition) => { const current = variables[condition.variableId]; if (condition.operator === "EQUALS") return current === condition.value; if (condition.operator === "NOT_EQUALS") return current !== condition.value; if (condition.operator === "GREATER_THAN") return Number(current) > Number(condition.value); if (condition.operator === "LESS_THAN") return Number(current) < Number(condition.value); if (condition.operator === "CONTAINS") return String(current ?? "").includes(String(condition.value)); return false; });
}

/** Updates group membership immutably for an explicit set of audio tracks. */
export function assignVariationGroup(tracks: AudioTrack[], trackIds: string[], groupId: string | undefined): AudioTrack[] {
  const selected = new Set(trackIds);
  return tracks.map((track) => {
    if (!selected.has(track.id)) return track;
    const { variationGroup: _previousGroup, ...withoutGroup } = track;
    return groupId ? { ...withoutGroup, variationGroup: groupId } : withoutGroup;
  });
}
