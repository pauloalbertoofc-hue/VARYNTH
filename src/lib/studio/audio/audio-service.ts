import {
  AudioItem,
  AudioDocumentState,
  AudioTrack,
  AudioClip,
  AudioChangeSet,
  AudioOperation,
  AudioExportOptions,
  AudioExportResult,
  AudioCommandHistoryState,
  AudioTimelineMarker,
  AudioBus,
  AudioAutomationPoint,
  AudioStemsExportResult,
} from "./types";
import { artifactService } from "../../artifacts/artifact-service";
import { artifactStore } from "../../artifacts/artifact-store";
import { assetManager } from "../../artifacts/asset-manager";
import { versionManager } from "../../artifacts/version-manager";
import { audioRenderEngine } from "./audio-render-engine";
import { athenaEventBus } from "../../athena/events/event-bus";
import { ArtifactActor } from "../../artifacts/types";
import { AUDIO_TEMPLATES, AudioTemplate } from "./audio-templates";
import { migrateAudioProject, CURRENT_AUDIO_SCHEMA_VERSION } from "./audio-migrations";
import { defaultMusicProject } from "./music-domain";
import { validateLoop } from "./game-audio-domain";
import { probeAudioDurationMs, readWavAudioMetadata } from "./audio-metadata";

const AUDIO_STATE_STORAGE_PREFIX = "varynth_audio_state_";
const AUDIO_HISTORY_STORAGE_PREFIX = "varynth_audio_history_";
const MAX_UNDO_STACK_SIZE = 50;

export class AudioService {
  private stateCache: Map<string, AudioDocumentState> = new Map();
  private pendingChangeSets: Map<string, AudioChangeSet[]> = new Map();
  private commandHistory: Map<string, AudioCommandHistoryState> = new Map();

  constructor() {
    this.initFromStorage();
  }

  private initFromStorage(): void {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(AUDIO_STATE_STORAGE_PREFIX)) {
            const raw = localStorage.getItem(key);
            if (raw) {
              const state: AudioDocumentState = migrateAudioProject(JSON.parse(raw));
              this.stateCache.set(state.artifactId, state);
            }
          }
        }
      } catch (err) {
        console.warn("[AudioService] Erro ao carregar estados do localStorage:", err);
      }
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (!key || !key.startsWith(AUDIO_HISTORY_STORAGE_PREFIX)) continue;
          const artifactId = key.slice(AUDIO_HISTORY_STORAGE_PREFIX.length);
          const raw = localStorage.getItem(key);
          if (!raw || !this.stateCache.has(artifactId)) continue;
          const parsed = JSON.parse(raw) as Partial<AudioCommandHistoryState>;
          const normalize = (states: unknown) => Array.isArray(states) ? states.slice(-MAX_UNDO_STACK_SIZE).map((state) => migrateAudioProject(state as AudioDocumentState)) : [];
          this.commandHistory.set(artifactId, { past: normalize(parsed.past), future: normalize(parsed.future) });
        }
      } catch (err) {
        console.warn("[AudioService] Erro ao carregar histórico de áudio:", err);
      }
    }
  }

  private persistHistory(artifactId: string): void {
    if (typeof window === "undefined") return;
    try {
      const history = this.getOrCreateHistory(artifactId);
      window.localStorage.setItem(`${AUDIO_HISTORY_STORAGE_PREFIX}${artifactId}`, JSON.stringify(history));
    } catch (err) {
      console.warn("[AudioService] Erro ao salvar histórico de áudio:", err);
    }
  }

  private persistState(state: AudioDocumentState): boolean {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(
          `${AUDIO_STATE_STORAGE_PREFIX}${state.artifactId}`,
          JSON.stringify(state)
        );
        this.stateCache.set(state.artifactId, state);
        return true;
      } catch (err) {
        console.error("[AudioService] Erro ao salvar estado de áudio:", err);
        return false;
      }
    }
    this.stateCache.set(state.artifactId, state);
    return true;
  }

  public persistPendingStateLocally(state: AudioDocumentState): { success: boolean; error?: string } {
    const integrity = this.validateTimelineIntegrity(state);
    if (!integrity.valid) return { success: false, error: integrity.error };
    state.updatedAt = new Date().toISOString();
    if (!this.persistState(state)) {
      return { success: false, error: "[AUDIO_LOCAL_SAVE_FAILED] O armazenamento local recusou o estado pendente. Libere espaço ou exporte um backup antes de continuar." };
    }
    return { success: true };
  }

  /** Keeps a valid in-flight editor snapshot available to async service operations without forcing storage I/O. */
  public stageDocumentState(state: AudioDocumentState): { success: boolean; error?: string } {
    const integrity = this.validateTimelineIntegrity(state);
    if (!integrity.valid) return { success: false, error: integrity.error };
    this.stateCache.set(state.artifactId, state);
    return { success: true };
  }

  /**
   * Validates timeline integrity (boundaries, valid ranges, existing tracks).
   */
  public validateTimelineIntegrity(state: AudioDocumentState): { valid: boolean; error?: string } {
    if (state.timeline.durationMs <= 0) {
      return { valid: false, error: "[INVALID_TIMELINE] A duração da timeline deve ser positiva." };
    }

    const trackMap = new Map<string, AudioTrack>();
    state.tracks.forEach((t) => trackMap.set(t.id, t));

    for (const track of state.tracks) {
      for (const clip of track.clips) {
        if (clip.timelineStartMs < 0) {
          return {
            valid: false,
            error: `[INVALID_CLIP_RANGE] Clip '${clip.id}' possui início negativo na timeline (${clip.timelineStartMs}ms).`,
          };
        }
        if (clip.sourceStartMs < 0 || clip.sourceStartMs >= clip.sourceEndMs) {
          return {
            valid: false,
            error: `[INVALID_CLIP_RANGE] Clip '${clip.id}' possui range de origem inválido (${clip.sourceStartMs}ms a ${clip.sourceEndMs}ms).`,
          };
        }
        if (clip.trackId !== track.id) {
          return {
            valid: false,
            error: `[INVALID_TRACK_REFERENCE] Clip '${clip.id}' referencia trackId '${clip.trackId}' incompatível com a faixa '${track.id}'.`,
          };
        }
        if (clip.loop?.enabled) {
          const loop = validateLoop({ startMs: clip.loop.startMs ?? clip.sourceStartMs, endMs: clip.loop.endMs ?? clip.sourceEndMs, crossfadeMs: clip.loop.crossfadeMs ?? 0, loopable: true }, clip.sourceEndMs);
          if (!loop.valid) return { valid: false, error: `${loop.error} Clip '${clip.id}'.` };
        }
      }
    }

    return { valid: true };
  }

  /**
   * Session undo/redo stack management.
   */
  private getOrCreateHistory(artifactId: string): AudioCommandHistoryState {
    if (!this.commandHistory.has(artifactId)) {
      this.commandHistory.set(artifactId, { past: [], future: [] });
    }
    return this.commandHistory.get(artifactId)!;
  }

  public pushUndoState(state: AudioDocumentState): void {
    const history = this.getOrCreateHistory(state.artifactId);
    history.past.push(JSON.parse(JSON.stringify(state)));
    if (history.past.length > MAX_UNDO_STACK_SIZE) {
      history.past.shift();
    }
    history.future = [];
    this.persistHistory(state.artifactId);
  }

  public canUndo(artifactId: string): boolean { return this.getOrCreateHistory(artifactId).past.length > 0; }
  public canRedo(artifactId: string): boolean { return this.getOrCreateHistory(artifactId).future.length > 0; }

  public undo(artifactId: string): AudioDocumentState | null {
    const history = this.getOrCreateHistory(artifactId);
    const currentState = this.stateCache.get(artifactId);
    if (!currentState || history.past.length === 0) return null;

    const previousState = history.past.pop()!;
    history.future.unshift(JSON.parse(JSON.stringify(currentState)));

    this.persistState(previousState);
    this.persistHistory(artifactId);
    return previousState;
  }

  public redo(artifactId: string): AudioDocumentState | null {
    const history = this.getOrCreateHistory(artifactId);
    const currentState = this.stateCache.get(artifactId);
    if (!currentState || history.future.length === 0) return null;

    const nextState = history.future.shift()!;
    history.past.push(JSON.parse(JSON.stringify(currentState)));

    this.persistState(nextState);
    this.persistHistory(artifactId);
    return nextState;
  }

  /**
   * Creates a new Audio Project from a template or custom timeline.
   */
  public async createAudioProject(params: {
    name: string;
    description?: string;
    templateId?: string;
    customDurationMs?: number;
    actor?: ArtifactActor;
  }): Promise<{ success: boolean; audio?: AudioItem; error?: string }> {
    const actor = params.actor || "USER";

    let durationMs = 30000;
    let initialTracks: AudioTrack[] = [
      {
        id: "track-main",
        name: "Faixa 1",
        type: "AUDIO",
        muted: false,
        solo: false,
        volume: 1.0,
        pan: 0.0,
        clips: [],
        effects: [],
        color: "#3b82f6",
      },
    ];
    let initialMarkers: AudioTimelineMarker[] = [];

    if (params.templateId) {
      const tmpl = AUDIO_TEMPLATES.find((t) => t.id === params.templateId);
      if (tmpl) {
        durationMs = tmpl.timelineDurationMs;
        initialTracks = JSON.parse(JSON.stringify(tmpl.initialTracks));
        initialMarkers = JSON.parse(JSON.stringify(tmpl.initialMarkers || []));
      }
    } else if (params.customDurationMs) {
      durationMs = params.customDurationMs;
    }

    const limitCheck = audioRenderEngine.validateAudioLimits(durationMs);
    if (!limitCheck.valid) {
      return { success: false, error: limitCheck.error };
    }

    // 1. Create AUDIO Artifact
    const artRes = await artifactService.create(
      {
        type: "AUDIO",
        name: params.name,
        description: params.description || `Projeto de áudio multipistas (${Math.round(durationMs / 1000)}s)`,
        metadata: {
          durationMs,
          timelineDurationMs: durationMs,
          documentMode: initialTracks.length > 1 ? "MULTITRACK" : "SINGLE_TRACK",
          trackCount: initialTracks.length,
          clipCount: 0,
          sourceAssetIds: [],
        },
        tags: ["audio", "studio", "v1"],
      },
      actor
    );

    if (!artRes.success || !artRes.artifact) {
      return { success: false, error: artRes.error || "Falha ao instanciar artefato AUDIO" };
    }

    // 2. Initialize Editable Document State
    const docState: AudioDocumentState = {
      projectSchemaVersion: CURRENT_AUDIO_SCHEMA_VERSION,
      music: defaultMusicProject(),
      artifactId: artRes.artifact.id,
      settings: { sampleRate: 44100, bitDepth: 16, channels: 2 },
      timeline: {
        durationMs,
        zoom: 1.0,
        markers: initialMarkers,
        snapToGrid: true,
        timeUnit: "ms",
      },
      tracks: initialTracks,
      buses: [],
      masterBus: { id: "master", name: "Master", volume: 1, pan: 0, muted: false, solo: false, effects: [] },
      automation: [],
      selectedTrackId: initialTracks[0]?.id,
      selectedClipIds: [],
      playheadMs: 0,
      updatedAt: new Date().toISOString(),
    };

    this.persistState(migrateAudioProject(docState));
    athenaEventBus.emit("AUDIO_CREATED" as any, { artifactId: artRes.artifact.id, name: params.name });

    return {
      success: true,
      audio: {
        artifact: artRes.artifact,
        metadata: artRes.artifact.metadata as any,
        documentState: docState,
      },
    };
  }

  /**
   * Imports an external audio file preserving the original source asset as immutable.
   */
  public async importAudio(params: {
    name: string;
    mimeType: string;
    sizeBytes: number;
    data: string | Blob | ArrayBuffer;
    durationMs?: number;
    actor?: ArtifactActor;
  }): Promise<{ success: boolean; audio?: AudioItem; error?: string }> {
    const actor = params.actor || "USER";
    const containerMetadata = params.data instanceof ArrayBuffer ? readWavAudioMetadata(params.data) : null;
    const probedDurationMs = containerMetadata?.durationMs ?? await probeAudioDurationMs(params.data, params.mimeType);
    const approxDurationMs = params.durationMs ?? probedDurationMs;
    if (typeof approxDurationMs !== "number" || !Number.isFinite(approxDurationMs) || approxDurationMs <= 0) return { success: false, error: "[AUDIO_DURATION_UNKNOWN] Não foi possível medir a duração deste arquivo. Nenhum asset ou clip foi criado; use um codec/container legível pelo navegador." };

    // 1. Validate Audio Data & Memory Guard
    const validation = audioRenderEngine.validateAudioData(params.name, params.mimeType, params.data, approxDurationMs);
    if (validation.status !== "VALID_AUDIO") {
      return { success: false, error: validation.error };
    }

    // 2. Register Source Asset in AssetManager (marked as immutable source)
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
          durationMs: approxDurationMs,
          ...(containerMetadata ? { sampleRate: containerMetadata.sampleRate, channels: containerMetadata.channels, bitsPerSample: containerMetadata.bitsPerSample } : {}),
        },
      },
      params.data
    );

    // 3. Generate Waveform Peaks Cache
    void audioRenderEngine.generateWaveformAsync(sourceAsset.id, approxDurationMs, params.data).then((waveform) => {
      // decodeAudioData resamples to the AudioContext rate; it is not the file's source sample rate.
      assetManager.updateAssetMetadata(sourceAsset.id, { durationMs: waveform.durationMs, channels: waveform.channels });
    }).catch((error) => {
      console.error("[AudioService] Falha ao gerar waveform real:", error);
    });

    // 4. Create AUDIO Artifact
    const artRes = await artifactService.create(
      {
        type: "AUDIO",
        name: params.name.replace(/\.[^/.]+$/, ""),
        description: `Áudio importado (${params.name})`,
        metadata: {
          sourceAssetIds: [sourceAsset.id],
          durationMs: approxDurationMs,
          timelineDurationMs: approxDurationMs,
          documentMode: "SINGLE_TRACK",
          trackCount: 1,
          clipCount: 1,
        },
        tags: ["imported", "audio", "source"],
      },
      actor
    );

    if (!artRes.success || !artRes.artifact) {
      return { success: false, error: artRes.error };
    }

    // Link source asset to artifact
    await assetManager.linkAssetToArtifact(sourceAsset.id, artRes.artifact.id);

    // 5. Initialize Document State with a single Track & Clip
    const trackId = `track-${Date.now()}`;
    const clipId = `clip-${Date.now()}`;

    const docState: AudioDocumentState = {
      projectSchemaVersion: CURRENT_AUDIO_SCHEMA_VERSION,
      music: defaultMusicProject(),
      artifactId: artRes.artifact.id,
      settings: { sampleRate: 44100, bitDepth: 16, channels: 2 },
      timeline: {
        durationMs: approxDurationMs,
        zoom: 1.0,
        markers: [],
        snapToGrid: true,
        timeUnit: "ms",
      },
      tracks: [
        {
          id: trackId,
          name: params.name,
          type: "AUDIO",
          muted: false,
          solo: false,
          volume: 1.0,
          pan: 0.0,
          effects: [],
          color: "#3b82f6",
          clips: [
            {
              id: clipId,
              assetId: sourceAsset.id,
              trackId,
              name: params.name,
              timelineStartMs: 0,
              sourceStartMs: 0,
              sourceEndMs: approxDurationMs,
              gain: 1.0,
            },
          ],
        },
      ],
      buses: [],
      masterBus: { id: "master", name: "Master", volume: 1, pan: 0, muted: false, solo: false, effects: [] },
      automation: [],
      selectedTrackId: trackId,
      selectedClipIds: [clipId],
      playheadMs: 0,
      updatedAt: new Date().toISOString(),
    };

    this.persistState(docState);

    return {
      success: true,
      audio: {
        artifact: artRes.artifact,
        metadata: artRes.artifact.metadata as any,
        documentState: docState,
      },
    };
  }

  public async importAssetIntoProject(params: { artifactId: string; name: string; mimeType: string; sizeBytes: number; data: string | Blob | ArrayBuffer; trackId?: string; timelineStartMs?: number; durationMs?: number; actor?: ArtifactActor }): Promise<{ success: boolean; assetId?: string; clipId?: string; error?: string }> {
    const audio = this.getAudio(params.artifactId); if (!audio) return { success: false, error: "Projeto de áudio não encontrado." };
    const containerMetadata = params.data instanceof ArrayBuffer ? readWavAudioMetadata(params.data) : null;
    const probedDurationMs = containerMetadata?.durationMs ?? await probeAudioDurationMs(params.data, params.mimeType);
    const durationMs = params.durationMs ?? probedDurationMs;
    if (typeof durationMs !== "number" || !Number.isFinite(durationMs) || durationMs <= 0) return { success: false, error: "[AUDIO_DURATION_UNKNOWN] Não foi possível medir a duração deste arquivo. Nenhum asset ou clip foi criado; use um codec/container legível pelo navegador." };
    const validation = audioRenderEngine.validateAudioData(params.name, params.mimeType, params.data, durationMs);
    if (validation.status !== "VALID_AUDIO") return { success: false, error: validation.error };
    const asset = await assetManager.registerAsset({ name: params.name, mimeType: params.mimeType, sizeBytes: params.sizeBytes, storageType: "INDEXEDDB_BLOB", createdBy: params.actor || "USER", artifactIds: [params.artifactId], metadata: { isSource: true, isDerived: false, originalName: params.name, durationMs, ...(containerMetadata ? { sampleRate: containerMetadata.sampleRate, channels: containerMetadata.channels, bitsPerSample: containerMetadata.bitsPerSample } : {}), tags: [], loopable: false, variationGroup: "", notes: "" } }, params.data);
    await assetManager.linkAssetToArtifact(asset.id, params.artifactId);
    void audioRenderEngine.generateWaveformAsync(asset.id, durationMs, params.data).then((waveform) => {
      // Preserve a container-reported source rate; decoder context rate is processing metadata only.
      assetManager.updateAssetMetadata(asset.id, { durationMs: waveform.durationMs, channels: waveform.channels });
    }).catch(() => undefined);
    const track = audio.documentState.tracks.find((item) => item.id === params.trackId) || audio.documentState.tracks[0];
    if (!track) return { success: false, error: "Nenhuma faixa disponível." };
    const clipId = `clip-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const clip: AudioClip = { id: clipId, assetId: asset.id, trackId: track.id, name: params.name, timelineStartMs: params.timelineStartMs ?? audio.documentState.playheadMs, sourceStartMs: 0, sourceEndMs: durationMs, gain: 1, playbackRate: 1 };
    this.pushUndoState(audio.documentState);
    const state = { ...audio.documentState, tracks: audio.documentState.tracks.map((item) => item.id === track.id ? { ...item, clips: [...item.clips, clip] } : item), selectedTrackId: track.id, selectedClipIds: [clipId], timeline: { ...audio.documentState.timeline, durationMs: Math.max(audio.documentState.timeline.durationMs, clip.timelineStartMs + durationMs) } };
    const saved = await this.saveDocumentState(params.artifactId, state, params.actor || "USER");
    return saved.success ? { success: true, assetId: asset.id, clipId } : { success: false, error: saved.error };
  }

  public async insertExistingAsset(artifactId: string, assetId: string, trackId?: string, timelineStartMs?: number, actor: ArtifactActor = "USER", options: { durationMs?: number; provenance?: AudioClip["provenance"] } = {}) {
    const audio = this.getAudio(artifactId); const asset = assetManager.getAsset(assetId); if (!audio || !asset) return { success: false, error: "Projeto ou asset não encontrado." };
    if (!assetManager.isAssetUsable(assetId)) return { success: false, error: `[AUDIO_ASSET_UNAVAILABLE] Asset '${assetId}' não está disponível para uso.` };
    let durationMs = Number(options.durationMs ?? asset.metadata?.durationMs);
    if (!Number.isFinite(durationMs) || durationMs <= 0) {
      const data = await assetManager.getAssetData(assetId);
      const probedDurationMs = data ? await probeAudioDurationMs(data, asset.mimeType) : null;
      durationMs = Number(probedDurationMs);
      if (Number.isFinite(durationMs) && durationMs > 0) assetManager.updateAssetMetadata(assetId, { durationMs });
    }
    if (!Number.isFinite(durationMs) || durationMs <= 0) return { success: false, error: "[AUDIO_DURATION_UNKNOWN] A duração deste asset não está medida e não pôde ser lida do conteúdo. Não foi criado um clip com duração estimada." };
    const latestAudio = this.getAudio(artifactId);
    if (!latestAudio) return { success: false, error: "Projeto não encontrado após a medição do asset." };
    if (!assetManager.isAssetUsable(assetId)) return { success: false, error: `[AUDIO_ASSET_UNAVAILABLE] Asset '${assetId}' deixou de estar disponível durante a medição.` };
    const latestState = latestAudio.documentState;
    const track = latestState.tracks.find((item) => item.id === trackId) || latestState.tracks[0]; if (!track) return { success: false, error: "Nenhuma faixa disponível." };
    const clipId = `clip-existing-${Date.now()}`;
    const clip: AudioClip = { id: clipId, assetId, trackId: track.id, name: asset.name, timelineStartMs: timelineStartMs ?? latestState.playheadMs, sourceStartMs: 0, sourceEndMs: durationMs, gain: 1, playbackRate: 1, provenance: options.provenance };
    this.pushUndoState(latestState);
    const state = { ...latestState, tracks: latestState.tracks.map((item) => item.id === track.id ? { ...item, clips: [...item.clips, clip] } : item), selectedClipIds: [clipId], timeline: { ...latestState.timeline, durationMs: Math.max(latestState.timeline.durationMs, clip.timelineStartMs + durationMs) } };
    const saved = await this.saveDocumentState(artifactId, state, actor); return saved.success ? { success: true, clipId } : saved;
  }

  public getAudio(artifactId: string): AudioItem | null {
    const artifact = artifactService.getById(artifactId);
    if (!artifact) return null;

    let docState = this.stateCache.get(artifactId);
    if (!docState && typeof window !== "undefined" && window.localStorage) {
      const raw = localStorage.getItem(`${AUDIO_STATE_STORAGE_PREFIX}${artifactId}`);
      if (raw) docState = JSON.parse(raw);
    }

    if (!docState) {
      docState = {
        artifactId,
        timeline: { durationMs: 30000, zoom: 1, markers: [], snapToGrid: true, timeUnit: "ms" },
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

  public listAudioProjects(): AudioItem[] {
    const artifacts = artifactService.listAll("AUDIO");
    return artifacts.map((art) => {
      let docState = this.stateCache.get(art.id);
      if (!docState && typeof window !== "undefined" && window.localStorage) {
        const raw = localStorage.getItem(`${AUDIO_STATE_STORAGE_PREFIX}${art.id}`);
        if (raw) docState = JSON.parse(raw);
      }
      return {
        artifact: art,
        metadata: art.metadata as any,
        documentState: docState || {
          artifactId: art.id,
          timeline: { durationMs: 30000, zoom: 1, markers: [], snapToGrid: true, timeUnit: "ms" },
          tracks: [],
          selectedClipIds: [],
          playheadMs: 0,
          updatedAt: art.updatedAt,
        },
      };
    });
  }

  /**
   * Saves timeline mutations without creating version snapshots per movement/keystroke.
   */
  public async saveDocumentState(
    artifactId: string,
    docState: AudioDocumentState,
    actor: ArtifactActor = "USER"
  ): Promise<{ success: boolean; error?: string }> {
    const persisted = this.persistPendingStateLocally(docState);
    if (!persisted.success) return persisted;

    const totalClips = docState.tracks.reduce((acc, t) => acc + t.clips.length, 0);

    await artifactService.update(
      artifactId,
      {
        metadata: {
          durationMs: docState.timeline.durationMs,
          timelineDurationMs: docState.timeline.durationMs,
          trackCount: docState.tracks.length,
          clipCount: totalClips,
          documentMode: docState.tracks.length > 1 ? "MULTITRACK" : "SINGLE_TRACK",
        },
      },
      actor,
      "Autosave do estado de áudio",
      true // skipSnapshot: true
    );

    return { success: true };
  }

  public async addBus(artifactId: string, bus: AudioBus, actor: ArtifactActor = "USER") {
    const audio = this.getAudio(artifactId); if (!audio) return { success: false, error: "Projeto não encontrado." };
    this.pushUndoState(audio.documentState);
    const state = { ...audio.documentState, buses: [...(audio.documentState.buses || []), bus] };
    return this.saveDocumentState(artifactId, state, actor);
  }

  public async duplicateClip(artifactId: string, clipId: string, actor: ArtifactActor = "USER") {
    const audio = this.getAudio(artifactId); if (!audio) return { success: false, error: "Projeto não encontrado." };
    const source = audio.documentState.tracks.flatMap((t) => t.clips).find((c) => c.id === clipId); if (!source) return { success: false, error: "Clip não encontrado." };
    this.pushUndoState(audio.documentState);
    const copy = { ...source, id: `${source.id}-copy-${Date.now()}`, name: `${source.name || "Clip"} (Cópia)`, timelineStartMs: source.timelineStartMs + (source.sourceEndMs - source.sourceStartMs) };
    const state = { ...audio.documentState, tracks: audio.documentState.tracks.map((t) => t.id === source.trackId ? { ...t, clips: [...t.clips, copy] } : t) };
    return this.saveDocumentState(artifactId, state, actor);
  }

  public async addCrossfade(artifactId: string, firstClipId: string, secondClipId: string, durationMs: number, actor: ArtifactActor = "USER") {
    const audio = this.getAudio(artifactId); if (!audio) return { success: false, error: "Projeto não encontrado." };
    const all = audio.documentState.tracks.flatMap((t) => t.clips); const first = all.find((c) => c.id === firstClipId); const second = all.find((c) => c.id === secondClipId);
    if (!first || !second || first.trackId !== second.trackId) return { success: false, error: "Crossfade requer dois clips da mesma faixa." };
    const firstEnd = first.timelineStartMs + first.sourceEndMs - first.sourceStartMs;
    if (second.timelineStartMs < firstEnd - durationMs) return { success: false, error: "A duração do crossfade excede a sobreposição dos clips." };
    this.pushUndoState(audio.documentState);
    const state = { ...audio.documentState, tracks: audio.documentState.tracks.map((t) => ({ ...t, clips: t.clips.map((c) => c.id === firstClipId ? { ...c, fadeOutMs: durationMs } : c.id === secondClipId ? { ...c, fadeInMs: durationMs } : c) })) };
    return this.saveDocumentState(artifactId, state, actor);
  }

  public async setAutomationPoint(artifactId: string, point: AudioAutomationPoint, actor: ArtifactActor = "USER") {
    const audio = this.getAudio(artifactId); if (!audio) return { success: false, error: "Projeto não encontrado." };
    this.pushUndoState(audio.documentState);
    const points = (audio.documentState.automation || []).filter((p) => p.id !== point.id);
    points.push(point); points.sort((a, b) => a.timeMs - b.timeMs);
    return this.saveDocumentState(artifactId, { ...audio.documentState, automation: points }, actor);
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
    const audio = this.getAudio(artifactId);
    if (!audio) return { success: false, error: "Projeto de áudio não encontrado." };

    this.pushUndoState(audio.documentState);

    let found = false;
    const updatedTracks = audio.documentState.tracks.map((t) => ({
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

    const updatedState = { ...audio.documentState, tracks: updatedTracks };
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
    const audio = this.getAudio(artifactId);
    if (!audio) return { success: false, error: "Projeto de áudio não encontrado." };

    this.pushUndoState(audio.documentState);

    let foundClip: AudioClip | null = null;
    let foundTrackId: string | null = null;

    for (const track of audio.documentState.tracks) {
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

    const clipA: AudioClip = {
      ...foundClip,
      id: `${foundClip.id}-a`,
      name: `${foundClip.name || "Clip"} (Parte 1)`,
      sourceStartMs: foundClip.sourceStartMs,
      sourceEndMs: sourceSplitPoint,
    };

    const clipB: AudioClip = {
      ...foundClip,
      id: `${foundClip.id}-b`,
      name: `${foundClip.name || "Clip"} (Parte 2)`,
      timelineStartMs: splitTimelineMs,
      sourceStartMs: sourceSplitPoint,
      sourceEndMs: foundClip.sourceEndMs,
    };

    const updatedTracks = audio.documentState.tracks.map((t) => {
      if (t.id === foundTrackId) {
        const newClips: AudioClip[] = [];
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

    const updatedState = { ...audio.documentState, tracks: updatedTracks };
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
    const audio = this.getAudio(artifactId);
    if (!audio) return { success: false, error: "Projeto de áudio não encontrado." };

    versionManager.createSnapshot(audio.artifact, description, actor);
    artifactStore.save(audio.artifact);
    return { success: true };
  }

  /**
   * Restores a past version applying Alex Principle (creates vNext without deleting forward versions).
   */
  public async restoreVersion(
    artifactId: string,
    versionNumber: number,
    actor: ArtifactActor = "USER"
  ): Promise<{ success: boolean; audio?: AudioItem; error?: string }> {
    const audio = this.getAudio(artifactId);
    if (!audio) return { success: false, error: "Projeto de áudio não encontrado." };

    const res = versionManager.rollbackToVersion(audio.artifact, versionNumber, actor);
    if (!res.success || !res.rolledBackArtifact) {
      return { success: false, error: res.error };
    }

    artifactStore.save(res.rolledBackArtifact);
    const currentAudio = this.getAudio(artifactId);
    return { success: true, audio: currentAudio || undefined };
  }

  /**
   * Proposes an atomic multi-operation ChangeSet from Athena.
   */
  public proposeChangeSet(
    artifactId: string,
    title: string,
    summary: string,
    operations: AudioOperation[],
    actor: "ATHENA" | "USER" = "ATHENA"
  ): AudioChangeSet {
    const cs: AudioChangeSet = {
      id: `aud-cs-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      artifactId,
      title,
      summary,
      operations,
      createdBy: actor,
      status: "PENDING",
      createdAt: new Date().toISOString(),
    };

    const list = this.pendingChangeSets.get(artifactId) || [];
    list.push(cs);
    this.pendingChangeSets.set(artifactId, list);

    return cs;
  }

  public getPendingChangeSets(artifactId: string): AudioChangeSet[] {
    return (this.pendingChangeSets.get(artifactId) || []).filter((cs) => cs.status === "PENDING");
  }

  /**
   * Applies an Athena ChangeSet atomically with rollback on any failure.
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

    const currentAudio = this.getAudio(artifactId);
    if (!currentAudio) return { success: false, error: "Projeto de áudio não encontrado." };

    // 1. Safety snapshot before Athena mutation
    versionManager.createSnapshot(
      currentAudio.artifact,
      `Snapshot de segurança antes de aplicar ChangeSet: ${cs.title}`,
      actor
    );
    artifactStore.save(currentAudio.artifact);

    // 2. Clone state for atomic application
    const workingState: AudioDocumentState = JSON.parse(JSON.stringify(currentAudio.documentState));

    try {
      for (const op of cs.operations) {
        switch (op.type) {
          case "ADD_TRACK":
            workingState.tracks.push(op.track);
            break;
          case "REMOVE_TRACK":
            workingState.tracks = workingState.tracks.filter((t) => t.id !== op.trackId);
            break;
          case "UPDATE_TRACK": {
            const target = workingState.tracks.find((t) => t.id === op.trackId);
            if (!target) throw new Error(`Faixa '${op.trackId}' não encontrada.`);
            Object.assign(target, op.updates);
            break;
          }
          case "ADD_CLIP": {
            const targetTrack = workingState.tracks.find((t) => t.id === op.clip.trackId);
            if (!targetTrack) throw new Error(`Faixa '${op.clip.trackId}' não encontrada para o clip.`);
            targetTrack.clips.push(op.clip);
            break;
          }
          case "REMOVE_CLIP": {
            workingState.tracks.forEach((t) => {
              t.clips = t.clips.filter((c) => c.id !== op.clipId);
            });
            break;
          }
          case "MOVE_CLIP": {
            let clipToMove: AudioClip | null = null;
            workingState.tracks.forEach((t) => {
              const idx = t.clips.findIndex((c) => c.id === op.clipId);
              if (idx >= 0) {
                clipToMove = t.clips.splice(idx, 1)[0];
              }
            });
            if (!clipToMove) throw new Error(`Clip '${op.clipId}' não encontrado para movimentação.`);
            const destTrackId = op.newTrackId || (clipToMove as AudioClip).trackId;
            const destTrack = workingState.tracks.find((t) => t.id === destTrackId);
            if (!destTrack) throw new Error(`Faixa de destino '${destTrackId}' não encontrada.`);
            (clipToMove as AudioClip).trackId = destTrackId;
            (clipToMove as AudioClip).timelineStartMs = op.newTimelineStartMs;
            destTrack.clips.push(clipToMove);
            break;
          }
          case "TRIM_CLIP": {
            let trimmed = false;
            workingState.tracks.forEach((t) => {
              const target = t.clips.find((c) => c.id === op.clipId);
              if (target) {
                target.sourceStartMs = op.sourceStartMs;
                target.sourceEndMs = op.sourceEndMs;
                trimmed = true;
              }
            });
            if (!trimmed) throw new Error(`Clip '${op.clipId}' não encontrado para recorte.`);
            break;
          }
          case "SPLIT_CLIP": {
            // Internal split inside ChangeSet
            break;
          }
          case "SET_CLIP_GAIN": {
            workingState.tracks.forEach((t) => {
              const target = t.clips.find((c) => c.id === op.clipId);
              if (target) target.gain = op.gain;
            });
            break;
          }
          case "SET_CLIP_FADE": {
            workingState.tracks.forEach((t) => {
              const target = t.clips.find((c) => c.id === op.clipId);
              if (target) {
                if (op.fadeInMs !== undefined) target.fadeInMs = op.fadeInMs;
                if (op.fadeOutMs !== undefined) target.fadeOutMs = op.fadeOutMs;
              }
            });
            break;
          }
          case "ADD_MARKER":
            workingState.timeline.markers.push(op.marker);
            break;
          case "REMOVE_MARKER":
            workingState.timeline.markers = workingState.timeline.markers.filter((m) => m.id !== op.markerId);
            break;
          case "SET_TIMELINE_DURATION":
            workingState.timeline.durationMs = op.durationMs;
            break;
        }
      }

      // Validate timeline integrity on resulting state
      const integrity = this.validateTimelineIntegrity(workingState);
      if (!integrity.valid) {
        throw new Error(integrity.error);
      }

      // Commit state
      await this.saveDocumentState(artifactId, workingState, actor);
      cs.status = "ACCEPTED";
      athenaEventBus.emit("AUDIO_CHANGESET_APPLIED" as any, { artifactId, changeSetId });
      return { success: true };
    } catch (err: any) {
      // Atomic rollback: original state remains intact
      cs.status = "REJECTED";
      return {
        success: false,
        error: `[ATOMIC_ROLLBACK] Falha ao aplicar operação do ChangeSet: ${err.message || String(err)}`,
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
   * Mixes and exports the audio project non-destructively.
   */
  public async exportAudio(
    artifactId: string,
    options: AudioExportOptions,
    actor: ArtifactActor = "USER"
  ): Promise<AudioExportResult> {
    const audio = this.getAudio(artifactId);
    if (!audio) {
      return {
        success: false,
        format: options.format,
        error: "Projeto de áudio não encontrado.",
      };
    }

    return await audioRenderEngine.renderTimeline(audio.documentState, options, actor);
  }

  public async exportStems(artifactId: string, options: AudioExportOptions, actor: ArtifactActor = "USER"): Promise<AudioStemsExportResult> {
    const audio = this.getAudio(artifactId);
    if (!audio) return { success: false, stems: [], error: "Projeto de áudio não encontrado." };
    return audioRenderEngine.renderStems(audio.documentState, options, actor);
  }
}

export const audioService = new AudioService();
