import {
  AudioTrack,
  AudioClip,
  AudioOperation,
  AudioChangeSet,
  AudioTrackType,
} from "./types";
import { audioService } from "./audio-service";

export class AthenaAudioActions {
  /**
   * Generates operations to trim a clip by start and end offsets.
   */
  public trimClip(
    clip: AudioClip,
    newSourceStartMs: number,
    newSourceEndMs: number
  ): AudioOperation {
    return {
      type: "TRIM_CLIP",
      clipId: clip.id,
      sourceStartMs: newSourceStartMs,
      sourceEndMs: newSourceEndMs,
    };
  }

  /**
   * Generates operations to move a clip to a new position or track.
   */
  public moveClip(
    clipId: string,
    newTimelineStartMs: number,
    newTrackId?: string
  ): AudioOperation {
    return {
      type: "MOVE_CLIP",
      clipId,
      newTimelineStartMs,
      newTrackId,
    };
  }

  /**
   * Sets track volume or pan.
   */
  public updateTrack(
    trackId: string,
    updates: Partial<Pick<AudioTrack, "volume" | "pan" | "muted" | "solo">>
  ): AudioOperation {
    return {
      type: "UPDATE_TRACK",
      trackId,
      updates,
    };
  }

  /**
   * Applies fade in / fade out to a clip.
   */
  public applyFade(
    clipId: string,
    fadeInMs?: number,
    fadeOutMs?: number
  ): AudioOperation {
    return {
      type: "SET_CLIP_FADE",
      clipId,
      fadeInMs,
      fadeOutMs,
    };
  }

  /**
   * Creates a new audio track.
   */
  public createTrack(
    name: string,
    type: AudioTrackType = "AUDIO",
    color?: string
  ): AudioTrack {
    return {
      id: `track-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      name,
      type,
      muted: false,
      solo: false,
      volume: 1.0,
      pan: 0.0,
      clips: [],
      effects: [],
      color: color || (type === "VOICE" ? "#3b82f6" : type === "MUSIC" ? "#8b5cf6" : "#f59e0b"),
    };
  }

  /**
   * Proposes an atomic composition ChangeSet for an audio artifact.
   */
  public proposeTimeline(
    artifactId: string,
    title: string,
    summary: string,
    operations: AudioOperation[]
  ): AudioChangeSet {
    return audioService.proposeChangeSet(artifactId, title, summary, operations, "ATHENA");
  }
}

export const athenaAudioActions = new AthenaAudioActions();

