import type { MusicTrack } from "./types";

export type MusicAudioSource = { kind: "device" | "account" | "hub"; id: string; available: boolean; ownerId?: string; rights?: string };
export interface MusicAudioSourceAdapter {
  readonly kind: MusicAudioSource["kind"];
  canResolve(track: MusicTrack): boolean;
  resolve(track: MusicTrack, signal?: AbortSignal): Promise<Blob | undefined>;
}

/** Resolves only sources explicitly declared for a track; no public/community fallback is implicit. */
export async function resolveMusicAudio(track: MusicTrack, adapters: MusicAudioSourceAdapter[], signal?: AbortSignal): Promise<Blob> {
  const adapter = adapters.find((candidate) => candidate.canResolve(track));
  if (!adapter) throw new Error("A origem desta faixa não está disponível neste dispositivo.");
  const blob = await adapter.resolve(track, signal);
  if (!blob || blob.size === 0) throw new Error("O áudio desta faixa está indisponível ou vazio.");
  return blob;
}

export function createMusicAudioAdapters(getLocal: (track: MusicTrack) => Promise<Blob | undefined>, getAccount: (track: MusicTrack, signal?: AbortSignal) => Promise<Blob | undefined>): MusicAudioSourceAdapter[] {
  return [
    { kind: "device", canResolve: (track) => track.storageMode === "device", resolve: (track) => getLocal(track) },
    { kind: "account", canResolve: (track) => track.storageMode !== "device", resolve: (track, signal) => getAccount(track, signal) },
  ];
}
