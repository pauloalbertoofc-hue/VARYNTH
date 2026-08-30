import { Artifact, ArtifactActor } from "../../artifacts/types";
import { FrameRate, TemporalMarker } from "../temporal/temporal-core";

export type VideoTrackType =
  | "VIDEO"
  | "IMAGE"
  | "AUDIO"
  | "TEXT"
  | "SUBTITLE"
  | "OVERLAY";

export type VideoPlaybackState =
  | "STOPPED"
  | "PLAYING"
  | "PAUSED"
  | "BUFFERING"
  | "ERROR";

export type VideoExportFormat = "WEBM" | "MP4";

export type VideoRenderProfile = "DRAFT" | "STANDARD" | "HIGH";

export interface VideoTransform {
  x: number;
  y: number;
  width: number;
  height: number;
  scaleX: number;
  scaleY: number;
  rotation: number; // degrees
  opacity: number;  // 0.0 to 1.0
  crop?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface VideoKeyframe {
  id: string;
  property: "position" | "scale" | "rotation" | "opacity";
  timeMs: number;
  value: number | { x: number; y: number };
  interpolation: "LINEAR" | "HOLD";
}

export interface VideoTransition {
  id: string;
  type: "CUT" | "FADE" | "CROSSFADE" | "DISSOLVE";
  durationMs: number;
}

export interface VideoTextStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: string | number;
  color: string;
  backgroundColor?: string;
  alignment: "left" | "center" | "right";
  position: { x: number; y: number };
}

export interface SubtitleCue {
  id: string;
  startMs: number;
  endMs: number;
  text: string;
  style?: Partial<VideoTextStyle>;
}

export interface VideoClip {
  id: string;
  trackId: string;
  assetId?: string;
  name?: string;
  type: "VIDEO" | "IMAGE" | "AUDIO" | "TEXT";
  timelineStartMs: number;
  sourceStartMs: number;
  sourceEndMs: number;
  transform: VideoTransform;
  opacity: number;
  playbackRate?: number;
  transitionIn?: VideoTransition;
  transitionOut?: VideoTransition;
  keyframes?: VideoKeyframe[];
  textContent?: string;
  textStyle?: VideoTextStyle;
}

export interface VideoTrack {
  id: string;
  name: string;
  type: VideoTrackType;
  visible: boolean;
  locked: boolean;
  order: number;
  muted?: boolean;
  solo?: boolean;
  volume?: number;
  pan?: number;
  opacity?: number;
  clips: VideoClip[];
  subtitles?: SubtitleCue[];
  color?: string;
}

export interface VideoScene {
  id: string;
  name: string;
  startMs: number;
  endMs: number;
  description?: string;
  relatedClipIds: string[];
  thumbnailAssetId?: string;
  metadata?: Record<string, unknown>;
}

export interface VideoTimeline {
  durationMs: number;
  width: number;
  height: number;
  frameRate: FrameRate;
  zoom: number; // Pixels per second
  markers: TemporalMarker[];
  snapToGrid: boolean;
  timeUnit: "ms";
}

export interface VideoDocumentState {
  artifactId: string;
  timeline: VideoTimeline;
  scenes: VideoScene[];
  tracks: VideoTrack[];
  selectedClipIds: string[];
  selectedSceneId?: string;
  selectedTrackId?: string;
  playheadMs: number;
  updatedAt: string;
}

export interface VideoMetadata {
  width: number;
  height: number;
  frameRate: FrameRate;
  durationMs: number;
  aspectRatio: string;
  sourceAssetIds: string[];
  renderedAssetId?: string;
  timelineDurationMs: number;
  trackCount: number;
  clipCount: number;
  sceneCount: number;
  renderProfile?: VideoRenderProfile;
}

export interface VideoItem {
  artifact: Artifact;
  metadata: VideoMetadata;
  documentState: VideoDocumentState;
}

export interface VideoExportCapability {
  container: "MP4" | "WEBM";
  videoCodec: string;
  audioCodec?: string;
  encoderAvailable: boolean;
  muxerAvailable: boolean;
  supportedResolutions: string[]; // "720p", "1080p", "4K"
  supportedFrameRates: FrameRate[];
  available: boolean;
  reasonUnavailable?: string;
}

export interface VideoRuntimeCapabilities {
  maxDurationMs: number;
  maxDimensions: { width: number; height: number };
  maxFrameRate: number;
  maxWorkingSetBytes: number;
  exportCapabilities: VideoExportCapability[];
  supportedImportMimeTypes: string[];
}

export interface VideoCreationPlan {
  title: string;
  targetDurationMs: number;
  scenes: {
    name: string;
    durationMs: number;
    visualAssetIds: string[];
    audioAssetIds?: string[];
    titles?: string[];
  }[];
  musicAssetId?: string;
}

// Discriminated union of Video Operations
export type VideoOperation =
  | { type: "CREATE_SCENE"; scene: VideoScene }
  | { type: "UPDATE_SCENE"; sceneId: string; updates: Partial<VideoScene> }
  | { type: "DELETE_SCENE"; sceneId: string }
  | { type: "ADD_TRACK"; track: VideoTrack }
  | { type: "REMOVE_TRACK"; trackId: string }
  | { type: "UPDATE_TRACK"; trackId: string; updates: Partial<VideoTrack> }
  | { type: "ADD_CLIP"; clip: VideoClip }
  | { type: "REMOVE_CLIP"; clipId: string }
  | { type: "MOVE_CLIP"; clipId: string; newTrackId?: string; newTimelineStartMs: number }
  | { type: "TRIM_CLIP"; clipId: string; sourceStartMs: number; sourceEndMs: number }
  | { type: "SPLIT_CLIP"; clipId: string; splitTimelineMs: number }
  | { type: "UPDATE_CLIP_TRANSFORM"; clipId: string; transform: Partial<VideoTransform> }
  | { type: "ADD_KEYFRAME"; clipId: string; keyframe: VideoKeyframe }
  | { type: "ADD_TRANSITION"; clipId: string; transition: VideoTransition; position: "IN" | "OUT" }
  | { type: "ADD_SUBTITLE"; trackId: string; cue: SubtitleCue }
  | { type: "UPDATE_SUBTITLE"; trackId: string; cueId: string; updates: Partial<SubtitleCue> }
  | { type: "REMOVE_SUBTITLE"; trackId: string; cueId: string }
  | { type: "SET_TIMELINE_DURATION"; durationMs: number };

export interface VideoChangeSet {
  id: string;
  artifactId: string;
  title: string;
  summary: string;
  operations: VideoOperation[];
  plan?: VideoCreationPlan;
  createdBy: "ATHENA" | "USER";
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  createdAt: string;
}

export interface VideoExportOptions {
  format: VideoExportFormat;
  resolution?: { width: number; height: number };
  frameRate?: FrameRate;
  profile?: VideoRenderProfile;
  includeAudio?: boolean;
}

export interface VideoExportResult {
  success: boolean;
  format: VideoExportFormat;
  assetId?: string;
  dataUrl?: string;
  blob?: Blob;
  sizeBytes?: number;
  durationMs?: number;
  jobId?: string;
  warnings?: string[];
  error?: string;
}

export interface VideoCommandHistoryState {
  past: VideoDocumentState[];
  future: VideoDocumentState[];
}

