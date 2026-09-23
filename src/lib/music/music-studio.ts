import type { MusicTrack } from "./types";
import type { MusicWaveform } from "./music-engine";
import type { TrackVisualIdentity } from "./visual-identity";
import { idbRequest, MUSIC_STORES, openMusicDatabase } from "./music-db";

export type VisualQuality = "low" | "balanced" | "high";
export type MusicAnalysisStatus = "UNKNOWN" | "ANALYZING" | "PARTIAL" | "COMPLETE";
export type MusicSectionLabel = "INTRO" | "VERSE" | "BUILD" | "CHORUS" | "DROP" | "BRIDGE" | "OUTRO";
export type MusicSection = { timeSeconds: number; label: MusicSectionLabel; confidence: number; method: "energy-heuristic" };
export type MusicAnalysisFrame = { loudness: number; bass: number; mids: number; treble: number; centroid: number; rms?: number };

export type MusicDNA = {
  id: string;
  schemaVersion: 2;
  trackId: string;
  status: Exclude<MusicAnalysisStatus, "UNKNOWN" | "ANALYZING">;
  durationSeconds: number;
  sampleCount: number;
  meanLoudness: number;
  rms?: number;
  spectralCentroid: number;
  bass: number;
  mids: number;
  treble: number;
  dynamicRange?: number;
  intensity: number;
  brightness: number;
  darkness: number;
  calmness: number;
  aggression: number;
  tempoBpm?: number;
  sections: MusicSection[];
  visualTags: string[];
  analysisMethod: "playback-sampled" | "migrated-v1";
  updatedAt: string;
};

export type LegacyMusicDNA = { id: string; schemaVersion: 1; trackId: string; durationSeconds: number; meanLoudness: number; spectralCentroid: number; bass: number; mids: number; treble: number; updatedAt: string };
export type MusicPlaylist = { id: string; name: string; color: string; trackIds: string[]; updatedAt: string };
export type MusicFeedback = { id: string; trackId: string; rating: number; tags: string[]; note: string; createdAt: string };
export type MusicPreferenceMemory = { id: string; scopeId?: string; key: string; value: string; confidence: number; source: "explicit" | "feedback"; updatedAt: string };
export type MusicAgentMemory = { id: string; scopeId?: string; kind: "favorite" | "rejected-style" | "visual-preference" | "decision"; value: string; trackId?: string; createdAt: string };
export type MusicVisualPrompt = { prompt: string; style: string; createdAt: string; reducedMotion?: boolean };
export const MUSIC_ANALYSIS_LIMITS = { fftSize: { low: 512, balanced: 2048, high: 4096 }, visualUpdateIntervalMs: 50, dnaSaveIntervalMs: 5000, sectionSampleIntervalSeconds: 0.5, maxSectionSamples: 3600 } as const;

const openStore = async <T>(storeName: string, mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> => {
  const db = await openMusicDatabase();
  try {
    const tx = db.transaction(storeName, mode);
    const result = await idbRequest(operation(tx.objectStore(storeName)));
    if (mode === "readwrite") await new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onabort = () => reject(tx.error); tx.onerror = () => reject(tx.error); });
    return result;
  } finally { db.close(); }
};

export function spectralFeatures(data: Uint8Array): MusicAnalysisFrame {
  if (!data.length) return { loudness: 0, bass: 0, mids: 0, treble: 0, centroid: 0, rms: 0 };
  const bins = [0, 0, 0]; let total = 0; let weighted = 0; let squareTotal = 0;
  for (let i = 0; i < data.length; i++) { const v = data[i] / 255; total += v; squareTotal += v * v; weighted += i * v; bins[Math.min(2, Math.floor(i / data.length * 3))] += v; }
  const sum = bins.reduce((a, b) => a + b, 0) || 1;
  return { loudness: total / data.length, rms: Math.sqrt(squareTotal / data.length), bass: bins[0] / sum, mids: bins[1] / sum, treble: bins[2] / sum, centroid: weighted / total / data.length || 0 };
}

export function migrateMusicDNA(value: MusicDNA | LegacyMusicDNA | undefined): MusicDNA | undefined {
  if (!value) return undefined;
  if (value.schemaVersion === 2) return value;
  const brightness = clamp(value.spectralCentroid);
  const intensity = clamp(value.meanLoudness);
  return {
    id: value.id, schemaVersion: 2, trackId: value.trackId, status: "PARTIAL", durationSeconds: value.durationSeconds,
    sampleCount: 1, meanLoudness: value.meanLoudness, spectralCentroid: value.spectralCentroid,
    bass: value.bass, mids: value.mids, treble: value.treble, intensity, brightness,
    darkness: 1 - brightness, calmness: clamp(1 - intensity), aggression: clamp(value.bass * intensity),
    sections: [], visualTags: [], analysisMethod: "migrated-v1", updatedAt: value.updatedAt,
  };
}

const clamp = (n: number) => Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0));

export function makeMusicDNA(trackId: string, durationSeconds: number, frames: MusicAnalysisFrame[], updatedAt = new Date().toISOString(), status: "PARTIAL" | "COMPLETE" = "PARTIAL", sections: MusicSection[] = []): MusicDNA | undefined {
  if (!trackId || frames.length === 0) return undefined;
  const average = (key: keyof MusicAnalysisFrame) => frames.reduce((sum, frame) => sum + (typeof frame[key] === "number" ? Number(frame[key]) : 0), 0) / frames.length;
  const loudness = clamp(average("loudness")); const bass = clamp(average("bass")); const mids = clamp(average("mids")); const treble = clamp(average("treble")); const brightness = clamp(average("centroid"));
  const visualTags = [loudness > 0.68 ? "high-energy" : loudness < 0.28 ? "soft" : "balanced-energy", brightness > 0.6 ? "bright" : "dark", bass > 0.48 ? "bass-forward" : "balanced-spectrum"];
  return { id: trackId, schemaVersion: 2, trackId, status, durationSeconds, sampleCount: frames.length, meanLoudness: loudness, rms: frames.some((f) => typeof f.rms === "number") ? clamp(average("rms")) : undefined, spectralCentroid: brightness, bass, mids, treble, intensity: loudness, brightness, darkness: 1 - brightness, calmness: clamp(1 - loudness), aggression: clamp(loudness * (0.55 * bass + 0.45 * treble)), sections, visualTags, analysisMethod: "playback-sampled", updatedAt };
}

export function analyzeSections(samples: number[], durationSeconds: number): MusicSection[] {
  if (samples.length < 3 || durationSeconds <= 0) return [];
  const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
  const threshold = Math.max(0.06, mean * 1.55);
  const sections: MusicSection[] = [{ timeSeconds: 0, label: "INTRO", confidence: 0.35, method: "energy-heuristic" }];
  for (let i = 1; i < samples.length; i++) {
    const delta = Math.abs(samples[i] - samples[i - 1]);
    if (delta > threshold && (i * durationSeconds / samples.length) - sections[sections.length - 1].timeSeconds > 8) {
      const label: MusicSectionLabel = samples[i] > mean * 1.5 ? "DROP" : samples[i] > mean ? "BUILD" : "BRIDGE";
      sections.push({ timeSeconds: Math.round(i * durationSeconds / samples.length), label, confidence: Math.min(0.8, 0.35 + delta), method: "energy-heuristic" });
    }
  }
  return sections;
}

export const musicStudio = {
  getDNA: async (trackId: string) => migrateMusicDNA(await openStore<MusicDNA | LegacyMusicDNA | undefined>(MUSIC_STORES.dna, "readonly", (s) => s.get(trackId))),
  saveDNA: (dna: MusicDNA) => openStore(MUSIC_STORES.dna, "readwrite", (s) => s.put(dna)),
  getWaveform: (trackId: string) => openStore<MusicWaveform | undefined>(MUSIC_STORES.waveforms, "readonly", (s) => s.get(trackId)),
  saveWaveform: (waveform: MusicWaveform) => openStore(MUSIC_STORES.waveforms, "readwrite", (s) => s.put(waveform)),
  getVisualIdentity: (trackId: string) => openStore<TrackVisualIdentity | undefined>(MUSIC_STORES.visualIdentities, "readonly", (s) => s.get(trackId)),
  saveVisualIdentity: (identity: TrackVisualIdentity) => openStore(MUSIC_STORES.visualIdentities, "readwrite", (s) => s.put(identity)),
  listPlaylists: async () => (await openStore<MusicPlaylist[]>(MUSIC_STORES.playlists, "readonly", (s) => s.getAll())).sort((a, b) => a.name.localeCompare(b.name)),
  savePlaylist: (playlist: MusicPlaylist) => openStore(MUSIC_STORES.playlists, "readwrite", (s) => s.put(playlist)),
  saveFeedback: (feedback: MusicFeedback) => openStore(MUSIC_STORES.feedback, "readwrite", (s) => s.put(feedback)),
  listFeedback: () => openStore<MusicFeedback[]>(MUSIC_STORES.feedback, "readonly", (s) => s.getAll()),
  clearFeedback: () => openStore(MUSIC_STORES.feedback, "readwrite", (s) => s.clear()),
  getVisualProfile: (trackId: string) => openStore<unknown>(MUSIC_STORES.visualProfiles, "readonly", (s) => s.get(trackId)),
  saveVisualProfile: (profile: { id: string; trackId: string; [key: string]: unknown }) => openStore(MUSIC_STORES.visualProfiles, "readwrite", (s) => s.put(profile)),
  listPreferences: async (scopeId = "device:default") => (await openStore<MusicPreferenceMemory[]>(MUSIC_STORES.preferences, "readonly", (s) => s.getAll())).filter((item) => (item.scopeId || "device:default") === scopeId),
  savePreference: (item: MusicPreferenceMemory) => openStore(MUSIC_STORES.preferences, "readwrite", (s) => s.put(item)),
  listAgentMemory: async (scopeId = "device:default") => (await openStore<MusicAgentMemory[]>(MUSIC_STORES.agentMemory, "readonly", (s) => s.getAll())).filter((item) => (item.scopeId || "device:default") === scopeId),
  saveAgentMemory: (item: MusicAgentMemory) => openStore(MUSIC_STORES.agentMemory, "readwrite", (s) => s.put(item)),
  getIdentity: (trackId: string) => openStore<unknown>(MUSIC_STORES.identities, "readonly", (s) => s.get(trackId)),
  saveIdentity: (identity: { id: string; [key: string]: unknown }) => openStore(MUSIC_STORES.identities, "readwrite", (s) => s.put(identity)),
};

export interface VisualGenerationResult { description: string; palette: string[]; coverDataUrl?: string; backgroundDataUrl?: string }
export interface VisualGenerationProvider { readonly id: string; generate(input: MusicVisualPrompt & { title?: string; artist?: string; palette?: string[] }, signal?: AbortSignal): Promise<VisualGenerationResult> }

function escapeXml(value: string): string { return value.replace(/[<>&"']/g, (ch) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "\"": "&quot;", "'": "&apos;" })[ch]!); }
function svgData(svg: string): string { return `data:image/svg+xml,${encodeURIComponent(svg)}`; }
function safeVisualColor(value: string | undefined, fallback: string): string {
  const color = value?.trim() ?? "";
  return /^(#[\da-f]{3,8}|(?:rgb|hsl)a?\([\d.%\s,/-]+\)|[a-z]{1,20})$/i.test(color) ? escapeXml(color) : fallback;
}

/** Deterministic offline vector artwork; this is generative design, not a claim of AI image synthesis. */
export class LocalVisualGenerationProvider implements VisualGenerationProvider {
  readonly id = "local-svg-composition";
  async generate(input: MusicVisualPrompt & { title?: string; artist?: string; palette?: string[] }): Promise<VisualGenerationResult> {
    const seed = Array.from(`${input.title || input.prompt}${input.artist || ""}`).reduce((n, ch) => (n * 33 + ch.charCodeAt(0)) >>> 0, 5381);
    const hues = [seed % 360, (seed + 110) % 360, (seed + 225) % 360];
    const rawPalette = input.palette?.length ? input.palette.slice(0, 3) : hues.map((h) => `hsl(${h} 82% 62%)`);
    const palette = rawPalette.map((color, index) => safeVisualColor(color, `hsl(${hues[index] ?? hues[0]} 82% 62%)`));
    const title = escapeXml((input.title || input.prompt).slice(0, 72)); const artist = escapeXml((input.artist || input.style).slice(0, 56));
    const motion = input.reducedMotion ? "" : `<style>@keyframes drift{from{transform:translate(-18px,-8px) scale(.96)}to{transform:translate(26px,14px) scale(1.08)}}@keyframes orbit{to{transform:rotate(360deg)}}@keyframes breathe{0%,100%{opacity:.28}50%{opacity:.68}}.drift{transform-box:fill-box;transform-origin:center;animation:drift 17s ease-in-out infinite alternate}.orbit{transform-box:fill-box;transform-origin:center;animation:orbit 48s linear infinite}.pulse{animation:breathe 9s ease-in-out infinite}</style>`;
    const cover = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="${palette[0]}"/><stop offset="1" stop-color="#090914"/></linearGradient><filter id="b"><feGaussianBlur stdDeviation="36"/></filter></defs>${motion}<rect width="600" height="600" fill="#080811"/><circle class="drift" cx="190" cy="210" r="190" fill="${palette[1]}" opacity=".55" filter="url(#b)"/><circle class="drift" cx="440" cy="380" r="170" fill="${palette[2]}" opacity=".45" filter="url(#b)"/><g class="orbit" fill="none" stroke="${palette[0]}" opacity=".42"><ellipse cx="300" cy="300" rx="238" ry="115" stroke-width="2"/><ellipse cx="300" cy="300" rx="195" ry="85" stroke-width="1" transform="rotate(60 300 300)"/></g><path class="pulse" d="M0 470 Q140 330 280 470 T600 450 V600 H0Z" fill="url(#g)" opacity=".75"/><text x="42" y="500" fill="white" font-size="34" font-family="sans-serif" font-weight="700">${title}</text><text x="44" y="540" fill="#ddd" font-size="19" font-family="sans-serif">${artist}</text></svg>`;
    const background = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice"><defs><radialGradient id="a"><stop stop-color="${palette[0]}" stop-opacity=".62"/><stop offset="1" stop-color="#090914" stop-opacity="0"/></radialGradient><linearGradient id="b" x2="1" y2="1"><stop stop-color="#06060c"/><stop offset=".5" stop-color="${palette[1]}" stop-opacity=".28"/><stop offset="1" stop-color="#070711"/></linearGradient></defs>${motion}<rect width="1600" height="900" fill="url(#b)"/><ellipse class="drift" cx="420" cy="390" rx="550" ry="350" fill="url(#a)"/><ellipse class="drift" cx="1250" cy="660" rx="500" ry="380" fill="url(#a)"/><path class="pulse" d="M0 730 Q360 510 760 740 T1600 660 V900 H0Z" fill="${palette[2]}" opacity=".13"/></svg>`;
    return { description: `Composição vetorial ${input.reducedMotion ? "estática para movimento reduzido" : "animada"} local para “${input.title || input.prompt}” — ${input.style}. Não usa um modelo de IA.`, palette, coverDataUrl: svgData(cover), backgroundDataUrl: svgData(background) };
  }
}

export class RemoteVisualGenerationProvider implements VisualGenerationProvider {
  readonly id = "remote-unconfigured";
  async generate(): Promise<never> { throw new Error("Nenhum provedor visual remoto está configurado. A composição local continua disponível."); }
}

export class UnavailableVisualGenerationProvider implements VisualGenerationProvider {
  readonly id = "unavailable";
  async generate(): Promise<never> { throw new Error("Geração visual indisponível. A reprodução continua normalmente."); }
}

/** @deprecated Compatibility alias; Euterpe now owns the music domain. */
export const musicSpecialist = {
  id: "euterpe",
  memory: (track: MusicTrack, dna?: MusicDNA) => dna ? `${track.name}: DNA ${dna.schemaVersion}, energia ${dna.meanLoudness.toFixed(2)}, graves ${dna.bass.toFixed(2)}.` : `${track.name}: ainda sem perfil Music DNA.`,
  suggest: (track: MusicTrack, dna?: MusicDNA) => dna && dna.meanLoudness > 0.55 ? `A faixa “${track.name}” tem energia alta; experimente combiná-la com faixas de perfil próximo.` : `Ouça “${track.name}” e avalie como ela se encaixa na playlist escolhida.`,
  capabilities: ["READ_PROVIDED_METADATA", "READ_USER_APPROVED_DNA"] as const,
};
