import { AudioDocumentState } from "./types";
import { defaultMusicProject } from "./music-domain";
import { createEuterpeVoiceProfile } from "./voice-domain";
import { validateSamplerDefinition } from "./sampler-domain";

export const CURRENT_AUDIO_SCHEMA_VERSION = 4;

export function migrateAudioProject(input: AudioDocumentState): AudioDocumentState {
  const state: AudioDocumentState = JSON.parse(JSON.stringify(input));
  state.projectSchemaVersion = state.projectSchemaVersion || 1;
  if (!state.settings) state.settings = { sampleRate: 44100, bitDepth: 16, channels: 2 };
  if (!state.buses) state.buses = [];
  if (!state.masterBus) state.masterBus = { id: "master", name: "Master", volume: 1, pan: 0, muted: false, solo: false, effects: [] };
  if (!state.automation) state.automation = [];
  if (!state.assetMetadataOverrides || typeof state.assetMetadataOverrides !== "object" || Array.isArray(state.assetMetadataOverrides)) state.assetMetadataOverrides = {};
  if (!state.music) state.music = defaultMusicProject();
  if (!state.voiceProfiles) state.voiceProfiles = [createEuterpeVoiceProfile()];
  state.voiceProfiles = state.voiceProfiles.map((profile) => { const source = profile.processingSettings || {}; const number = (value: unknown, fallback: number, min: number, max: number) => { const parsed = Number(value); return Number.isFinite(parsed) ? Math.max(min, Math.min(max, parsed)) : fallback; }; return { ...profile, processingSettings: { eqGainDb: number(source.eqGainDb, 0, -24, 24), gainDb: number(source.gainDb, 0, -60, 24), gateThreshold: number(source.gateThreshold, 0.015, 0, 1), deEsserThreshold: number(source.deEsserThreshold, 0.45, 0, 1), compressorThreshold: number(source.compressorThreshold, 0.7, 0.01, 1), compressorRatio: number(source.compressorRatio, 4, 1, 20) } }; });
  if (!state.voiceTakes) state.voiceTakes = [];
  state.samplerDefinitions = (state.samplerDefinitions || []).flatMap((definition) => { try { return [validateSamplerDefinition(definition)]; } catch { return []; } });
  if (!state.music.clips) state.music.clips = [];
  const normalizeNotes = (notes: unknown) => Array.isArray(notes) ? notes.map((note) => { if (!note || typeof note !== "object") return note; const candidate = note as { tuplet?: { actual?: unknown; normal?: unknown } }; const actual = Number(candidate.tuplet?.actual); const normal = Number(candidate.tuplet?.normal); return Number.isInteger(actual) && Number.isInteger(normal) && actual > 0 && normal > 0 && actual <= 32 && normal <= 32 ? { ...note, tuplet: { actual, normal } } : (() => { const { tuplet: _invalidTuplet, ...withoutTuplet } = note as Record<string, unknown>; return withoutTuplet; })(); }) : [];
  state.music.notes = normalizeNotes(state.music.notes) as typeof state.music.notes;
  state.music.clips = state.music.clips.map((clip) => ({ ...clip, notes: normalizeNotes(clip.notes) as typeof clip.notes }));
  state.tracks = (state.tracks || []).map((track) => ({ ...track, effects: track.effects || [], musicClips: track.musicClips || [], clips: (track.clips || []).map((clip) => ({ ...clip, gain: clip.gain ?? 1, playbackRate: clip.playbackRate ?? 1 })) }));
  state.projectSchemaVersion = CURRENT_AUDIO_SCHEMA_VERSION;
  return state;
}
