import { AudioBus, AudioTrack } from "./types";

export function validateAudioBusRouting(buses: AudioBus[]): void {
  const byId = new Map(buses.map((bus) => [bus.id, bus]));
  for (const start of buses) {
    const visited = new Set<string>();
    let current: AudioBus | undefined = start;
    while (current?.outputBusId) {
      if (visited.has(current.id)) throw new Error(`[AUDIO_ROUTING_INVALID] Ciclo detectado na rota dos buses em '${current.name}'.`);
      visited.add(current.id);
      current = byId.get(current.outputBusId);
      if (!current) throw new Error(`[AUDIO_ROUTING_INVALID] Bus de saída não encontrado na rota '${start.name}'.`);
    }
  }
}

export function audioBusRouteContains(busId: string | undefined, targetBusIds: Set<string>, buses: AudioBus[]): boolean {
  if (!busId) return false;
  const byId = new Map(buses.map((bus) => [bus.id, bus]));
  const visited = new Set<string>();
  let current = byId.get(busId);
  while (current && !visited.has(current.id)) {
    if (targetBusIds.has(current.id)) return true;
    visited.add(current.id);
    current = current.outputBusId ? byId.get(current.outputBusId) : undefined;
  }
  return false;
}

export function isAudioTrackAudible(track: AudioTrack, tracks: AudioTrack[], buses: AudioBus[]): boolean {
  if (track.muted) return false;
  const soloTracks = tracks.filter((candidate) => candidate.solo);
  if (soloTracks.length && !track.solo) return false;
  const soloBuses = new Set(buses.filter((bus) => bus.solo).map((bus) => bus.id));
  if (!soloBuses.size) return true;
  return audioBusRouteContains(track.busId, soloBuses, buses)
    || (track.sends || []).some((send) => send.enabled && audioBusRouteContains(send.busId, soloBuses, buses));
}

export function isAudioTrackDirectOutputAudible(track: AudioTrack, buses: AudioBus[]): boolean {
  const soloBuses = new Set(buses.filter((bus) => bus.solo).map((bus) => bus.id));
  return !soloBuses.size || audioBusRouteContains(track.busId, soloBuses, buses);
}

export function isAudioTrackSendAudible(track: AudioTrack, sendBusId: string, buses: AudioBus[]): boolean {
  const soloBuses = new Set(buses.filter((bus) => bus.solo).map((bus) => bus.id));
  return !soloBuses.size || audioBusRouteContains(sendBusId, soloBuses, buses);
}
