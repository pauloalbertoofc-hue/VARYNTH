export interface MusicTrack {
  id: string;
  identityId?: string;
  name: string;
  artist: string;
  album?: string;
  durationMs: number;
  mimeType: string;
  sizeBytes: number;
  addedAt: string;
  storageMode?: "account" | "device";
  metadataSource?: "id3v2" | "id3v1" | "filename" | "fallback" | "manual";
  metadataConfidence?: number;
  originalFilename?: string;
}

/** Stable track metadata identity; audio stays attached to independently authorized origins. */
export interface TrackIdentity {
  id: string;
  schemaVersion: 1;
  title: string;
  artist: string;
  album?: string;
  origins: Array<{ kind: "device" | "account" | "hub"; sourceId: string; available: boolean; rights?: string }>;
  updatedAt: string;
}

export function createTrackIdentity(track: MusicTrack): TrackIdentity {
  const kind = track.storageMode === "device" ? "device" : "account";
  return { id: track.identityId || track.id, schemaVersion: 1, title: track.name, artist: track.artist, album: track.album, origins: [{ kind, sourceId: track.id, available: true }], updatedAt: new Date().toISOString() };
}

export interface StoredMusicTrack extends MusicTrack {
  audio: Blob;
}
