import {
  VideoTrack,
  VideoClip,
  VideoScene,
  VideoOperation,
  VideoChangeSet,
  VideoCreationPlan,
  SubtitleCue,
  VideoTrackType,
  VideoTransition,
} from "./types";
import { videoService } from "./video-service";

export class AthenaVideoActions {
  /**
   * Creates a new semantic scene.
   */
  public createScene(
    name: string,
    startMs: number,
    endMs: number,
    description?: string,
    relatedClipIds: string[] = []
  ): VideoScene {
    return {
      id: `scene-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      name,
      startMs,
      endMs,
      description,
      relatedClipIds,
    };
  }

  /**
   * Generates operations to trim a video/image/audio clip.
   */
  public trimClip(
    clipId: string,
    newSourceStartMs: number,
    newSourceEndMs: number
  ): VideoOperation {
    return {
      type: "TRIM_CLIP",
      clipId,
      sourceStartMs: newSourceStartMs,
      sourceEndMs: newSourceEndMs,
    };
  }

  /**
   * Generates operations to move a clip.
   */
  public moveClip(
    clipId: string,
    newTimelineStartMs: number,
    newTrackId?: string
  ): VideoOperation {
    return {
      type: "MOVE_CLIP",
      clipId,
      newTimelineStartMs,
      newTrackId,
    };
  }

  /**
   * Adds a transition (FADE, CROSSFADE) to a clip.
   */
  public addTransition(
    clipId: string,
    type: "CUT" | "FADE" | "CROSSFADE" | "DISSOLVE" = "FADE",
    durationMs: number = 1000,
    position: "IN" | "OUT" = "IN"
  ): VideoOperation {
    return {
      type: "ADD_TRANSITION",
      clipId,
      transition: { id: `tr-${Date.now()}`, type, durationMs },
      position,
    };
  }

  /**
   * Adds a subtitle cue.
   */
  public addSubtitle(
    trackId: string,
    startMs: number,
    endMs: number,
    text: string
  ): VideoOperation {
    return {
      type: "ADD_SUBTITLE",
      trackId,
      cue: {
        id: `cue-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        startMs,
        endMs,
        text,
      },
    };
  }

  /**
   * Orchestrates a complete Video Draft from existing assets and a textual prompt.
   * Produces an inspectable VideoCreationPlan and atomic VideoChangeSet.
   */
  public orchestratePromptToVideo(params: {
    artifactId: string;
    prompt: string;
    scriptText?: string;
    visualAssetIds: string[];
    narrationAssetId?: string;
    musicAssetId?: string;
    targetDurationMs?: number;
  }): VideoChangeSet {
    const totalDurationMs = params.targetDurationMs || 45000;
    const sceneDuration = Math.round(totalDurationMs / Math.max(1, params.visualAssetIds.length));

    // 1. Generate inspectable VideoCreationPlan
    const plan: VideoCreationPlan = {
      title: `Plano Audiovisual: ${params.prompt.slice(0, 40)}`,
      targetDurationMs: totalDurationMs,
      scenes: params.visualAssetIds.map((assetId, idx) => ({
        name: `Cena ${idx + 1}: ${idx === 0 ? "Introdução" : idx === params.visualAssetIds.length - 1 ? "Encerramento" : "Desenvolvimento"}`,
        durationMs: sceneDuration,
        visualAssetIds: [assetId],
        titles: [`Destaque #${idx + 1}`],
      })),
      musicAssetId: params.musicAssetId,
    };

    // 2. Generate deterministic operations
    const operations: VideoOperation[] = [];

    // Scenes
    params.visualAssetIds.forEach((assetId, idx) => {
      const startMs = idx * sceneDuration;
      const endMs = Math.min(totalDurationMs, startMs + sceneDuration);
      const scene = this.createScene(`Cena ${idx + 1}`, startMs, endMs, `Asset ${assetId}`);
      operations.push({ type: "CREATE_SCENE", scene });
    });

    // Timeline duration
    operations.push({ type: "SET_TIMELINE_DURATION", durationMs: totalDurationMs });

    return videoService.proposeChangeSet(
      params.artifactId,
      `Orquestração Audiovisual: ${params.prompt.slice(0, 40)}`,
      `Athena estruturou ${plan.scenes.length} cenas sincronizadas com ${params.visualAssetIds.length} assets visuais.`,
      operations,
      plan,
      "ATHENA"
    );
  }
}

export const athenaVideoActions = new AthenaVideoActions();

