import { AudioDocumentState } from "./types";
import { assetManager } from "../../artifacts/asset-manager";
import { createLocalSynthInstrument, LocalSynthInstrument } from "./instrument-engine";
import { effectiveNoteDurationBeats, flattenMusicNotes, pitchToMidi, tempoMapBeatsToSeconds, tempoMapSecondsToBeats } from "./music-domain";
import { isAudioTrackAudible, isAudioTrackDirectOutputAudible, isAudioTrackSendAudible, validateAudioBusRouting } from "./audio-routing";
import { crossfadeLoopChannels } from "./audio-loop";

export interface AudioEngineSnapshot { state: "STOPPED" | "PLAYING" | "PAUSED"; positionMs: number; sampleRate?: number; }

/** Browser playback backend. Project state remains the source of truth; nodes are disposable. */
export class AudioEngine {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private trackAnalysers = new Map<string, AnalyserNode>();
  private busAnalysers = new Map<string, AnalyserNode>();
  private sources: AudioBufferSourceNode[] = [];
  private startedAt = 0;
  private offsetMs = 0;
  private state: AudioEngineSnapshot["state"] = "STOPPED";
  private recorder: MediaRecorder | null = null;
  private recordingChunks: Blob[] = [];
  private recordingStartedAt = 0;
  private inputAnalyser: AnalyserNode | null = null;
  private musicInstruments = new Map<string, LocalSynthInstrument>();
  private musicTimers: ReturnType<typeof setTimeout>[] = [];
  private metronomeTimers: ReturnType<typeof setTimeout>[] = [];

  private getContext(): AudioContext {
    if (typeof window === "undefined") throw new Error("[AUDIO_RUNTIME_UNAVAILABLE] Playback requires a browser AudioContext.");
    const Ctor = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctor) throw new Error("[AUDIO_RUNTIME_UNAVAILABLE] Web Audio is not supported by this browser.");
    if (!this.context) { this.context = new Ctor(); this.master = this.context.createGain(); this.master.gain.value = 1; this.analyser = this.context.createAnalyser(); this.analyser.fftSize = 2048; this.master.connect(this.analyser).connect(this.context.destination); }
    return this.context;
  }

  async play(project: AudioDocumentState): Promise<void> {
    const context = this.getContext();
    validateAudioBusRouting(project.buses || []);
    await context.resume();
    this.stopNodes();
    this.trackAnalysers.clear();
    this.busAnalysers.clear();
    this.master!.disconnect();
    let masterChain: AudioNode = this.master!;
    this.master!.gain.value = project.masterBus?.volume ?? 1;
    for (const effect of project.masterBus?.effects || []) { if (!effect.enabled) continue; const fx = this.createEffectNode(context, effect); if (fx) { masterChain.connect(fx); masterChain = fx; } }
    const masterPanner = context.createStereoPanner();
    masterPanner.pan.value = Math.max(-1, Math.min(1, project.masterBus?.pan ?? 0));
    masterChain.connect(masterPanner).connect(this.analyser!);
    const active = project.tracks.filter((track) => isAudioTrackAudible(track, project.tracks, project.buses || []));
    if (project.masterBus?.muted) return;
    const busNodes = new Map<string, GainNode>();
    const busTails = new Map<string, AudioNode>();
    for (const bus of project.buses || []) { const node = context.createGain(); node.gain.value = bus.muted ? 0 : bus.volume; let busChain: AudioNode = node; for (const effect of bus.effects || []) { if (!effect.enabled) continue; const fx = this.createEffectNode(context, effect); if (fx) { busChain.connect(fx); busChain = fx; } } const panner = context.createStereoPanner(); panner.pan.value = Math.max(-1, Math.min(1, bus.pan)); busChain.connect(panner); const analyser = context.createAnalyser(); analyser.fftSize = 1024; panner.connect(analyser); this.busAnalysers.set(bus.id, analyser); busNodes.set(bus.id, node); busTails.set(bus.id, analyser); }
    for (const bus of project.buses || []) { const destination = bus.outputBusId ? busNodes.get(bus.outputBusId) : this.master!; if (!destination) throw new Error(`[AUDIO_ROUTING_INVALID] Bus de saída '${bus.outputBusId}' não encontrado.`); busTails.get(bus.id)!.connect(destination); }
    const position = Math.max(0, this.offsetMs || project.playheadMs);
    const metronome = project.settings?.metronome;
    const countInBars = position === 0 && metronome?.enabled ? Math.max(0, Math.floor(metronome.countInBars ?? 0)) : 0;
    const beatsPerBar = project.music?.timeSignature.numerator || project.settings?.timeSignature?.[0] || 4;
    const bpm = project.music?.tempoMap[0]?.bpm || project.settings?.bpm || 120;
    const startDelayMs = countInBars * beatsPerBar * 60000 / bpm;
    for (const track of active) for (const clip of track.clips) {
      const clipStart = clip.timelineStartMs;
      const clipEnd = clipStart + (clip.sourceEndMs - clip.sourceStartMs);
      if (clipEnd <= position) continue;
      const data = await assetManager.getAssetData(clip.assetId);
      if (!data) continue;
      const raw = typeof data === "string" ? await (await fetch(data)).arrayBuffer() : data instanceof ArrayBuffer ? data : await (data as Blob).arrayBuffer();
      const buffer = await context.decodeAudioData(raw.slice(0));
      let playbackBuffer = buffer;
      let loopBounds: { startFrame: number; endFrame: number } | undefined;
      if (clip.loop?.enabled) {
        const startMs = Math.min(buffer.duration * 1000, Math.max(0, clip.loop.startMs ?? clip.sourceStartMs));
        const endMs = Math.min(buffer.duration * 1000, clip.loop.endMs ?? clip.sourceEndMs);
        const crossfadeMs = clip.loop.crossfadeMs ?? 0;
        const loop = crossfadeLoopChannels(Array.from({ length: buffer.numberOfChannels }, (_, channel) => buffer.getChannelData(channel)), buffer.sampleRate, startMs, endMs, crossfadeMs);
        if (loop.crossfadeFrames > 0) { playbackBuffer = context.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate); loop.channels.forEach((samples, channel) => playbackBuffer.getChannelData(channel).set(samples)); }
        loopBounds = { startFrame: loop.loopStartFrame, endFrame: loop.loopEndFrame };
      }
      const source = context.createBufferSource(); source.buffer = playbackBuffer;
      if (loopBounds) { source.loop = true; source.loopStart = loopBounds.startFrame / buffer.sampleRate; source.loopEnd = loopBounds.endFrame / buffer.sampleRate; }
      const clipGain = context.createGain(); clipGain.gain.value = clip.gain ?? 1;
      const trackFader = context.createGain(); trackFader.gain.value = this.automationValue(project, track.id, "TRACK_VOLUME", track.volume ?? 1, position);
      const pan = context.createStereoPanner(); pan.pan.value = Math.max(-1, Math.min(1, track.pan ?? 0));
      const bus = track.busId ? project.buses?.find((item) => item.id === track.busId) : undefined;
      if (track.busId && !bus) throw new Error(`[AUDIO_ROUTING_INVALID] Bus '${track.busId}' não encontrado.`);
      const destination = bus ? busNodes.get(bus.id)! : this.master!;
      const trackAnalyser = context.createAnalyser(); trackAnalyser.fftSize = 1024; this.trackAnalysers.set(track.id, trackAnalyser);
      let chain: AudioNode = clipGain;
      for (const effect of track.effects || []) { if (!effect.enabled) continue; const node = this.createEffectNode(context, effect); if (node) { chain.connect(node); chain = node; } }
      const preFader = chain;
      if (clip.spatial) { const spatial = context.createPanner(); spatial.panningModel = "HRTF"; spatial.distanceModel = "inverse"; spatial.positionX.value = clip.spatial.x; spatial.positionY.value = clip.spatial.y; spatial.positionZ.value = clip.spatial.z; spatial.refDistance = Math.max(0.001, clip.spatial.refDistance ?? 1); spatial.maxDistance = Math.max(spatial.refDistance, clip.spatial.maxDistance ?? 10000); spatial.rolloffFactor = Math.max(0, clip.spatial.rolloffFactor ?? 1); chain.connect(spatial); chain = spatial; }
      chain.connect(trackFader).connect(pan).connect(trackAnalyser);
      if (isAudioTrackDirectOutputAudible(track, project.buses || [])) trackAnalyser.connect(destination);
      for (const send of track.sends || []) { if (send.enabled && isAudioTrackSendAudible(track, send.busId, project.buses || [])) { const sendBus = busNodes.get(send.busId); if (!sendBus) throw new Error(`[AUDIO_ROUTING_INVALID] Send bus '${send.busId}' não encontrado.`); const sendGain = context.createGain(); sendGain.gain.value = send.level; (send.preFader ? preFader : trackAnalyser).connect(sendGain).connect(sendBus); } }
      const when = context.currentTime + startDelayMs / 1000 + Math.max(0, (clipStart - position) / 1000);
      const sourceOffset = (clip.sourceStartMs + Math.max(0, position - clipStart)) / 1000;
      const sourceDuration = Math.max(0.001, (clip.sourceEndMs - clip.sourceStartMs - Math.max(0, position - clipStart)) / 1000);
      source.connect(clipGain);
      source.start(when, sourceOffset, sourceDuration);
      const activeClipDuration = sourceDuration;
      if (clip.fadeInMs && clipStart + clip.fadeInMs > position) { clipGain.gain.setValueAtTime(0, when); clipGain.gain.linearRampToValueAtTime(clip.gain ?? 1, when + clip.fadeInMs / 1000); }
      if (clip.fadeOutMs) { clipGain.gain.setValueAtTime(clip.gain ?? 1, when + Math.max(0, activeClipDuration - clip.fadeOutMs / 1000)); clipGain.gain.linearRampToValueAtTime(0, when + activeClipDuration); }
      const points = (project.automation || []).filter((point) => point.targetId === track.id && point.parameter === "TRACK_VOLUME").sort((a, b) => a.timeMs - b.timeMs);
      for (const point of points) { const relative = (point.timeMs - position) / 1000; if (relative >= 0 && relative <= activeClipDuration) trackFader.gain.linearRampToValueAtTime(point.value, context.currentTime + relative); }
      const panPoints = (project.automation || []).filter((point) => point.targetId === track.id && point.parameter === "TRACK_PAN").sort((a, b) => a.timeMs - b.timeMs);
      for (const point of panPoints) { const relative = (point.timeMs - position) / 1000; if (relative >= 0 && relative <= (clipEnd - position) / 1000) pan.pan.linearRampToValueAtTime(point.value, context.currentTime + relative); }
      this.sources.push(source);
    }
    this.scheduleMusic(project, position, busNodes, startDelayMs);
    this.scheduleMetronome(project, position, startDelayMs, countInBars);
    this.startedAt = context.currentTime; this.state = "PLAYING";
  }

  pause(): void { if (this.state === "PLAYING") { this.offsetMs = this.positionMs(); this.stopNodes(); this.state = "PAUSED"; } }
  stop(): void { this.stopNodes(); this.offsetMs = 0; this.state = "STOPPED"; }
  seek(positionMs: number): void { this.offsetMs = Math.max(0, positionMs); if (this.state === "PLAYING") this.state = "PAUSED"; this.stopNodes(); }
  positionMs(): number { return this.state === "PLAYING" && this.context ? this.offsetMs + (this.context.currentTime - this.startedAt) * 1000 : this.offsetMs; }
  snapshot(): AudioEngineSnapshot { return { state: this.state, positionMs: this.positionMs(), sampleRate: this.context?.sampleRate }; }
  dispose(): void { this.stop(); void this.context?.close(); this.context = null; this.master = null; this.analyser = null; this.trackAnalysers.clear(); this.busAnalysers.clear(); }
  async startRecording(deviceId?: string): Promise<void> {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) throw new Error("[RECORDING_UNAVAILABLE] Microfone não disponível neste navegador.");
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: deviceId ? { deviceId: { exact: deviceId } } : true });
    } catch (cause) {
      const name = cause instanceof DOMException ? cause.name : "";
      const message = name === "NotAllowedError"
        ? "[RECORDING_PERMISSION_DENIED] Permita o acesso ao microfone nas configurações do navegador e tente novamente."
        : name === "NotFoundError"
          ? "[RECORDING_DEVICE_NOT_FOUND] Nenhum microfone disponível foi encontrado."
          : name === "NotReadableError"
            ? "[RECORDING_DEVICE_BUSY] O microfone está sendo usado por outro aplicativo."
            : "[RECORDING_FAILED] Não foi possível iniciar a gravação. Verifique o dispositivo selecionado.";
      throw new Error(message);
    }
    const context = this.getContext(); const input = context.createMediaStreamSource(stream); this.inputAnalyser = context.createAnalyser(); this.inputAnalyser.fftSize = 1024; input.connect(this.inputAnalyser);
    this.recordingChunks = [];
    this.recordingStartedAt = performance.now();
    this.recorder = new MediaRecorder(stream);
    this.recorder.ondataavailable = (event) => { if (event.data.size) this.recordingChunks.push(event.data); };
    this.recorder.start();
  }
  stopRecording(): Promise<Blob> {
    if (!this.recorder) return Promise.reject(new Error("[RECORDING_NOT_ACTIVE] Nenhuma gravação ativa."));
    return new Promise((resolve) => { const recorder = this.recorder!; recorder.onstop = () => { recorder.stream.getTracks().forEach((track) => track.stop()); this.inputAnalyser = null; this.recorder = null; resolve(new Blob(this.recordingChunks, { type: recorder.mimeType || "audio/webm" })); }; recorder.stop(); });
  }
  recordingDurationMs(): number { return this.recordingStartedAt ? Math.max(0, performance.now() - this.recordingStartedAt) : 0; }
  async listInputDevices(): Promise<MediaDeviceInfo[]> {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) return [];
    return (await navigator.mediaDevices.enumerateDevices()).filter((device) => device.kind === "audioinput");
  }
  diagnostics(): { contextState: string; sampleRate?: number; activeSources: number; recording: boolean } {
    return { contextState: this.context?.state || "uninitialized", sampleRate: this.context?.sampleRate, activeSources: this.sources.length, recording: Boolean(this.recorder) };
  }
  metering(): { peak: number; rms: number } {
    if (!this.analyser) return { peak: 0, rms: 0 };
    const values = new Float32Array(this.analyser.fftSize); this.analyser.getFloatTimeDomainData(values);
    let peak = 0; let sum = 0; for (const value of values) { const abs = Math.abs(value); peak = Math.max(peak, abs); sum += value * value; }
    return { peak, rms: Math.sqrt(sum / values.length) };
  }
  spectrum(): number[] { if (!this.analyser) return []; const values = new Uint8Array(this.analyser.frequencyBinCount); this.analyser.getByteFrequencyData(values); return Array.from(values); }
  trackMetering(trackId: string): { peak: number; rms: number } { return this.readAnalyser(this.trackAnalysers.get(trackId)); }
  busMetering(busId: string): { peak: number; rms: number } { return this.readAnalyser(this.busAnalysers.get(busId)); }
  inputMetering(): { peak: number; rms: number } { return this.readAnalyser(this.inputAnalyser || undefined); }
  private readAnalyser(analyser?: AnalyserNode): { peak: number; rms: number } { if (!analyser) return { peak: 0, rms: 0 }; const values = new Float32Array(analyser.fftSize); analyser.getFloatTimeDomainData(values); let peak = 0; let sum = 0; for (const value of values) { peak = Math.max(peak, Math.abs(value)); sum += value * value; } return { peak, rms: Math.sqrt(sum / values.length) }; }
  private automationValue(project: AudioDocumentState, targetId: string, parameter: "TRACK_VOLUME" | "TRACK_PAN", fallback: number, timeMs: number): number {
    const points = (project.automation || []).filter((point) => point.targetId === targetId && point.parameter === parameter).sort((a, b) => a.timeMs - b.timeMs);
    if (!points.length) return fallback;
    let previous = points[0]; if (timeMs <= previous.timeMs) return previous.value;
    for (const next of points.slice(1)) { if (timeMs <= next.timeMs) { const ratio = (timeMs - previous.timeMs) / Math.max(1, next.timeMs - previous.timeMs); return previous.value + (next.value - previous.value) * ratio; } previous = next; }
    return previous.value;
  }
  private createEffectNode(context: AudioContext, effect: { type: string; parameters: Record<string, number | string | boolean> }): AudioNode | null {
    const p = effect.parameters || {}; const type = effect.type.toUpperCase();
    if (type === "GAIN") { const node = context.createGain(); node.gain.value = Number(p.gain ?? p.value ?? 1); return node; }
    if (type === "EQ" || type === "HIGH_PASS" || type === "LOW_PASS") { const node = context.createBiquadFilter(); node.type = type === "EQ" ? "peaking" : type === "HIGH_PASS" ? "highpass" : "lowpass"; node.frequency.value = Number(p.frequency ?? 1000); node.Q.value = Number(p.q ?? 1); if (type === "EQ") node.gain.value = Number(p.gain ?? 0); return node; }
    if (type === "COMPRESSOR" || type === "LIMITER") { const node = context.createDynamicsCompressor(); node.threshold.value = Number(p.threshold ?? (type === "LIMITER" ? -1 : -24)); node.ratio.value = Number(p.ratio ?? (type === "LIMITER" ? 20 : 4)); node.attack.value = Number(p.attack ?? 0.003); node.release.value = Number(p.release ?? 0.25); return node; }
    if (type === "DELAY") { const node = context.createDelay(5); node.delayTime.value = Number(p.time ?? 0.25); return node; }
    if (type === "REVERB") { const duration = Math.max(0.05, Math.min(8, Number(p.duration ?? 1.8))); const node = context.createConvolver(); const impulse = context.createBuffer(2, Math.ceil(context.sampleRate * duration), context.sampleRate); const decay = Math.max(0.1, Number(p.decay ?? 2.5)); for (let channel = 0; channel < impulse.numberOfChannels; channel++) { const samples = impulse.getChannelData(channel); for (let index = 0; index < samples.length; index++) samples[index] = (Math.random() * 2 - 1) * Math.pow(1 - index / samples.length, decay); } node.buffer = impulse; return node; }
    return null;
  }
  private scheduleMusic(project: AudioDocumentState, positionMs: number, busNodes: Map<string, GainNode>, startDelayMs = 0): void {
    this.clearMusic();
    if (!project.music?.notes.length && !project.music?.clips?.length) return;
    const music = project.music;
    const tempoMap = music.tempoMap.length ? music.tempoMap : [{ beat: 0, bpm: project.settings?.bpm || 120 }];
    const positionSeconds = positionMs / 1000;
    const positionBeat = tempoMapSecondsToBeats(positionSeconds, tempoMap);
    const structured = music.clips || [];
    const groups = new Map<string, ReturnType<typeof flattenMusicNotes>>();
    if (structured.length) {
      for (const clip of structured) groups.set(clip.trackId, [...(groups.get(clip.trackId) || []), ...flattenMusicNotes({ ...music, notes: [], clips: [clip] })]);
    } else {
      const track = project.tracks.find((item) => item.type === "INSTRUMENT" || item.type === "MIDI" || item.type === "MUSIC");
      if (track) groups.set(track.id, music.notes);
    }
    const hasSolo = project.tracks.some((track) => track.solo);
    for (const [trackId, notes] of groups) {
      const track = project.tracks.find((item) => item.id === trackId);
      if (!track || !isAudioTrackAudible(track, project.tracks, project.buses || []) || project.masterBus?.muted) continue;
      const bus = track.busId ? project.buses?.find((item) => item.id === track.busId) : undefined;
      if (track.busId && !bus) throw new Error(`[AUDIO_ROUTING_INVALID] Bus '${track.busId}' não encontrado.`);
      if (bus?.muted) continue;
      const instrumentInput = this.context!.createGain();
      let chain: AudioNode = instrumentInput;
      for (const effect of track.effects || []) { if (!effect.enabled) continue; const node = this.createEffectNode(this.context!, effect); if (node) { chain.connect(node); chain = node; } }
      const preFader = chain;
      const fader = this.context!.createGain();
      fader.gain.value = this.automationValue(project, track.id, "TRACK_VOLUME", track.volume ?? 1, positionMs);
      const pan = this.context!.createStereoPanner();
      pan.pan.value = Math.max(-1, Math.min(1, this.automationValue(project, track.id, "TRACK_PAN", track.pan ?? 0, positionMs)));
      const analyser = this.context!.createAnalyser(); analyser.fftSize = 1024; this.trackAnalysers.set(track.id, analyser);
      let destination: AudioNode = this.master!;
      if (bus) { const busGain = busNodes.get(bus.id); if (!busGain) throw new Error(`[AUDIO_ROUTING_INVALID] Bus '${bus.id}' não está conectado ao master.`); destination = busGain; }
      chain.connect(fader).connect(pan).connect(analyser);
      if (isAudioTrackDirectOutputAudible(track, project.buses || [])) analyser.connect(destination);
      for (const send of track.sends || []) {
        if (!send.enabled) continue;
        const sendBus = busNodes.get(send.busId);
        if (!sendBus) throw new Error(`[AUDIO_ROUTING_INVALID] Send bus '${send.busId}' não encontrado.`);
        if (isAudioTrackSendAudible(track, send.busId, project.buses || [])) { const sendGain = this.context!.createGain(); sendGain.gain.value = send.level; (send.preFader ? preFader : analyser).connect(sendGain).connect(sendBus); }
      }
      const instrument = createLocalSynthInstrument(this.context!, instrumentInput);
      if (project.synthPreset) instrument.loadPreset(project.synthPreset);
      this.musicInstruments.set(track.id, instrument);
      for (const note of notes) {
        if (note.startBeat + effectiveNoteDurationBeats(note) <= positionBeat) continue;
        const pitch = pitchToMidi(note.pitch, note.octave, note.accidental);
        const delayMs = Math.max(0, (tempoMapBeatsToSeconds(note.startBeat, tempoMap) - positionSeconds) * 1000);
        const onTimer = setTimeout(() => {
          instrument.noteOn({ midi: pitch, velocity: note.velocity, articulation: note.articulation, expression: note.expression, concertPitchHz: music.tuning.concertPitchHz });
          const offTimer = setTimeout(() => instrument.noteOff(pitch), Math.max(10, (tempoMapBeatsToSeconds(note.startBeat + effectiveNoteDurationBeats(note), tempoMap) - tempoMapBeatsToSeconds(note.startBeat, tempoMap)) * 1000));
          this.musicTimers.push(offTimer);
        }, startDelayMs + delayMs);
        this.musicTimers.push(onTimer);
      }
    }
  }
  private scheduleMetronome(project: AudioDocumentState, positionMs: number, startDelayMs = 0, countInBars = 0): void {
    const metronome = project.settings?.metronome;
    if (!metronome?.enabled || !this.context) return;
    const bpm = project.music?.tempoMap[0]?.bpm || project.settings?.bpm || 120;
    const beatsPerBar = project.music?.timeSignature.numerator || project.settings?.timeSignature?.[0] || 4;
    const positionSeconds = positionMs / 1000;
    const positionBeat = tempoMapSecondsToBeats(positionSeconds, project.music?.tempoMap || [{ beat: 0, bpm }]);
    const firstBeat = Math.ceil(positionBeat - 0.0001) - countInBars * beatsPerBar;
    for (let beat = firstBeat; beat < firstBeat + 4096; beat++) {
      const delay = Math.max(0, startDelayMs + (tempoMapBeatsToSeconds(beat, project.music?.tempoMap || [{ beat: 0, bpm }]) - positionSeconds) * 1000);
      const timer = setTimeout(() => {
        if (!this.context) return;
        const now = this.context.currentTime;
        const oscillator = this.context.createOscillator(); const gain = this.context.createGain();
        oscillator.frequency.value = beat % beatsPerBar === 0 && metronome.accentFirstBeat ? 1760 : 1100;
        gain.gain.setValueAtTime(Math.max(0, Math.min(1, metronome.volume)) * (beat % beatsPerBar === 0 ? 0.16 : 0.1), now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045); oscillator.connect(gain).connect(this.master!); oscillator.start(now); oscillator.stop(now + 0.05);
      }, delay);
      this.metronomeTimers.push(timer);
    }
  }
  private clearMusic(): void { for (const timer of this.musicTimers) clearTimeout(timer); this.musicTimers = []; for (const timer of this.metronomeTimers) clearTimeout(timer); this.metronomeTimers = []; for (const instrument of this.musicInstruments.values()) instrument.dispose(); this.musicInstruments.clear(); }
  private stopNodes(): void { for (const source of this.sources) { try { source.stop(); } catch {} } this.sources = []; this.clearMusic(); }
}

export const audioEngine = new AudioEngine();
