import { createTrackIdentity, MusicTrack, StoredMusicTrack } from "./types";
import { upload } from "@vercel/blob/client";
import { repairSwappedUtf16Text, type MusicMetadataSuggestion } from "./music-metadata";
import { idbRequest, MUSIC_STORES, openMusicDatabase } from "./music-db";
import { createMusicAudioAdapters, resolveMusicAudio } from "./audio-source-resolver";

const AUDIO_EXTENSIONS = /\.(mp3|wav|ogg|oga|m4a|aac|flac|opus|webm)$/i;
let accountUploadPrefix = "";
let accountIdentityNamespace = "device:default";
let accountStorageAvailable = false;

function normalizeMusicTrack(track: MusicTrack): MusicTrack {
  return { ...track, name: repairSwappedUtf16Text(track.name) || track.name, artist: repairSwappedUtf16Text(track.artist) || track.artist, album: repairSwappedUtf16Text(track.album) || track.album };
}

export function isSupportedMusicFile(file: Pick<File, "name" | "type" | "size">): boolean {
  return file.size > 0 && (file.type.startsWith("audio/") || AUDIO_EXTENSIONS.test(file.name));
}

export function createMusicTrack(file: File, durationMs = 0, id = crypto.randomUUID(), suggestion?: MusicMetadataSuggestion): StoredMusicTrack {
  const name = suggestion?.title || file.name.replace(/\.[^.]+$/, "") || file.name;
  return {
    id,
    name,
    artist: suggestion?.artist || "Artista desconhecido",
    album: suggestion?.album,
    metadataSource: suggestion?.source,
    metadataConfidence: suggestion?.confidence,
    originalFilename: suggestion?.originalFilename || file.name,
    durationMs,
    mimeType: file.type || "application/octet-stream",
    sizeBytes: file.size,
    addedAt: new Date().toISOString(),
    audio: file,
  };
}

export function formatMusicTime(milliseconds: number): string {
  if (!Number.isFinite(milliseconds) || milliseconds < 0) return "0:00";
  const seconds = Math.floor(milliseconds / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function adjacentTrackIndex(currentIndex: number, count: number, direction: -1 | 1): number {
  if (count <= 0) return -1;
  if (currentIndex < 0) return direction === 1 ? 0 : count - 1;
  return (currentIndex + direction + count) % count;
}

export const musicLibrary = {
  isAccountStorageAvailable(): boolean { return accountStorageAvailable; },
  getIdentityNamespace(): string { return accountIdentityNamespace; },
  streamingUrl(track: MusicTrack): string | undefined {
    return track.storageMode === "account" ? `/api/music/tracks/${encodeURIComponent(track.id)}/audio` : undefined;
  },
  async getArtworkUrls(trackId: string): Promise<{ coverUrl?: string; backgroundUrl?: string }> {
    if (!accountStorageAvailable) return {};
    const response = await fetch(`/api/music/tracks/${encodeURIComponent(trackId)}/artwork`, { cache: "no-store" });
    if (!response.ok) throw new Error("Não foi possível carregar as imagens salvas na sua conta.");
    return response.json() as Promise<{ coverUrl?: string; backgroundUrl?: string }>;
  },
  async uploadArtwork(file: File, kind: "cover" | "background", trackIds: string[]): Promise<void> {
    if (!accountStorageAvailable || !accountUploadPrefix) throw new Error("Entre na conta e carregue a biblioteca sincronizada antes de salvar artes na nuvem.");
    const mimeTypes: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif", "image/avif": "avif", "image/svg+xml": "svg" };
    const extension = mimeTypes[file.type];
    if (!extension) throw new Error("Formato de imagem não suportado. Use PNG, JPEG, WebP, GIF, AVIF ou SVG.");
    if (!trackIds.length || trackIds.length > 100) throw new Error("Escolha entre 1 e 100 faixas para aplicar a imagem.");
    const assetId = crypto.randomUUID();
    const pathname = `${accountUploadPrefix.replace(/\/tracks$/, "")}/artwork/${assetId}.${extension}`;
    const payload = { assetId, kind, trackIds: [...new Set(trackIds)], mimeType: file.type, sizeBytes: file.size };
    await upload(pathname, file, { access: "private", handleUploadUrl: "/api/music/artwork/upload", clientPayload: JSON.stringify(payload), contentType: file.type });
    const response = await fetch("/api/music/artwork", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind, trackIds: payload.trackIds, assetId }) });
    if (!response.ok) { const error = await response.json().catch(() => null) as { error?: string } | null; throw new Error(error?.error || "A imagem foi enviada, mas não foi associada às faixas escolhidas."); }
  },
  async clearArtwork(kind: "cover" | "background", trackIds: string[]): Promise<void> {
    if (!accountStorageAvailable) return;
    const response = await fetch("/api/music/artwork", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind, trackIds }) });
    if (!response.ok) { const error = await response.json().catch(() => null) as { error?: string } | null; throw new Error(error?.error || "Não foi possível remover a imagem da sua conta."); }
  },
  async list(): Promise<MusicTrack[]> {
    try {
      const response = await fetch("/api/music/library", { cache: "no-store" });
      if (response.ok) {
        const result = await response.json() as { tracks: MusicTrack[]; uploadPrefix: string };
        accountUploadPrefix = result.uploadPrefix;
        accountIdentityNamespace = `account:${result.uploadPrefix.split("/")[1] || "unknown"}`;
        accountStorageAvailable = true;
        return result.tracks.map(normalizeMusicTrack);
      }
    } catch { /* Keep the device library available while offline. */ }
    // A successful but unavailable response means account storage is not ready; the browser library remains usable.
    accountUploadPrefix = "";
    accountIdentityNamespace = "device:default";
    accountStorageAvailable = false;
    const database = await openMusicDatabase();
    try {
      const tracks = await idbRequest(database.transaction(MUSIC_STORES.tracks, "readonly").objectStore(MUSIC_STORES.tracks).getAll()) as MusicTrack[];
      return tracks.map((track) => ({ ...normalizeMusicTrack(track), storageMode: "device" as const })).sort((a, b) => a.name.localeCompare(b.name));
    } finally {
      database.close();
    }
  },

  async getAudio(id: string, track?: MusicTrack): Promise<Blob> {
    const metadata = track ?? { id, name: "", artist: "", durationMs: 0, mimeType: "", sizeBytes: 0, addedAt: "", storageMode: accountStorageAvailable ? "account" as const : "device" as const };
    const adapters = createMusicAudioAdapters(async (item) => {
      const database = await openMusicDatabase();
      try { return await idbRequest(database.transaction(MUSIC_STORES.audio, "readonly").objectStore(MUSIC_STORES.audio).get(item.id)) as Blob | undefined; }
      finally { database.close(); }
    }, async (item, signal) => {
      const response = await fetch(`/api/music/tracks/${encodeURIComponent(item.id)}/audio`, { cache: "no-store", signal });
      if (!response.ok) throw new Error(response.status === 404 ? "Esta faixa não pertence à sua conta ou foi removida." : "Não foi possível baixar o áudio da sua conta.");
      return response.blob();
    });
    return resolveMusicAudio(metadata, adapters);
  },

  async add(track: StoredMusicTrack): Promise<"account" | "device"> {
    if (accountStorageAvailable && accountUploadPrefix) {
      const extension = (track.audio as File).name?.split(".").pop()?.toLowerCase() || "mp3";
      if (!/^[a-z0-9]{1,8}$/.test(extension)) throw new Error("A extensão deste arquivo de áudio não é compatível.");
      const pathname = `${accountUploadPrefix}/${track.id}.${extension}`;
      const metadata = { id: track.id, identityId: track.identityId || track.id, name: track.name, artist: track.artist, album: track.album, durationMs: track.durationMs, mimeType: track.mimeType, sizeBytes: track.sizeBytes, addedAt: track.addedAt, metadataSource: track.metadataSource, metadataConfidence: track.metadataConfidence, originalFilename: track.originalFilename };
      const guessedTypes: Record<string, string> = { mp3: "audio/mpeg", wav: "audio/wav", ogg: "audio/ogg", oga: "audio/ogg", m4a: "audio/mp4", aac: "audio/aac", flac: "audio/flac", opus: "audio/opus", webm: "audio/webm" };
      const contentType = track.mimeType.startsWith("audio/") ? track.mimeType : guessedTypes[extension] || "audio/mpeg";
      const blob = await upload(pathname, track.audio, {
        access: "private",
        handleUploadUrl: "/api/music/upload",
        clientPayload: JSON.stringify(metadata),
        contentType,
        multipart: track.sizeBytes > 100 * 1024 * 1024,
      });
      // Persist the catalog from the signed-in client too; the signed Vercel completion callback remains an idempotent fallback.
      const response = await fetch("/api/music/library", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ track: metadata, pathname: blob.pathname }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(error?.error || "O áudio foi enviado, mas não foi possível salvar a faixa na sua conta.");
      }
      return "account";
    }
    const database = await openMusicDatabase();
    try {
      const transaction = database.transaction([MUSIC_STORES.tracks, MUSIC_STORES.audio, MUSIC_STORES.identities], "readwrite");
      const { audio, ...metadata } = track;
      transaction.objectStore(MUSIC_STORES.tracks).add({ ...metadata, identityId: track.identityId || track.id });
      transaction.objectStore(MUSIC_STORES.audio).add(audio, track.id);
      transaction.objectStore(MUSIC_STORES.identities).put(createTrackIdentity({ ...metadata, storageMode: "device", identityId: track.identityId || track.id }));
      await new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error ?? new Error("Não foi possível salvar a faixa localmente."));
        transaction.onabort = () => reject(transaction.error ?? new Error("O armazenamento local cancelou a importação."));
      });
    } finally {
      database.close();
    }
    return "device";
  },

  async updateMetadata(trackId: string, name: string, artist: string): Promise<void> {
    const cleanName = name.trim(); const cleanArtist = artist.trim();
    if (!cleanName || cleanName.length > 240 || cleanArtist.length > 240) throw new Error("Informe um título e artista válidos.");
    if (accountStorageAvailable) {
      const response = await fetch("/api/music/library", {
        method: "PATCH", headers: { "content-type": "application/json" },
        body: JSON.stringify({ trackId, name: cleanName, artist: cleanArtist }),
      });
      if (!response.ok) { const error = await response.json().catch(() => null) as { error?: string } | null; throw new Error(error?.error || "Não foi possível atualizar os metadados da faixa."); }
      return;
    }
    const database = await openMusicDatabase();
    try {
      const transaction = database.transaction(MUSIC_STORES.tracks, "readwrite");
      const store = transaction.objectStore(MUSIC_STORES.tracks);
      const current = await idbRequest(store.get(trackId)) as MusicTrack | undefined;
      if (!current) throw new Error("Faixa não encontrada neste dispositivo.");
      store.put({ ...current, name: cleanName, artist: cleanArtist, metadataSource: "manual", metadataConfidence: 1 });
      await new Promise<void>((resolve, reject) => { transaction.oncomplete = () => resolve(); transaction.onerror = () => reject(transaction.error); transaction.onabort = () => reject(transaction.error); });
    } finally { database.close(); }
  },
};
