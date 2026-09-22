import { Artifact, ArtifactActor } from "../../artifacts/types";
import type { AudioEventCondition } from "./game-audio-domain";

export type AudioDocumentMode = "SINGLE_TRACK" | "MULTITRACK";

export type AudioTrackType =
  | "AUDIO"
  | "VOICE"
  | "MUSIC"
  | "SFX"
  | "MASTER";
export type ExtendedAudioTrackType = AudioTrackType | "DIALOGUE" | "INSTRUMENT" | "MIDI" | "FOLEY" | "AMBIENCE" | "REFERENCE" | "BUS_AUX";

export type AudioPlaybackState =
  | "STOPPED"
  | "PLAYING"
  | "PAUSED"
  | "BUFFERING"
  | "ERROR";

export type AudioExportFormat = "WAV" | "MP3" | "OGG";

export interface AudioEffect {
  id: string;
  type: string;
  enabled: boolean;
  parameters: Record<string, number | string | boolean>;
}

export interface AudioClip {
  id: string;
  assetId: string;
  trackId: string;
  name?: string;
  timelineStartMs: number;
  sourceStartMs: number;
  sourceEndMs: number;
  gain: number; // 0.0 to 2.0 (1.0 = 0dB)
  fadeInMs?: number;
  fadeOutMs?: number;
  playbackRate?: number;
  variationWeight?: number;
  /** Project-scoped tags for Game Audio variations; never written to shared asset metadata. */
  gameAudioTags?: string[];
  gameAudioVolumeRange?: [number, number];
  gameAudioPitchRange?: [number, number];
  gameAudioConditions?: AudioEventCondition[];
  loop?: { enabled: boolean; startMs?: number; endMs?: number; crossfadeMs?: number };
  spatial?: { x: number; y: number; z: number; refDistance?: number; maxDistance?: number; rolloffFactor?: number };
  provenance?: { origin: "IMPORTED" | "RECORDED" | "GENERATED"; provider?: string; license?: string; generationDate?: string; generationMetadata?: Record<string, unknown> };
}
export interface MusicClip { id: string; trackId: string; name?: string; timelineStartMs: number; startBeat: number; endBeat: number; transposeSemitones: number; notes: import("./music-domain").MusicalNote[]; chords?: import("./music-domain").MusicalChord[]; loop?: { enabled: boolean; endBeat: number }; }

export interface AudioTrack {
  id: string;
  name: string;
  type: AudioTrackType | "DIALOGUE" | "INSTRUMENT" | "MIDI" | "FOLEY" | "AMBIENCE" | "REFERENCE" | "BUS_AUX";
  muted: boolean;
  solo: boolean;
  volume: number; // 0.0 to 1.5 (1.0 = 0dB)
  pan: number;    // -1.0 (Left) to 1.0 (Right), 0.0 = Center
  clips: AudioClip[];
  musicClips?: MusicClip[];
  variationGroup?: string;
  variationSeed?: number;
  variationSelectionMode?: "weighted" | "sequence";
  effects: AudioEffect[];
  color?: string;
  busId?: string;
  inputDeviceId?: string;
  recordArm?: boolean;
  sends?: AudioSend[];
}

export interface AudioSend { id: string; busId: string; level: number; preFader?: boolean; enabled: boolean; }

export interface AudioBus {
  id: string;
  name: string;
  volume: number;
  pan: number;
  muted: boolean;
  solo: boolean;
  effects: AudioEffect[];
  outputBusId?: string;
  color?: string;
}

export interface AudioAutomationPoint {
  id: string;
  parameter: "TRACK_VOLUME" | "TRACK_PAN" | "EFFECT_PARAMETER";
  targetId: string;
  timeMs: number;
  value: number;
  curve?: "STEP" | "LINEAR" | "EQUAL_POWER";
}

export interface AudioTimelineMarker {
  id: string;
  timeMs: number;
  label: string;
  color?: string;
}

export interface AudioTimeline {
  durationMs: number;
  zoom: number; // Pixels per second or scale multiplier
  markers: AudioTimelineMarker[];
  snapToGrid: boolean;
  timeUnit: "ms";
}

/** Editorial annotations scoped to one Audio project; source provenance and shared AssetFile data stay untouched. */
export interface AudioAssetProjectMetadata {
  category?: string;
  tags?: string[];
  character?: string;
  bpm?: number | null;
  key?: string;
  licenseClaim?: string;
  attribution?: string;
  notes?: string;
}

export interface AudioDocumentState {
  projectSchemaVersion?: number;
  artifactId: string;
  settings?: { sampleRate: number; bitDepth: 16 | 24 | 32; channels: 1 | 2; bpm?: number; timeSignature?: [number, number]; metronome?: { enabled: boolean; volume: number; accentFirstBeat: boolean; countInBars?: number } };
  synthPreset?: Partial<import("./instrument-engine").SynthPreset>;
  synthPresetVersions?: Array<{ id: string; name: string; createdAt: string; preset: import("./instrument-engine").SynthPreset }>;
  samplerDefinitions?: import("./sampler-domain").SamplerDefinition[];
  drumPatterns?: import("./drum-sequencer-domain").DrumPattern[];
  timeline: AudioTimeline;
  tracks: AudioTrack[];
  buses?: AudioBus[];
  masterBus?: AudioBus;
  automation?: AudioAutomationPoint[];
  assetMetadataOverrides?: Record<string, AudioAssetProjectMetadata>;
  selectedTrackId?: string;
  selectedClipIds: string[];
  playheadMs: number;
  updatedAt: string;
  music?: import("./music-domain").MusicProjectState;
  voiceProfiles?: import("./voice-domain").CharacterVoiceProfile[];
  voiceTakes?: import("./voice-domain").VoiceTake[];
}

export interface AudioMetadata {
  durationMs: number;
  sampleRate?: number;
  channels?: number;
  sourceFormat?: string;
  sourceAssetIds: string[];
  renderedAssetId?: string;
  timelineDurationMs: number;
  documentMode: AudioDocumentMode;
  trackCount: number;
  clipCount: number;
}

export interface AudioItem {
  artifact: Artifact;
  metadata: AudioMetadata;
  documentState: AudioDocumentState;
}

export interface AudioWaveformData {
  assetId: string;
  durationMs: number;
  peaks: number[]; // Normalized peak amplitudes [0.0 - 1.0]
  sampleRate: number;
  generatedAt: string;
  resolution?: number;
  channels?: number;
  clipping?: boolean[];
}

export interface AudioRuntimeCapabilities {
  maxDurationMs: number;
  maxDecodedMemoryBytes: number;
  supportedExportFormats: AudioExportFormat[];
  supportedImportMimeTypes: string[];
  bytesPerDecodedSample: number; // Usually 4 bytes (Float32)
}

export interface AudioDecodeValidationResult {
  status: "VALID_AUDIO" | "CORRUPTED_AUDIO" | "UNSUPPORTED_FORMAT" | "DECODE_FAILED" | "MEMORY_EXCEEDED";
  estimatedBytes?: number;
  durationMs?: number;
  sampleRate?: number;
  channels?: number;
  error?: string;
}

// Discriminated union of Audio Operations
export type AudioOperation =
  | { type: "ADD_TRACK"; track: AudioTrack }
  | { type: "REMOVE_TRACK"; trackId: string }
  | { type: "UPDATE_TRACK"; trackId: string; updates: Partial<Pick<AudioTrack, "name" | "muted" | "solo" | "volume" | "pan" | "type">> }
  | { type: "ADD_CLIP"; clip: AudioClip }
  | { type: "REMOVE_CLIP"; clipId: string }
  | { type: "MOVE_CLIP"; clipId: string; newTrackId?: string; newTimelineStartMs: number }
  | { type: "TRIM_CLIP"; clipId: string; sourceStartMs: number; sourceEndMs: number }
  | { type: "SPLIT_CLIP"; clipId: string; splitTimelineMs: number }
  | { type: "SET_CLIP_GAIN"; clipId: string; gain: number }
  | { type: "SET_CLIP_FADE"; clipId: string; fadeInMs?: number; fadeOutMs?: number }
  | { type: "ADD_MARKER"; marker: AudioTimelineMarker }
  | { type: "REMOVE_MARKER"; markerId: string }
  | { type: "SET_TIMELINE_DURATION"; durationMs: number };

export interface AudioChangeSet {
  id: string;
  artifactId: string;
  title: string;
  summary: string;
  operations: AudioOperation[];
  createdBy: "ATHENA" | "USER";
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  createdAt: string;
}

export interface AudioExportOptions {
  format: AudioExportFormat;
  sampleRate?: number; // Default 44100 or 48000
  bitDepth?: 16 | 24 | 32; // Default 16
  channels?: 1 | 2; // Mono or Stereo
  normalize?: boolean;
  target?: { type: "FULL_MIX" | "SELECTED_REGION" | "TRACK" | "STEMS" | "CLIP"; trackIds?: string[]; clipId?: string; startMs?: number; endMs?: number };
}

export interface AudioExportResult {
  success: boolean;
  format: AudioExportFormat;
  assetId?: string;
  dataUrl?: string;
  blob?: Blob;
  sizeBytes?: number;
  durationMs?: number;
  jobId?: string;
  warnings?: string[];
  error?: string;
}
export interface AudioStemsExportResult { success: boolean; stems: { trackId: string; result: AudioExportResult }[]; error?: string; }

export interface AudioCommandHistoryState {
  past: AudioDocumentState[];
  future: AudioDocumentState[];
}
