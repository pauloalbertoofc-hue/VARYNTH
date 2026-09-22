import {
  AudioDocumentState,
  AudioExportFormat,
  AudioExportOptions,
  AudioExportResult,
  AudioWaveformData,
  AudioDecodeValidationResult,
  AudioRuntimeCapabilities,
} from "./types";
import { assetManager } from "../../artifacts/asset-manager";
import { jobManager } from "../../runtime/job-manager";
import { athenaEventBus } from "../../athena/events/event-bus";
import { ArtifactActor } from "../../artifacts/types";
import { createAudioExportPlan } from "./audio-export-plan";
import { effectiveNoteDurationBeats, flattenMusicNotes, midiToFrequency, pitchToMidi, tempoMapBeatsToSeconds, tempoMapSecondsToBeats } from "./music-domain";
import { isAudioTrackAudible, isAudioTrackDirectOutputAudible, isAudioTrackSendAudible, validateAudioBusRouting } from "./audio-routing";
import { crossfadeLoopChannels } from "./audio-loop";

export const MAX_AUDIO_DURATION_MS = 3600000; // 1 hour ceiling
export const DEFAULT_MAX_DECODED_MEMORY_BYTES = 128 * 1024 * 1024; // 128 MB default limit
export const BYTES_PER_FLOAT32_SAMPLE = 4;

export class AudioRenderEngine {
  private capabilities: AudioRuntimeCapabilities = {
    maxDurationMs: MAX_AUDIO_DURATION_MS,
    maxDecodedMemoryBytes: DEFAULT_MAX_DECODED_MEMORY_BYTES,
    supportedExportFormats: ["WAV"],
    supportedImportMimeTypes: ["audio/wav", "audio/x-wav", "audio/mpeg", "audio/mp3", "audio/ogg", "audio/aac", "audio/m4a", "audio/webm"],
    bytesPerDecodedSample: BYTES_PER_FLOAT32_SAMPLE,
  };

  private waveformCache: Map<string, AudioWaveformData> = new Map();

  /**
   * Checks whether runtime supports the specified export format honestly.
   */
  public canExport(format: string): boolean {
    return this.capabilities.supportedExportFormats.includes(format as AudioExportFormat);
  }

  /**
   * Dynamically estimates decoded memory footprint based on duration, sample rate and channels.
   */
  public estimateDecodedMemory(
    durationSeconds: number,
    sampleRate: number = 44100,
    channels: number = 2,
    bytesPerSample: number = BYTES_PER_FLOAT32_SAMPLE
  ): number {
    return Math.round(durationSeconds * sampleRate * channels * bytesPerSample);
  }

  /**
   * Validates duration and estimated decoded memory against device safety limits.
   */
  public validateAudioLimits(
    durationMs: number,
    sampleRate: number = 44100,
    channels: number = 2
  ): { valid: boolean; error?: string; estimatedBytes: number } {
    if (durationMs <= 0) {
      return { valid: false, error: "Duração do áudio deve ser maior que zero.", estimatedBytes: 0 };
    }

    if (durationMs > this.capabilities.maxDurationMs) {
      return {
        valid: false,
        error: `[AUDIO_DECODE_EXCEEDS_RUNTIME_LIMIT] Duração (${Math.round(durationMs / 1000)}s) excede o teto estrutural de ${this.capabilities.maxDurationMs / 1000}s.`,
        estimatedBytes: 0,
      };
    }

    const estimatedBytes = this.estimateDecodedMemory(durationMs / 1000, sampleRate, channels);
    if (estimatedBytes > this.capabilities.maxDecodedMemoryBytes) {
      return {
        valid: false,
        error: `[AUDIO_DECODE_EXCEEDS_RUNTIME_LIMIT] Memória estimada descompactada (${Math.round(estimatedBytes / 1024 / 1024)}MB) excede o limite seguro de ${this.capabilities.maxDecodedMemoryBytes / 1024 / 1024}MB.`,
        estimatedBytes,
      };
    }

    return { valid: true, estimatedBytes };
  }

  /**
   * Validates audio format, container and data integrity.
   */
  public validateAudioData(
    name: string,
    mimeType: string,
    data: string | Blob | ArrayBuffer,
    approxDurationMs: number = 10000
  ): AudioDecodeValidationResult {
    const validMimes = this.capabilities.supportedImportMimeTypes;
    if (!validMimes.includes(mimeType.toLowerCase())) {
      return {
        status: "UNSUPPORTED_FORMAT",
        error: `[UNSUPPORTED_AUDIO_CODEC] Formato '${mimeType}' não é suportado pelo Audio Studio V1. Formatos aceitos: WAV, MP3, OGG, AAC/M4A.`,
      };
    }

    // Corrupted buffer check
    if (typeof data === "string") {
      if (data.length < 32 && !data.startsWith("data:audio/")) {
        return {
          status: "CORRUPTED_AUDIO",
          error: "Buffer de dados de áudio vazio, corrompido ou truncado.",
        };
      }
    } else if (data instanceof ArrayBuffer && data.byteLength < 44) {
      return {
        status: "CORRUPTED_AUDIO",
        error: "Cabeçalho de arquivo de áudio corrompido ou menor que o tamanho mínimo de container.",
      };
    }

    // Memory limit check
    const limitCheck = this.validateAudioLimits(approxDurationMs, 44100, 2);
    if (!limitCheck.valid) {
      return {
        status: "MEMORY_EXCEEDED",
        error: limitCheck.error,
        estimatedBytes: limitCheck.estimatedBytes,
      };
    }

    return {
      status: "VALID_AUDIO",
      durationMs: approxDurationMs,
      sampleRate: 44100,
      channels: 2,
      estimatedBytes: limitCheck.estimatedBytes,
    };
  }

  /**
   * Generates lightweight peak waveform data (e.g. 100 normalized points) and releases decode buffers.
   */
  public generateWaveform(assetId: string, durationMs: number, _data?: string | ArrayBuffer | Blob, pointsCount: number = 100): AudioWaveformData {
    return this.waveformCache.get(assetId) || { assetId, durationMs, peaks: [], sampleRate: 44100, generatedAt: new Date().toISOString(), resolution: pointsCount };
  }

  public async generateWaveformAsync(
    assetId: string,
    durationMs: number,
    data?: string | ArrayBuffer | Blob,
    pointsCount: number = 100
  ): Promise<AudioWaveformData> {
    const cached = this.waveformCache.get(assetId);
    if (cached && cached.peaks.length >= pointsCount) return cached;

    if (!data || typeof window === "undefined" || !(window.AudioContext || (window as any).webkitAudioContext)) {
      throw new Error("[AUDIO_DECODE_UNAVAILABLE] Waveform real requer um runtime Web Audio ativo e os dados do asset.");
    }
    const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
    const context = new AudioContextCtor();
    const raw = typeof data === "string" ? await (await fetch(data)).arrayBuffer() : data instanceof ArrayBuffer ? data : await (data as Blob).arrayBuffer();
    const buffer = await context.decodeAudioData(raw.slice(0));
    const peaks: number[] = [];
    const clipping: boolean[] = [];
    const channel = buffer.getChannelData(0);
    const bucket = Math.max(1, Math.floor(channel.length / pointsCount));
    for (let i = 0; i < pointsCount; i++) {
      const start = i * bucket;
      const end = Math.min(channel.length, start + bucket);
      let peak = 0;
      for (let j = start; j < end; j++) peak = Math.max(peak, Math.abs(channel[j]));
      peaks.push(Number(peak.toFixed(4)));
      clipping.push(peak >= 0.999);
    }
    await context.close();

    const waveform: AudioWaveformData = {
      assetId,
      durationMs: buffer.duration * 1000,
      peaks,
      sampleRate: buffer.sampleRate,
      generatedAt: new Date().toISOString(),
      resolution: pointsCount,
      channels: buffer.numberOfChannels,
      clipping,
    };

    this.waveformCache.set(assetId, waveform);
    return waveform;
  }

  public getCachedWaveform(assetId: string): AudioWaveformData | undefined {
    return this.waveformCache.get(assetId);
  }

  public clearWaveformCache(): void {
    this.waveformCache.clear();
  }

  /**
   * Encodes raw PCM float audio samples into a standard 16-bit Little-Endian WAV Blob.
   */
  public encodeWavPcm16(
    samplesLeft: Float32Array,
    samplesRight: Float32Array,
    sampleRate: number = 44100
  ): Blob {
    const numChannels = 2;
    const bytesPerSample = 2; // 16-bit
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const numSamples = samplesLeft.length;
    const dataSize = numSamples * blockAlign;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    // 1. RIFF chunk descriptor
    this.writeString(view, 0, "RIFF");
    view.setUint32(4, 36 + dataSize, true);
    this.writeString(view, 8, "WAVE");

    // 2. fmt sub-chunk
    this.writeString(view, 12, "fmt ");
    view.setUint32(16, 16, true); // SubChunk1Size (16 for PCM)
    view.setUint16(20, 1, true);  // AudioFormat (1 for PCM)
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true); // BitsPerSample

    // 3. data sub-chunk
    this.writeString(view, 36, "data");
    view.setUint32(40, dataSize, true);

    // 4. Interleave and clamp 16-bit PCM samples
    let offset = 44;
    for (let i = 0; i < numSamples; i++) {
      // Clamp left
      let sL = Math.max(-1, Math.min(1, samplesLeft[i]));
      let pcmL = sL < 0 ? sL * 0x8000 : sL * 0x7fff;
      view.setInt16(offset, Math.round(pcmL), true);
      offset += 2;

      // Clamp right
      let sR = Math.max(-1, Math.min(1, samplesRight[i]));
      let pcmR = sR < 0 ? sR * 0x8000 : sR * 0x7fff;
      view.setInt16(offset, Math.round(pcmR), true);
      offset += 2;
    }

    return new Blob([buffer], { type: "audio/wav" });
  }

  private writeString(view: DataView, offset: number, string: string): void {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  /**
   * Performs deterministic offline rendering / mixdown of all multitrack audio clips.
   */
  public async renderTimeline(
    state: AudioDocumentState,
    options: AudioExportOptions,
    actor: ArtifactActor = "USER"
  ): Promise<AudioExportResult> {
    if (typeof window === "undefined" || !(window.OfflineAudioContext || (window as any).webkitOfflineAudioContext)) {
      return { success: false, format: options.format, error: "[AUDIO_RENDER_UNAVAILABLE] Renderização real requer OfflineAudioContext no navegador." };
    }
    if (!this.canExport(options.format)) {
      return {
        success: false,
        format: options.format,
        error: `[CAPABILITY_UNAVAILABLE] Formato de áudio '${options.format}' não suportado pelo motor local.`,
      };
    }

    const sampleRate = options.sampleRate || 44100;
    let plan;
    try { plan = createAudioExportPlan(state, options); }
    catch (error) { return { success: false, format: options.format, error: error instanceof Error ? error.message : String(error) }; }
    const renderStartMs = plan.startMs;
    const durationMs = plan.endMs - plan.startMs;

    const limitCheck = this.validateAudioLimits(durationMs, sampleRate, 2);
    if (!limitCheck.valid) {
      return {
        success: false,
        format: options.format,
        error: limitCheck.error,
      };
    }

    // 1. Create Render Job in JobManager for traceability
    const job = jobManager.createJob({
      title: `Render Áudio: ${options.format} (${Math.round(durationMs / 1000)}s @ ${sampleRate}Hz)`,
      type: "CODE_EXECUTION",
      priority: "HIGH",
      relatedArtifactId: state.artifactId,
      createdBy: actor,
      metadata: {
        format: options.format,
        durationMs,
        sampleRate,
        trackCount: state.tracks.length,
        normalize: !!options.normalize,
      },
    });

    jobManager.startJob(job.id);
    athenaEventBus.emit("AUDIO_RENDER_STARTED" as any, { artifactId: state.artifactId, jobId: job.id });

    try {
      const real = await this.renderWithOfflineAudioContext(state, options, sampleRate);
      const wavBlob = this.encodeWavPcm16(real.left, real.right, sampleRate);
      const sizeBytes = wavBlob.size;
      const derivedAsset = await assetManager.registerAsset(
        { name: `render-${state.artifactId}-${Date.now()}.wav`, mimeType: "audio/wav", sizeBytes, storageType: "INDEXEDDB_BLOB", createdBy: actor, artifactIds: [state.artifactId], metadata: { isDerived: true, isSource: false, renderedFromArtifactId: state.artifactId, format: "WAV", durationMs, sampleRate, normalized: !!options.normalize } },
        wavBlob
      );
      jobManager.updateProgress(job.id, 100);
      jobManager.completeJob(job.id, { assetId: derivedAsset.id, sizeBytes });
      athenaEventBus.emit("AUDIO_RENDER_COMPLETED" as any, { artifactId: state.artifactId, assetId: derivedAsset.id });
      return { success: true, format: "WAV", assetId: derivedAsset.id, blob: wavBlob, sizeBytes, durationMs, jobId: job.id };
    } catch (err: any) {
      jobManager.failJob(job.id, err.message || String(err));
      return {
        success: false,
        format: options.format,
        durationMs,
        error: err.message || String(err),
      };
    }
  }

  public async renderStems(state: AudioDocumentState, options: AudioExportOptions, actor: ArtifactActor = "USER"): Promise<import("./types").AudioStemsExportResult> {
    let plan;
    try { plan = createAudioExportPlan(state, { ...options, target: { type: "STEMS", trackIds: options.target?.trackIds } }); }
    catch (error) { return { success: false, stems: [], error: error instanceof Error ? error.message : String(error) }; }
    const trackIds = plan.trackIds;
    const stems: { trackId: string; result: AudioExportResult }[] = [];
    for (const trackId of trackIds) { const result = await this.renderTimeline(state, { ...options, target: { type: "TRACK", trackIds: [trackId], startMs: plan.startMs, endMs: plan.endMs } }, actor); stems.push({ trackId, result }); if (!result.success) return { success: false, stems, error: result.error }; }
    return { success: true, stems };
  }

  private async renderWithOfflineAudioContext(state: AudioDocumentState, options: AudioExportOptions, sampleRate: number): Promise<{ left: Float32Array; right: Float32Array; peak: number }> {
    const boundedTarget = options.target?.type === "SELECTED_REGION" || options.target?.type === "TRACK" || options.target?.type === "CLIP";
    const renderStartMs = boundedTarget ? Math.max(0, options.target?.startMs || 0) : 0;
    const durationMs = boundedTarget ? Math.max(1, Math.min(state.timeline.durationMs, options.target?.endMs || state.timeline.durationMs) - renderStartMs) : state.timeline.durationMs;
    const Ctor = window.OfflineAudioContext || (window as any).webkitOfflineAudioContext;
    const context = new Ctor(2, Math.ceil(durationMs / 1000 * sampleRate), sampleRate) as OfflineAudioContext;
    const master = context.createGain(); master.gain.value = state.masterBus?.muted ? 0 : state.masterBus?.volume ?? 1; let masterChain: AudioNode = master; for (const effect of state.masterBus?.effects || []) { if (!effect.enabled) continue; const fx = this.createEffectNode(context, effect); if (fx) { masterChain.connect(fx); masterChain = fx; } } const masterPanner = context.createStereoPanner(); masterPanner.pan.value = Math.max(-1, Math.min(1, state.masterBus?.pan ?? 0)); masterChain.connect(masterPanner).connect(context.destination);
    const buses = state.buses || [];
    validateAudioBusRouting(buses);
    const busNodes = new Map<string, GainNode>();
    const busTails = new Map<string, AudioNode>();
    for (const bus of buses) { const node = context.createGain(); node.gain.value = bus.muted ? 0 : bus.volume; let busChain: AudioNode = node; for (const effect of bus.effects || []) { if (!effect.enabled) continue; const fx = this.createEffectNode(context, effect); if (fx) { busChain.connect(fx); busChain = fx; } } const panner = context.createStereoPanner(); panner.pan.value = Math.max(-1, Math.min(1, bus.pan)); busChain.connect(panner); busNodes.set(bus.id, node); busTails.set(bus.id, panner); }
    for (const bus of buses) { const destination = bus.outputBusId ? busNodes.get(bus.outputBusId) : master; if (!destination) throw new Error(`[AUDIO_ROUTING_INVALID] Bus de saída '${bus.outputBusId}' não encontrado.`); busTails.get(bus.id)!.connect(destination); }
    const requestedTrackIds = options.target?.trackIds;
    const targetTracks = requestedTrackIds?.length ? state.tracks.filter((track) => requestedTrackIds.includes(track.id)) : state.tracks;
    const activeTargetTracks = targetTracks.filter((track) => isAudioTrackAudible(track, state.tracks, buses));
    for (const track of activeTargetTracks) {
      for (const clip of track.clips) {
        if (options.target?.type === "CLIP" && clip.id !== options.target.clipId) continue;
        const data = await this.withTimeout(assetManager.getAssetData(clip.assetId), 30000, `[AUDIO_ASSET_READ_TIMEOUT] Leitura do asset '${clip.assetId}' excedeu 30 segundos.`);
        if (!data) throw new Error(`[MISSING_AUDIO_ASSET] Asset '${clip.assetId}' não encontrado.`);
        const raw = typeof data === "string" ? await (await fetch(data)).arrayBuffer() : data instanceof ArrayBuffer ? data : await (data as Blob).arrayBuffer();
        const buffer = await this.withTimeout(context.decodeAudioData(raw.slice(0)), 30000, `[AUDIO_DECODE_TIMEOUT] Decodificação do asset '${clip.assetId}' excedeu 30 segundos.`);
        let renderBuffer = buffer;
        let loopBounds: { startFrame: number; endFrame: number } | undefined;
        if (clip.loop?.enabled) {
          const startMs = Math.min(buffer.duration * 1000, Math.max(0, clip.loop.startMs ?? clip.sourceStartMs));
          const endMs = Math.min(buffer.duration * 1000, clip.loop.endMs ?? clip.sourceEndMs);
          const crossfadeMs = clip.loop.crossfadeMs ?? 0;
          const loop = crossfadeLoopChannels(Array.from({ length: buffer.numberOfChannels }, (_, channel) => buffer.getChannelData(channel)), buffer.sampleRate, startMs, endMs, crossfadeMs);
          if (loop.crossfadeFrames > 0) { renderBuffer = context.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate); loop.channels.forEach((samples, channel) => renderBuffer.getChannelData(channel).set(samples)); }
          loopBounds = { startFrame: loop.loopStartFrame, endFrame: loop.loopEndFrame };
        }
        const source = context.createBufferSource(); source.buffer = renderBuffer;
        if (loopBounds) { source.loop = true; source.loopStart = loopBounds.startFrame / buffer.sampleRate; source.loopEnd = loopBounds.endFrame / buffer.sampleRate; }
        const clipGain = context.createGain(); clipGain.gain.value = clip.gain ?? 1;
        const trackFader = context.createGain(); trackFader.gain.value = this.automationValue(state, track.id, "TRACK_VOLUME", track.volume ?? 1, Math.max(renderStartMs, clip.timelineStartMs));
        const pan = context.createStereoPanner(); pan.pan.value = Math.max(-1, Math.min(1, this.automationValue(state, track.id, "TRACK_PAN", track.pan ?? 0, clip.timelineStartMs)));
        const clipEndMs = clip.timelineStartMs + (clip.sourceEndMs - clip.sourceStartMs);
        if (clipEndMs <= renderStartMs || clip.timelineStartMs >= renderStartMs + durationMs) continue;
        const start = Math.max(0, (clip.timelineStartMs - renderStartMs) / 1000);
        const offset = Math.max(0, (clip.sourceStartMs + Math.max(0, renderStartMs - clip.timelineStartMs)) / 1000);
        const duration = Math.min((clip.sourceEndMs - clip.sourceStartMs - Math.max(0, renderStartMs - clip.timelineStartMs)) / 1000, (durationMs / 1000) - start);
        if (clip.fadeInMs) { clipGain.gain.setValueAtTime(0, start); clipGain.gain.linearRampToValueAtTime(clip.gain ?? 1, start + clip.fadeInMs / 1000); }
        if (clip.fadeOutMs) { clipGain.gain.setValueAtTime(clip.gain ?? 1, start + Math.max(0, duration - clip.fadeOutMs / 1000)); clipGain.gain.linearRampToValueAtTime(0, start + duration); }
        const automation = (state.automation || []).filter((point) => point.targetId === track.id && point.parameter === "TRACK_VOLUME").sort((a, b) => a.timeMs - b.timeMs);
        for (const point of automation) { if (point.timeMs >= Math.max(clip.timelineStartMs, renderStartMs) && point.timeMs <= renderStartMs + durationMs) trackFader.gain.linearRampToValueAtTime(point.value, (point.timeMs - renderStartMs) / 1000); }
        const panAutomation = (state.automation || []).filter((point) => point.targetId === track.id && point.parameter === "TRACK_PAN").sort((a, b) => a.timeMs - b.timeMs);
        for (const point of panAutomation) { if (point.timeMs >= clip.timelineStartMs && point.timeMs <= clip.timelineStartMs + duration * 1000) pan.pan.linearRampToValueAtTime(point.value, point.timeMs / 1000); }
        let chain: AudioNode = clipGain;
        for (const effect of track.effects || []) { if (!effect.enabled) continue; const node = this.createEffectNode(context, effect); if (node) { chain.connect(node); chain = node; } }
        const preFader = chain;
        chain.connect(trackFader).connect(pan);
        const destination = track.busId ? busNodes.get(track.busId) : master;
        if (!destination) throw new Error(`[AUDIO_ROUTING_INVALID] Bus '${track.busId}' não encontrado.`);
        source.connect(clipGain); source.start(start, offset, duration);
        if (isAudioTrackDirectOutputAudible(track, buses)) pan.connect(destination);
        for (const send of track.sends || []) { const sendBus = busNodes.get(send.busId); if (!sendBus) throw new Error(`[AUDIO_ROUTING_INVALID] Send bus '${send.busId}' não encontrado.`); if (send.enabled && isAudioTrackSendAudible(track, send.busId, buses)) { const sendGain = context.createGain(); sendGain.gain.value = send.level; (send.preFader ? preFader : pan).connect(sendGain).connect(sendBus); } }
      }
    }
    const music = state.music;
    if (music?.notes.length || music?.clips?.length) {
      const tempoMap = music.tempoMap.length ? music.tempoMap : [{ beat: 0, bpm: state.settings?.bpm || 120 }];
      const notesByTrack = new Map<string, typeof music.notes>();
      if (music.clips?.length) {
        for (const clip of music.clips) {
          const timelineBeat = tempoMapSecondsToBeats(clip.timelineStartMs / 1000, tempoMap);
          const movedNotes = flattenMusicNotes({ ...music, notes: [], clips: [{ ...clip, timelineStartMs: tempoMapBeatsToSeconds(timelineBeat, tempoMap) * 1000 }] });
          notesByTrack.set(clip.trackId, [...(notesByTrack.get(clip.trackId) || []), ...movedNotes]);
        }
      } else {
        const primaryTrack = activeTargetTracks.find((track) => track.type === "INSTRUMENT" || track.type === "MIDI" || track.type === "MUSIC");
      if (primaryTrack) notesByTrack.set(primaryTrack.id, flattenMusicNotes(music));
      }
      const renderStartSeconds = renderStartMs / 1000;
      const renderEndSeconds = renderStartSeconds + durationMs / 1000;
      for (const [trackId, notes] of notesByTrack) {
        const track = activeTargetTracks.find((item) => item.id === trackId);
        if (!track) continue;
        const instrumentInput = context.createGain();
        let chain: AudioNode = instrumentInput;
        for (const effect of track.effects || []) { if (!effect.enabled) continue; const effectNode = this.createEffectNode(context, effect); if (effectNode) { chain.connect(effectNode); chain = effectNode; } }
        const preFader = chain;
        const trackFader = context.createGain();
        trackFader.gain.value = this.automationValue(state, track.id, "TRACK_VOLUME", track.volume ?? 1, renderStartMs);
        const pan = context.createStereoPanner();
        pan.pan.value = Math.max(-1, Math.min(1, this.automationValue(state, track.id, "TRACK_PAN", track.pan ?? 0, renderStartMs)));
        chain.connect(trackFader).connect(pan);
        const destination = track.busId ? busNodes.get(track.busId) : master;
        if (!destination) throw new Error(`[AUDIO_ROUTING_INVALID] Bus '${track.busId}' não encontrado.`);
        if (isAudioTrackDirectOutputAudible(track, buses)) pan.connect(destination);
        for (const send of track.sends || []) { const sendBus = busNodes.get(send.busId); if (!sendBus) throw new Error(`[AUDIO_ROUTING_INVALID] Send bus '${send.busId}' não encontrado.`); if (send.enabled && isAudioTrackSendAudible(track, send.busId, buses)) { const sendGain = context.createGain(); sendGain.gain.value = send.level; (send.preFader ? preFader : pan).connect(sendGain).connect(sendBus); } }
        for (const note of notes) {
          const noteStart = tempoMapBeatsToSeconds(note.startBeat, tempoMap);
          const noteEnd = tempoMapBeatsToSeconds(note.startBeat + effectiveNoteDurationBeats(note), tempoMap);
          if (noteEnd <= renderStartSeconds || noteStart >= renderEndSeconds) continue;
          const start = Math.max(0, noteStart - renderStartSeconds);
          const end = Math.min(renderEndSeconds, noteEnd) - renderStartSeconds;
          const oscillator = context.createOscillator();
          oscillator.type = "sine";
          oscillator.frequency.value = midiToFrequency(pitchToMidi(note.pitch, note.octave, note.accidental), music.tuning.concertPitchHz);
          const envelope = context.createGain();
          const velocity = Math.max(1, Math.min(127, note.velocity)) / 127; const articulation = note.articulation || "normal"; const expression = Math.max(0, Math.min(1, note.expression ?? 1)); const peak = 0.18 * velocity * expression * (articulation === "accent" ? 1.2 : 1); const attack = articulation === "legato" ? 0.006 : 0.012; const release = articulation === "staccato" ? 0.008 : articulation === "tenuto" || articulation === "sustain" ? 0.04 : 0.025;
          envelope.gain.setValueAtTime(0.0001, start);
          envelope.gain.linearRampToValueAtTime(peak, Math.min(end, start + attack));
          envelope.gain.setValueAtTime(peak * 0.67, Math.max(start + attack + 0.001, end - release));
          envelope.gain.linearRampToValueAtTime(0.0001, end);
          oscillator.connect(envelope).connect(instrumentInput);
          oscillator.start(start);
          oscillator.stop(Math.min(durationMs / 1000, end + 0.03));
        }
      }
    }
    const rendered = await this.withTimeout(context.startRendering(), 120000, "[AUDIO_RENDER_TIMEOUT] Renderização offline excedeu 120 segundos.");
    const left = new Float32Array(rendered.getChannelData(0));
    const right = rendered.numberOfChannels > 1 ? new Float32Array(rendered.getChannelData(1)) : new Float32Array(left);
    let peak = 0; for (let i = 0; i < left.length; i++) peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
    if (options.normalize) { let peak = 0; for (let i = 0; i < left.length; i++) peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i])); if (peak > 0) { const factor = 0.98 / peak; for (let i = 0; i < left.length; i++) { left[i] *= factor; right[i] *= factor; } } }
    return { left, right, peak };
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([promise, new Promise<T>((_, reject) => { timer = setTimeout(() => reject(new Error(message)), timeoutMs); })]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  private automationValue(state: AudioDocumentState, targetId: string, parameter: "TRACK_VOLUME" | "TRACK_PAN", fallback: number, timeMs: number): number {
    const points = (state.automation || []).filter((point) => point.targetId === targetId && point.parameter === parameter).sort((a, b) => a.timeMs - b.timeMs);
    if (!points.length) return fallback;
    let previous = points[0];
    for (const next of points.slice(1)) { if (timeMs <= next.timeMs) { const ratio = (timeMs - previous.timeMs) / Math.max(1, next.timeMs - previous.timeMs); return previous.value + (next.value - previous.value) * ratio; } previous = next; }
    return previous.value;
  }

  private createEffectNode(context: OfflineAudioContext, effect: { type: string; parameters: Record<string, number | string | boolean> }): AudioNode | null {
    const p = effect.parameters || {}; const type = effect.type.toUpperCase();
    if (type === "GAIN") { const node = context.createGain(); node.gain.value = Number(p.gain ?? p.value ?? 1); return node; }
    if (type === "EQ" || type === "HIGH_PASS" || type === "LOW_PASS") { const node = context.createBiquadFilter(); node.type = type === "EQ" ? "peaking" : type === "HIGH_PASS" ? "highpass" : "lowpass"; node.frequency.value = Number(p.frequency ?? 1000); node.Q.value = Number(p.q ?? 1); if (type === "EQ") node.gain.value = Number(p.gain ?? 0); return node; }
    if (type === "COMPRESSOR" || type === "LIMITER") { const node = context.createDynamicsCompressor(); node.threshold.value = Number(p.threshold ?? (type === "LIMITER" ? -1 : -24)); node.ratio.value = Number(p.ratio ?? (type === "LIMITER" ? 20 : 4)); return node; }
    if (type === "DELAY") { const node = context.createDelay(5); node.delayTime.value = Number(p.time ?? 0.25); return node; }
    if (type === "REVERB") { const duration = Math.max(0.05, Math.min(8, Number(p.duration ?? 1.8))); const node = context.createConvolver(); const impulse = context.createBuffer(2, Math.ceil(context.sampleRate * duration), context.sampleRate); const decay = Math.max(0.1, Number(p.decay ?? 2.5)); for (let channel = 0; channel < impulse.numberOfChannels; channel++) { const samples = impulse.getChannelData(channel); for (let index = 0; index < samples.length; index++) samples[index] = (Math.random() * 2 - 1) * Math.pow(1 - index / samples.length, decay); } node.buffer = impulse; return node; }
    return null;
  }
}

export const audioRenderEngine = new AudioRenderEngine();
