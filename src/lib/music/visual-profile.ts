import type { MusicDNA } from "./music-studio";

export type ParticleType = "none" | "dust" | "rain" | "stars" | "wave";
export type VisualMood = "balanced" | "dark" | "urban" | "calm" | "aggressive" | "bright";
export interface VisualProfile {
  id: string;
  schemaVersion: 1;
  trackId: string;
  palette: string[];
  accentColor: string;
  coverDataUrl?: string;
  backgroundDataUrl?: string;
  particleType: ParticleType;
  particleDensity: number;
  glowIntensity: number;
  parallaxIntensity: number;
  motionSpeed: number;
  shaderPreset: "gradient" | "grain" | "lines";
  mood: VisualMood;
  beatResponse: number;
  bassResponse: number;
  midResponse: number;
  trebleResponse: number;
  reducedMotion: boolean;
  updatedAt: string;
}

const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, Number.isFinite(value) ? value : 0));

export function createVisualProfile(trackId: string, dna?: MusicDNA, seed = 0): VisualProfile {
  const hue = (Array.from(trackId).reduce((sum, c) => sum + c.charCodeAt(0), seed) * 17) % 360;
  const brightness = dna?.brightness ?? 0.5;
  const intensity = dna?.intensity ?? 0.4;
  const palette = [`hsl(${hue} 76% 58%)`, `hsl(${(hue + 66) % 360} 72% 54%)`, `hsl(${(hue + 188) % 360} 62% 18%)`];
  return { id: trackId, schemaVersion: 1, trackId, palette, accentColor: palette[0], particleType: intensity > 0.7 ? "dust" : "stars", particleDensity: clamp(0.18 + intensity * 0.45), glowIntensity: clamp(0.16 + intensity * 0.52), parallaxIntensity: 0.12, motionSpeed: clamp(0.12 + intensity * 0.2), shaderPreset: brightness > 0.68 ? "lines" : "gradient", mood: brightness < 0.28 ? "dark" : intensity < 0.28 ? "calm" : "balanced", beatResponse: 0.24, bassResponse: 0.55, midResponse: 0.25, trebleResponse: 0.3, reducedMotion: false, updatedAt: new Date().toISOString() };
}

export function applyVisualDirective(profile: VisualProfile, directive: string): VisualProfile {
  const text = directive.toLocaleLowerCase("pt-BR");
  const next = { ...profile, palette: [...profile.palette], updatedAt: new Date().toISOString() };
  if (/sombr[ao]|sombria|dark|noturna|noite/.test(text)) { next.mood = "dark"; next.palette = ["#171827", "#5c4b8a", "#07080e"]; next.glowIntensity = Math.min(next.glowIntensity, 0.35); }
  if (/cidade|urbano|urban/.test(text)) { next.mood = "urban"; next.shaderPreset = "lines"; next.palette = ["#4f6f91", "#a97855", "#10151d"]; }
  if (/calm[ao]|tranquil[ao]|estudar|relax/.test(text)) { next.mood = "calm"; next.motionSpeed = 0.1; next.particleDensity = 0.16; }
  if (/agressiv[ao]|intens[ao]/.test(text)) { next.mood = "aggressive"; next.glowIntensity = 0.82; next.bassResponse = 0.82; }
  if (/brilhante|clara|bright/.test(text)) { next.mood = "bright"; next.palette = ["#f0abfc", "#67e8f9", "#201435"]; }
  if (/chuva|rain/.test(text)) next.particleType = "rain";
  if (/estrela|stars/.test(text)) next.particleType = "stars";
  if (/poeira|dust|part[ií]cula/.test(text)) next.particleType = "dust";
  if (/sem movimento|parar movimento|reduzir movimento|reduce motion/.test(text)) { next.reducedMotion = true; next.motionSpeed = 0; next.parallaxIntensity = 0; }
  if (/sem vermelho|n[aã]o.*vermelh|evitar vermelho/.test(text)) {
    next.palette = next.palette.map((color, index) => /red|#[fF][0-9a-fA-F]{2}00/.test(color) || index === 0 ? "#4f86a8" : color);
    next.accentColor = next.palette[0];
  } else next.accentColor = next.palette[0];
  return next;
}

export function visualFrameStyle(profile: VisualProfile, frame: { bass: number; mids: number; treble: number; loudness: number; playing: boolean }): Record<string, string> {
  const bass = clamp(frame.bass); const mids = clamp(frame.mids); const treble = clamp(frame.treble); const loudness = clamp(frame.loudness);
  const response = profile.reducedMotion ? 0 : 1;
  return {
    "--music-accent": profile.accentColor,
    "--music-glow": String(clamp(profile.glowIntensity + bass * profile.bassResponse * 0.35 * response)),
    "--music-scale": String(1 + bass * profile.bassResponse * 0.08 * response * Number(frame.playing)),
    "--music-mids": String(mids * profile.midResponse * response),
    "--music-treble": String(treble * profile.trebleResponse * response),
    "--music-motion": `${profile.motionSpeed}s`,
    "--music-loudness": String(loudness),
  };
}
