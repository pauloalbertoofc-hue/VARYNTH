import type { MusicAudioSource } from "./audio-source-resolver";

export type MusicHubAvailability = "unconfigured" | "available" | "unavailable";
export type MusicHubTrack = { id: string; title: string; artist: string; source: MusicAudioSource; attribution: string; license: string; regions: string[] };
export interface MusicHubProvider {
  readonly id: string;
  availability(): Promise<MusicHubAvailability>;
  search(query: string, signal?: AbortSignal): Promise<MusicHubTrack[]>;
}

/** No public catalog is configured in VARYNTH. This provider never returns fabricated results. */
export class UnconfiguredMusicHubProvider implements MusicHubProvider {
  readonly id = "unconfigured";
  async availability(): Promise<MusicHubAvailability> { return "unconfigured"; }
  async search(_query: string): Promise<MusicHubTrack[]> { return []; }
}

export function isEligibleForPublicHub(track: MusicHubTrack): boolean {
  return track.source.kind === "hub" && track.source.available && Boolean(track.attribution.trim()) && Boolean(track.license.trim());
}
