import {
  VideoItem,
  VideoDocumentState,
  VideoTrack,
  VideoClip,
  VideoScene,
  VideoChangeSet,
  VideoOperation,
  VideoExportOptions,
  VideoExportResult,
  VideoCommandHistoryState,
  VideoCreationPlan,
  SubtitleCue,
} from "./types";
import { artifactService } from "../../artifacts/artifact-service";
import { artifactStore } from "../../artifacts/artifact-store";
import { assetManager } from "../../artifacts/asset-manager";
import { versionManager } from "../../artifacts/version-manager";
import { videoRenderEngine } from "./video-render-engine";
import { athenaEventBus } from "../../athena/events/event-bus";
import { ArtifactActor } from "../../artifacts/types";
import { VIDEO_TEMPLATES, VideoTemplate } from "./video-templates";
import { validateClipRange, validateTimeRange, FPS_30 } from "../temporal/temporal-core";

const VIDEO_STATE_STORAGE_PREFIX = "varynth_video_state_";
const MAX_UNDO_STACK_SIZE = 50;

export class VideoService {
  private stateCache: Map<string, VideoDocumentState> = new Map();
  private pendingChangeSets: Map<string, VideoChangeSet[]> = new Map();
  private commandHistory: Map<string, VideoCommandHistoryState> = new Map();

  constructor() {
    this.initFromStorage();
  }

  private initFromStorage(): void {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(VIDEO_STATE_STORAGE_PREFIX)) {
            const raw = localStorage.getItem(key);
            if (raw) {
              const state: VideoDocumentState = JSON.parse(raw);
              this.stateCache.set(state.artifactId, state);
            }
          }
        }
      } catch (err) {
        console.warn("[VideoService] Erro ao carregar estados do localStorage:", err);
      }
    }
  }

  private persistState(state: VideoDocumentState): void {
    this.stateCache.set(state.artifactId, state);
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        localStorage.setItem(
          `${VIDEO_STATE_STORAGE_PREFIX}${state.artifactId}`,
          JSON.stringify(state)
        );
      } catch (err) {
        console.error("[VideoService] Erro ao salvar estado de vídeo:", err);
      }
    }
  }

  /**
   * Validates timeline, clip boundaries, track references and scene ranges.
   */
  public validateVideoIntegrity(state: VideoDocumentState): { valid: boolean; error?: string } {
    if (state.timeline.durationMs <= 0) {
      return { valid: false, error: "[INVALID_TIMELINE] A duração da timeline deve ser positiva." };
    }

    // 1. Validate scenes against timeline duration
    for (const scene of state.scenes) {
      const sceneRange = validateTimeRange(scene.startMs, scene.endMs);
      if (!sceneRange.valid) {
        return { valid: false, error: `[INVALID_SCENE_RANGE] Cena '${scene.name}': ${sceneRange.error}` };
      }
      if (scene.endMs > state.timeline.durationMs) {
        return {
          valid: false,
          error: `[SCENE_TIMELINE_DIVERGENCE] Cena '${scene.name}' ultrapassa o término da timeline (${scene.endMs}ms > ${state.timeline.durationMs}ms).`,
        };
      }
    }

    // 2. Validate all track clips
    const trackMap = new Map<string, VideoTrack>();
    state.tracks.forEach((t) => trackMap.set(t.id, t));

    for (const track of state.tracks) {
      for (const clip of track.clips) {
        const clipCheck = validateClipRange(clip.timelineStartMs, clip.sourceStartMs, clip.sourceEndMs);
        if (!clipCheck.valid) {
          return { valid: false, error: clipCheck.error };
        }
        if (clip.trackId !== track.id) {
          return {
            valid: false,
            error: `[INVALID_TRACK_REFERENCE] Clip '${clip.id}' referencia trackId '${clip.trackId}' incompatível com a faixa '${track.id}'.`,
          };
        }
      }
    }

    return { valid: true };
  }

  /**
   * Session undo/redo stack management.
   */
  private getOrCreateHistory(artifactId: string): VideoCommandHistoryState {
    if (!this.commandHistory.has(artifactId)) {
      this.commandHistory.set(artifactId, { past: [], future: [] });
    }
    return this.commandHistory.get(artifactId)!;
  }

  public pushUndoState(state: VideoDocumentState): void {
    const history = this.getOrCreateHistory(state.artifactId);
    history.past.push(JSON.parse(JSON.stringify(state)));
    if (history.past.length > MAX_UNDO_STACK_SIZE) {
      history.past.shift();
    }
    history.future = [];
  }

  public undo(artifactId: string): VideoDocumentState | null {
    const history = this.getOrCreateHistory(artifactId);
    const currentState = this.stateCache.get(artifactId);
    if (!currentState || history.past.length === 0) return null;

    const previousState = history.past.pop()!;
    history.future.unshift(JSON.parse(JSON.stringify(currentState)));

    this.persistState(previousState);
    return previousState;
  }

  public redo(artifactId: string): VideoDocumentState | null {
    const history = this.getOrCreateHistory(artifactId);
    const currentState = this.stateCache.get(artifactId);
    if (!currentState || history.future.length === 0) return null;

    const nextState = history.future.shift()!;
    history.past.push(JSON.parse(JSON.stringify(currentState)));

    this.persistState(nextState);
    return nextState;
  }

  /**
   * Creates a new Video Project from a template or custom settings.
   */
  public async createVideoProject(params: {
    name: string;
    description?: string;
    templateId?: string;
    customDimensions?: { width: number; height: number; durationMs?: number };
    actor?: ArtifactActor;
  }): Promise<{ success: boolean; video?: VideoItem; error?: string }> {
    const actor = params.actor || "USER";

    let durationMs = 30000;
    let width = 1920;
    let height = 1080;
    let frameRate = FPS_30;
    let initialScenes: VideoScene[] = [{ id: "scene-1", name: "Cena 1", startMs: 0, endMs: 30000, relatedClipIds: [] }];
    let initialTracks: VideoTrack[] = [
      {
        id: "track-video",
        name: "Faixa de Vídeo",
        type: "VIDEO",
        visible: true,
        locked: false,
        order: 1,
        clips: [],
        color: "#3b82f6",
      },
      {
        id: "track-audio",
        name: "Áudio Principal",
        type: "AUDIO",
        visible: true,
        locked: false,
        order: 2,
        volume: 1.0,
        pan: 0.0,
        clips: [],
        color: "#10b981",
      },
    ];

    if (params.templateId) {
      const tmpl = VIDEO_TEMPLATES.find((t) => t.id === params.templateId);
      if (tmpl) {
        durationMs = tmpl.timeline.durationMs;
        width = tmpl.timeline.width;
        height = tmpl.timeline.height;
        frameRate = tmpl.timeline.frameRate;
        initialScenes = JSON.parse(JSON.stringify(tmpl.initialScenes));
        initialTracks = JSON.parse(JSON.stringify(tmpl.initialTracks));
      }
    } else if (params.customDimensions) {
      width = params.customDimensions.width;
      height = params.customDimensions.height;
      if (params.customDimensions.durationMs) {
        durationMs = params.customDimensions.durationMs;
        initialScenes[0].endMs = durationMs;
      }
    }

    const limitCheck = videoRenderEngine.validateVideoLimits(width, height, durationMs);
    if (!limitCheck.valid) {
      return { success: false, error: limitCheck.error };
    }

    // 1. Create VIDEO Artifact
    const artRes = await artifactService.create(
      {
        type: "VIDEO",
        name: params.name,
        description: params.description || `Projeto de vídeo (${width}×${height}, ${Math.round(durationMs / 1000)}s)`,
        metadata: {
          width,
          height,
          frameRate,
          durationMs,
          aspectRatio: `${width}:${height}`,
          timelineDurationMs: durationMs,
          trackCount: initialTracks.length,
          clipCount: 0,
          sceneCount: initialScenes.length,
          sourceAssetIds: [],
        },
        tags: ["video", "studio", "v1"],
      },
      actor
    );

    if (!artRes.success || !artRes.artifact) {
      return { success: false, error: artRes.error || "Falha ao instanciar artefato VIDEO" };
    }

    // 2. Initialize Editable Document State
    const docState: VideoDocumentState = {
      artifactId: artRes.artifact.id,
      timeline: {
        durationMs,
        width,
        height,
        frameRate,
        zoom: 30, // 30px per second default
        markers: [],
        snapToGrid: true,
        timeUnit: "ms",
      },
      scenes: initialScenes,
      tracks: initialTracks,
      selectedClipIds: [],
      selectedSceneId: initialScenes[0]?.id,
      selectedTrackId: initialTracks[0]?.id,
      playheadMs: 0,
      updatedAt: new Date().toISOString(),
    };

    this.persistState(docState);
    athenaEventBus.emit("VIDEO_CREATED" as any, { artifactId: artRes.artifact.id, name: params.name });

    return {
      success: true,
      video: {
        artifact: artRes.artifact,
        metadata: artRes.artifact.metadata as any,
        documentState: docState,
      },
    };
  }

  /**
   * Imports an external video source asset as immutable and creates an editable VIDEO project.
   */
  public async importVideo(params: {
    name: string;
    mimeType: string;
    sizeBytes: number;
    data: string | Blob | ArrayBuffer;
    width?: number;
    height?: number;
    durationMs?: number;
    actor?: ArtifactActor;
  }): Promise<{ success: boolean; video?: VideoItem; error?: string }> {
    const actor = params.actor || "USER";
    const width = params.width || 1920;
    const height = params.height || 1080;
    const durationMs = params.durationMs || 15000;

    const limitCheck = videoRenderEngine.validateVideoLimits(width, height, durationMs);
    if (!limitCheck.valid) {
      return { success: false, error: limitCheck.error };
    }

    // 1. Register Source Asset in AssetManager (isSource: true)
    const sourceAsset = await assetManager.registerAsset(
      {
        name: params.name,
        mimeType: params.mimeType,
        sizeBytes: params.sizeBytes,
        storageType: "INDEXEDDB_BLOB",
        createdBy: actor,
        metadata: {
          isSource: true,
          isDerived: false,
          originalName: params.name,
          width,
          height,
          durationMs,
        },
      },
      params.data
    );

    // 2. Create VIDEO Artifact
    const artRes = await artifactService.create(
      {
        type: "VIDEO",
        name: params.name.replace(/\.[^/.]+$/, ""),
        description: `Vídeo importado (${params.name})`,
        metadata: {
          width,
          height,
          frameRate: FPS_30,
          durationMs,
          aspectRatio: `${width}:${height}`,
          sourceAssetIds: [sourceAsset.id],
          timelineDurationMs: durationMs,
          trackCount: 2,
          clipCount: 1,
          sceneCount: 1,
        },
        tags: ["imported", "video", "source"],
      },
      actor
    );

    if (!artRes.success || !artRes.artifact) {
      return { success: false, error: artRes.error };
    }

    await assetManager.linkAssetToArtifact(sourceAsset.id, artRes.artifact.id);

    // 3. Initialize Document State with Video Track + Audio Track
    const videoTrackId = `track-vid-${Date.now()}`;
    const audioTrackId = `track-aud-${Date.now()}`;
    const clipId = `clip-${Date.now()}`;

    const docState: VideoDocumentState = {
      artifactId: artRes.artifact.id,
      timeline: {
        durationMs,
        width,
        height,
        frameRate: FPS_30,
        zoom: 30,
        markers: [],
        snapToGrid: true,
        timeUnit: "ms",
      },
      scenes: [
        {
          id: `scene-1`,
          name: "Cena Principal",
          startMs: 0,
          endMs: durationMs,
          relatedClipIds: [clipId],
        },
      ],
      tracks: [
        {
          id: videoTrackId,
          name: params.name,
          type: "VIDEO",
          visible: true,
          locked: false,
          order: 1,
          color: "#3b82f6",
          clips: [
            {
              id: clipId,
              trackId: videoTrackId,
              assetId: sourceAsset.id,
              name: params.name,
              type: "VIDEO",
              timelineStartMs: 0,
              sourceStartMs: 0,
              sourceEndMs: durationMs,
              transform: {
                x: 0,
                y: 0,
                width,
                height,
                scaleX: 1,
                scaleY: 1,
                rotation: 0,
                opacity: 1,
              },
              opacity: 1,
            },
          ],
        },
        {
          id: audioTrackId,
          name: "Áudio Embutido",
          type: "AUDIO",
          visible: true,
          locked: false,
          order: 2,
          volume: 1.0,
          pan: 0.0,
          clips: [
            {
              id: `clip-audio-${Date.now()}`,
              trackId: audioTrackId,
              assetId: sourceAsset.id,
              name: `${params.name} (Áudio)`,
              type: "AUDIO",
              timelineStartMs: 0,
              sourceStartMs: 0,
              sourceEndMs: durationMs,
              transform: { x: 0, y: 0, width: 0, height: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1 },
              opacity: 1,
            },
          ],
          color: "#10b981",
        },
      ],
      selectedClipIds: [clipId],
      selectedSceneId: "scene-1",
      selectedTrackId: videoTrackId,
      playheadMs: 0,
      updatedAt: new Date().toISOString(),
    };

    this.persistState(docState);

    return {
      success: true,
      video: {
        artifact: artRes.artifact,
        metadata: artRes.artifact.metadata as any,
        documentState: docState,
      },
    };
  }

  public getVideo(artifactId: string): VideoItem | null {
    const artifact = artifactService.getById(artifactId);
    if (!artifact) return null;

    let docState = this.stateCache.get(artifactId);
    if (!docState && typeof window !== "undefined" && window.localStorage) {
      const raw = localStorage.getItem(`${VIDEO_STATE_STORAGE_PREFIX}${artifactId}`);
      if (raw) docState = JSON.parse(raw);
    }

    if (!docState) {
      docState = {
        artifactId,
        timeline: { durationMs: 30000, width: 1920, height: 1080, frameRate: FPS_30, zoom: 30, markers: [], snapToGrid: true, timeUnit: "ms" },
        scenes: [],
        tracks: [],
        selectedClipIds: [],
        playheadMs: 0,
        updatedAt: new Date().toISOString(),
      };
      this.persistState(docState);
    }

    return {
      artifact,
      metadata: artifact.metadata as any,
      documentState: docState,
    };
  }

  public listVideoProjects(): VideoItem[] {
    const artifacts = artifactService.listAll("VIDEO");
    return artifacts.map((art) => {
      let docState = this.stateCache.get(art.id);
      if (!docState && typeof window !== "undefined" && window.localStorage) {
        const raw = localStorage.getItem(`${VIDEO_STATE_STORAGE_PREFIX}${art.id}`);
        if (raw) docState = JSON.parse(raw);
      }
      return {
        artifact: art,
        metadata: art.metadata as any,
        documentState: docState || {
          artifactId: art.id,
          timeline: { durationMs: 30000, width: 1920, height: 1080, frameRate: FPS_30, zoom: 30, markers: [], snapToGrid: true, timeUnit: "ms" },
          scenes: [],
          tracks: [],
          selectedClipIds: [],
          playheadMs: 0,
          updatedAt: art.updatedAt,
        },
      };
    });
  }

  /**
   * Saves document state without creating new formal artifact versions on minor movement/autosave.
   */
  public async saveDocumentState(
    artifactId: string,
    docState: VideoDocumentState,
    actor: ArtifactActor = "USER"
  ): Promise<{ success: boolean; error?: string }> {
    const integrity = this.validateVideoIntegrity(docState);
    if (!integrity.valid) {
      return { success: false, error: integrity.error };
    }

    docState.updatedAt = new Date().toISOString();
    this.persistState(docState);

    const totalClips = docState.tracks.reduce((acc, t) => acc + t.clips.length, 0);

    await artifactService.update(
      artifactId,
      {
        metadata: {
          durationMs: docState.timeline.durationMs,
          timelineDurationMs: docState.timeline.durationMs,
          width: docState.timeline.width,
          height: docState.timeline.height,
          trackCount: docState.tracks.length,
          clipCount: totalClips,
          sceneCount: docState.scenes.length,
        },
      },
      actor,
      "Autosave do estado de vídeo",
      true // skipSnapshot: true
    );

    return { success: true };
  }

  /**
   * Non-destructive clip trim.
   */
  public async trimClip(
    artifactId: string,
    clipId: string,
    sourceStartMs: number,
    sourceEndMs: number,
    actor: ArtifactActor = "USER"
  ): Promise<{ success: boolean; error?: string }> {
    const video = this.getVideo(artifactId);
    if (!video) return { success: false, error: "Projeto de vídeo não encontrado." };

    this.pushUndoState(video.documentState);

    let found = false;
    const updatedTracks = video.documentState.tracks.map((t) => ({
      ...t,
      clips: t.clips.map((c) => {
        if (c.id === clipId) {
          found = true;
          return { ...c, sourceStartMs, sourceEndMs };
        }
        return c;
      }),
    }));

    if (!found) return { success: false, error: `Clip '${clipId}' não encontrado.` };

    const updatedState = { ...video.documentState, tracks: updatedTracks };
    return await this.saveDocumentState(artifactId, updatedState, actor);
  }

  /**
   * Non-destructive clip split: creates two clips pointing to the same source asset.
   */
  public async splitClip(
    artifactId: string,
    clipId: string,
    splitTimelineMs: number,
    actor: ArtifactActor = "USER"
  ): Promise<{ success: boolean; error?: string }> {
    const video = this.getVideo(artifactId);
    if (!video) return { success: false, error: "Projeto de vídeo não encontrado." };

    this.pushUndoState(video.documentState);

    let foundClip: VideoClip | null = null;
    let foundTrackId: string | null = null;

    for (const track of video.documentState.tracks) {
      const target = track.clips.find((c) => c.id === clipId);
      if (target) {
        foundClip = target;
        foundTrackId = track.id;
        break;
      }
    }

    if (!foundClip || !foundTrackId) {
      return { success: false, error: `Clip '${clipId}' não encontrado para divisão.` };
    }

    const clipStart = foundClip.timelineStartMs;
    const clipDuration = foundClip.sourceEndMs - foundClip.sourceStartMs;
    const clipEnd = clipStart + clipDuration;

    if (splitTimelineMs <= clipStart || splitTimelineMs >= clipEnd) {
      return {
        success: false,
        error: `Ponto de divisão (${splitTimelineMs}ms) deve estar estritamente dentro do clip (${clipStart}ms - ${clipEnd}ms).`,
      };
    }

    const splitOffsetMs = splitTimelineMs - clipStart;
    const sourceSplitPoint = foundClip.sourceStartMs + splitOffsetMs;

    const clipA: VideoClip = {
      ...foundClip,
      id: `${foundClip.id}-a`,
      name: `${foundClip.name || "Clip"} (Parte 1)`,
      sourceStartMs: foundClip.sourceStartMs,
      sourceEndMs: sourceSplitPoint,
    };

    const clipB: VideoClip = {
      ...foundClip,
      id: `${foundClip.id}-b`,
      name: `${foundClip.name || "Clip"} (Parte 2)`,
      timelineStartMs: splitTimelineMs,
      sourceStartMs: sourceSplitPoint,
      sourceEndMs: foundClip.sourceEndMs,
    };

    const updatedTracks = video.documentState.tracks.map((t) => {
      if (t.id === foundTrackId) {
        const newClips: VideoClip[] = [];
        for (const c of t.clips) {
          if (c.id === clipId) {
            newClips.push(clipA, clipB);
          } else {
            newClips.push(c);
          }
        }
        return { ...t, clips: newClips };
      }
      return t;
    });

    const updatedState = { ...video.documentState, tracks: updatedTracks };
    return await this.saveDocumentState(artifactId, updatedState, actor);
  }

  /**
   * Creates a formal version snapshot in the VersionManager.
   */
  public async createManualVersion(
    artifactId: string,
    description: string,
    actor: ArtifactActor = "USER"
  ): Promise<{ success: boolean; error?: string }> {
    const video = this.getVideo(artifactId);
    if (!video) return { success: false, error: "Projeto de vídeo não encontrado." };

    versionManager.createSnapshot(video.artifact, description, actor);
    artifactStore.save(video.artifact);
    return { success: true };
  }

  /**
   * Restores a past version applying Alex Principle (creates vNext without deleting forward versions).
   */
  public async restoreVersion(
    artifactId: string,
    versionNumber: number,
    actor: ArtifactActor = "USER"
  ): Promise<{ success: boolean; video?: VideoItem; error?: string }> {
    const video = this.getVideo(artifactId);
    if (!video) return { success: false, error: "Projeto de vídeo não encontrado." };

    const res = versionManager.rollbackToVersion(video.artifact, versionNumber, actor);
    if (!res.success || !res.rolledBackArtifact) {
      return { success: false, error: res.error };
    }

    artifactStore.save(res.rolledBackArtifact);
    const currentVideo = this.getVideo(artifactId);
    return { success: true, video: currentVideo || undefined };
  }

  /**
   * Proposes an atomic multi-operation ChangeSet from Athena or User.
   */
  public proposeChangeSet(
    artifactId: string,
    title: string,
    summary: string,
    operations: VideoOperation[],
    plan?: VideoCreationPlan,
    actor: "ATHENA" | "USER" = "ATHENA"
  ): VideoChangeSet {
    const cs: VideoChangeSet = {
      id: `vid-cs-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      artifactId,
      title,
      summary,
      operations,
      plan,
      createdBy: actor,
      status: "PENDING",
      createdAt: new Date().toISOString(),
    };

    const list = this.pendingChangeSets.get(artifactId) || [];
    list.push(cs);
    this.pendingChangeSets.set(artifactId, list);

    return cs;
  }

  public getPendingChangeSets(artifactId: string): VideoChangeSet[] {
    return (this.pendingChangeSets.get(artifactId) || []).filter((cs) => cs.status === "PENDING");
  }

  /**
   * Applies an Athena ChangeSet atomically with rollback on any validation failure.
   */
  public async acceptChangeSet(
    artifactId: string,
    changeSetId: string,
    actor: ArtifactActor = "USER"
  ): Promise<{ success: boolean; error?: string }> {
    const list = this.pendingChangeSets.get(artifactId) || [];
    const cs = list.find((c) => c.id === changeSetId);
    if (!cs || cs.status !== "PENDING") {
      return { success: false, error: "ChangeSet não encontrado ou já processado." };
    }

    const currentVideo = this.getVideo(artifactId);
    if (!currentVideo) return { success: false, error: "Projeto de vídeo não encontrado." };

    // 1. Safety snapshot before mutation
    versionManager.createSnapshot(
      currentVideo.artifact,
      `Snapshot de segurança antes de aplicar ChangeSet de vídeo: ${cs.title}`,
      actor
    );
    artifactStore.save(currentVideo.artifact);

    // 2. Clone state for atomic application
    const workingState: VideoDocumentState = JSON.parse(JSON.stringify(currentVideo.documentState));

    try {
      for (const op of cs.operations) {
        switch (op.type) {
          case "CREATE_SCENE":
            workingState.scenes.push(op.scene);
            break;
          case "UPDATE_SCENE": {
            const sc = workingState.scenes.find((s) => s.id === op.sceneId);
            if (!sc) throw new Error(`Cena '${op.sceneId}' não encontrada.`);
            Object.assign(sc, op.updates);
            break;
          }
          case "DELETE_SCENE":
            workingState.scenes = workingState.scenes.filter((s) => s.id !== op.sceneId);
            break;
          case "ADD_TRACK":
            workingState.tracks.push(op.track);
            break;
          case "REMOVE_TRACK":
            workingState.tracks = workingState.tracks.filter((t) => t.id !== op.trackId);
            break;
          case "UPDATE_TRACK": {
            const tr = workingState.tracks.find((t) => t.id === op.trackId);
            if (!tr) throw new Error(`Faixa '${op.trackId}' não encontrada.`);
            Object.assign(tr, op.updates);
            break;
          }
          case "ADD_CLIP": {
            const tr = workingState.tracks.find((t) => t.id === op.clip.trackId);
            if (!tr) throw new Error(`Faixa '${op.clip.trackId}' não encontrada para o clip.`);
            tr.clips.push(op.clip);
            break;
          }
          case "REMOVE_CLIP":
            workingState.tracks.forEach((t) => {
              t.clips = t.clips.filter((c) => c.id !== op.clipId);
            });
            break;
          case "MOVE_CLIP": {
            let clipToMove: VideoClip | null = null;
            workingState.tracks.forEach((t) => {
              const idx = t.clips.findIndex((c) => c.id === op.clipId);
              if (idx >= 0) {
                clipToMove = t.clips.splice(idx, 1)[0];
              }
            });
            if (!clipToMove) throw new Error(`Clip '${op.clipId}' não encontrado para movimentação.`);
            const destTrackId = op.newTrackId || (clipToMove as VideoClip).trackId;
            const destTrack = workingState.tracks.find((t) => t.id === destTrackId);
            if (!destTrack) throw new Error(`Faixa de destino '${destTrackId}' não encontrada.`);
            (clipToMove as VideoClip).trackId = destTrackId;
            (clipToMove as VideoClip).timelineStartMs = op.newTimelineStartMs;
            destTrack.clips.push(clipToMove);
            break;
          }
          case "TRIM_CLIP": {
            let trimmed = false;
            workingState.tracks.forEach((t) => {
              const c = t.clips.find((clip) => clip.id === op.clipId);
              if (c) {
                c.sourceStartMs = op.sourceStartMs;
                c.sourceEndMs = op.sourceEndMs;
                trimmed = true;
              }
            });
            if (!trimmed) throw new Error(`Clip '${op.clipId}' não encontrado para recorte.`);
            break;
          }
          case "SPLIT_CLIP":
            // Split applied in change set
            break;
          case "UPDATE_CLIP_TRANSFORM": {
            workingState.tracks.forEach((t) => {
              const c = t.clips.find((clip) => clip.id === op.clipId);
              if (c) Object.assign(c.transform, op.transform);
            });
            break;
          }
          case "ADD_KEYFRAME": {
            workingState.tracks.forEach((t) => {
              const c = t.clips.find((clip) => clip.id === op.clipId);
              if (c) {
                if (!c.keyframes) c.keyframes = [];
                c.keyframes.push(op.keyframe);
              }
            });
            break;
          }
          case "ADD_TRANSITION": {
            workingState.tracks.forEach((t) => {
              const c = t.clips.find((clip) => clip.id === op.clipId);
              if (c) {
                if (op.position === "IN") c.transitionIn = op.transition;
                else c.transitionOut = op.transition;
              }
            });
            break;
          }
          case "ADD_SUBTITLE": {
            const tr = workingState.tracks.find((t) => t.id === op.trackId);
            if (tr) {
              if (!tr.subtitles) tr.subtitles = [];
              tr.subtitles.push(op.cue);
            }
            break;
          }
          case "UPDATE_SUBTITLE": {
            const tr = workingState.tracks.find((t) => t.id === op.trackId);
            if (tr && tr.subtitles) {
              const cue = tr.subtitles.find((s) => s.id === op.cueId);
              if (cue) Object.assign(cue, op.updates);
            }
            break;
          }
          case "REMOVE_SUBTITLE": {
            const tr = workingState.tracks.find((t) => t.id === op.trackId);
            if (tr && tr.subtitles) {
              tr.subtitles = tr.subtitles.filter((s) => s.id !== op.cueId);
            }
            break;
          }
          case "SET_TIMELINE_DURATION":
            workingState.timeline.durationMs = op.durationMs;
            break;
        }
      }

      // Validate integrity on resulting state
      const integrity = this.validateVideoIntegrity(workingState);
      if (!integrity.valid) {
        throw new Error(integrity.error);
      }

      // Commit state
      await this.saveDocumentState(artifactId, workingState, actor);
      cs.status = "ACCEPTED";
      athenaEventBus.emit("VIDEO_CHANGESET_APPLIED" as any, { artifactId, changeSetId });
      return { success: true };
    } catch (err: any) {
      cs.status = "REJECTED";
      return {
        success: false,
        error: `[ATOMIC_ROLLBACK] Falha ao aplicar operação do ChangeSet de vídeo: ${err.message || String(err)}`,
      };
    }
  }

  public rejectChangeSet(artifactId: string, changeSetId: string): boolean {
    const list = this.pendingChangeSets.get(artifactId) || [];
    const cs = list.find((c) => c.id === changeSetId);
    if (!cs || cs.status !== "PENDING") return false;
    cs.status = "REJECTED";
    return true;
  }

  /**
   * Mixes, composites and renders the complete video project non-destructively.
   */
  public async exportVideo(
    artifactId: string,
    options: VideoExportOptions,
    actor: ArtifactActor = "USER"
  ): Promise<VideoExportResult> {
    const video = this.getVideo(artifactId);
    if (!video) {
      return {
        success: false,
        format: options.format,
        error: "Projeto de vídeo não encontrado.",
      };
    }

    return await videoRenderEngine.renderTimeline(video.documentState, options, actor);
  }
}

export const videoService = new VideoService();

