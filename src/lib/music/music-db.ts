export const MUSIC_DB_NAME = "varynth-music-library";
export const MUSIC_DB_VERSION = 5;
export const MUSIC_STORES = {
  tracks: "tracks", audio: "audio", dna: "dna", waveforms: "waveforms", visualIdentities: "visualIdentities", playlists: "playlists", feedback: "feedback",
  visualProfiles: "visualProfiles", preferences: "preferences", agentMemory: "agentMemory", identities: "identities",
} as const;

/** Single schema owner for the local Music database; upgrades preserve all v1/v2 stores and records. */
export function openMusicDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") return Promise.reject(new Error("Este navegador não oferece armazenamento para Music."));
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(MUSIC_DB_NAME, MUSIC_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const name of [MUSIC_STORES.tracks, MUSIC_STORES.dna, MUSIC_STORES.waveforms, MUSIC_STORES.visualIdentities, MUSIC_STORES.playlists, MUSIC_STORES.feedback, MUSIC_STORES.visualProfiles, MUSIC_STORES.preferences, MUSIC_STORES.agentMemory, MUSIC_STORES.identities]) {
        if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(MUSIC_STORES.audio)) db.createObjectStore(MUSIC_STORES.audio);
    };
    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = () => reject(request.error ?? new Error("Não foi possível abrir o armazenamento Music."));
    request.onblocked = () => reject(new Error("Feche outras abas do Music para atualizar seu armazenamento local."));
  });
}

export function idbRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Falha ao acessar o armazenamento Music."));
  });
}
