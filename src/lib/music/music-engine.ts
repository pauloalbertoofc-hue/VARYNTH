import { varynthEventBus } from "@/lib/events/varynth-event-bus";
import type { MusicTrack } from "./types";

export type MusicEngineState = "IDLE" | "PLAYING" | "PAUSED";
export type MusicWaveform = { id: string; schemaVersion: 1; trackId: string; peaks: number[]; durationSeconds: number; method: "decoded-pcm-peak"; updatedAt: string };

/** Builds a historical seek waveform from decoded PCM. FFT frames stay a separate, live signal. */
export function waveformPeaksFromPcm(channels: readonly Float32Array[], buckets = 128): number[] {
  const channelLength = Math.max(0, ...channels.map((channel) => channel.length));
  if (!channelLength || !channels.length || !Number.isInteger(buckets) || buckets < 1 || buckets > 2048) return [];
  const peaks = new Array<number>(buckets).fill(0);
  for (let bucket = 0; bucket < buckets; bucket++) {
    const start = Math.floor(bucket * channelLength / buckets);
    const end = Math.max(start + 1, Math.floor((bucket + 1) * channelLength / buckets));
    let max = 0;
    for (const channel of channels) for (let i = start; i < Math.min(end, channel.length); i++) max = Math.max(max, Math.abs(channel[i]));
    peaks[bucket] = Math.round(Math.max(0, Math.min(1, max)) * 1_000_000) / 1_000_000;
  }
  return peaks;
}

export async function decodeWaveform(blob: Blob, trackId: string, buckets = 128, durationHintSeconds?: number): Promise<MusicWaveform | undefined> {
  if (typeof window === "undefined" || typeof AudioContext === "undefined" || !blob.size || blob.size > 32 * 1024 * 1024 || (durationHintSeconds !== undefined && durationHintSeconds > 30 * 60)) return undefined;
  const context = new AudioContext();
  try {
    const decoded = await context.decodeAudioData(await blob.arrayBuffer());
    const peaks = waveformPeaksFromPcm(Array.from({ length: decoded.numberOfChannels }, (_, i) => decoded.getChannelData(i)), buckets);
    if (!peaks.length) return undefined;
    return { id: trackId, schemaVersion: 1, trackId, peaks, durationSeconds: decoded.duration, method: "decoded-pcm-peak", updatedAt: new Date().toISOString() };
  } finally { await context.close(); }
}

/** Playback state authority. It reports only confirmed audio-element events to the app bus. */
export class MusicEngine {
  private state: MusicEngineState = "IDLE";
  private currentTrack?: Pick<MusicTrack, "id" | "name">;
  get playbackState() { return this.state; }

  loadTrack(track?: Pick<MusicTrack, "id" | "name">) {
    const previousTrackId = this.currentTrack?.id;
    this.currentTrack = track;
    this.state = "PAUSED";
    if (track) varynthEventBus.emit("MUSIC.TRACK_CHANGED", { trackId: track.id, title: track.name, previousTrackId });
    else { this.state = "IDLE"; varynthEventBus.emit("MUSIC.IDLE", {}); }
  }

  confirmPlaying() {
    if (!this.currentTrack) return;
    this.state = "PLAYING";
    varynthEventBus.emit("MUSIC.PLAYING", { trackId: this.currentTrack.id, title: this.currentTrack.name });
  }

  confirmPaused() {
    if (!this.currentTrack) return;
    this.state = "PAUSED";
    varynthEventBus.emit("MUSIC.PAUSED", { trackId: this.currentTrack.id, title: this.currentTrack.name });
  }
}
