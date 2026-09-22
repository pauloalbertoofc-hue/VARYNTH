export type CoverSource = "EMBEDDED" | "USER" | "GENERATED" | "PROCEDURAL";
export type AnimatedCoverKind = "STATIC_IMAGE" | "ANIMATED_IMAGE" | "VIDEO_LOOP" | "PROCEDURAL" | "LAYERED_SCENE";
export type BackgroundRendererKind = "STATIC" | "PARALLAX" | "ANIMATED" | "VIDEO_LOOP" | "PROCEDURAL" | "LAYERED";
export type AudioReactivity = "OFF" | "SUBTLE" | "NORMAL" | "INTENSE";
export type EnvironmentEffectType = "RAIN" | "SNOW" | "FOG" | "PETALS" | "FIREFLIES" | "STARS" | "DUST" | "EMBERS" | "LIGHT_RAYS" | "WATER" | "AURORA" | "MAGICAL_NOTES";
export type EnvironmentEffect = { type: EnvironmentEffectType; intensity: number; speed: number; density: number; depth: number; audioBand?: "bass" | "mids" | "treble" | "energy"; audioInfluence: number; interaction: "none" | "euterpe" | "scene"; performanceCost: "low" | "medium" | "high" };
export type SceneAnchorType = "REST_SPOT" | "SITTABLE" | "STANDING_AREA" | "SAFE_AREA" | "AVOID_AREA" | "INTEREST_POINT";
export type SceneAnchor = { id: string; type: SceneAnchorType; x: number; y: number; width?: number; height?: number; posture?: "STAND" | "SIT" | "LIE_DOWN" };
export type TrackVisualIdentity = { id: string; schemaVersion: 1; trackId: string; cover: { source: CoverSource; assetUrl?: string; kind: AnimatedCoverKind }; background: { renderer: BackgroundRendererKind; assetUrl?: string; layers?: string[] }; environment: { effects: EnvironmentEffect[]; anchors: SceneAnchor[] }; animation: { mode: "STATIC" | "SMOOTH" | "ANIMATED"; reducedMotion: boolean }; audioReactive: AudioReactivity; metadata: { intent?: string; createdAt: string; updatedAt: string } };

export type VisualGenerationScope = "COVER" | "BACKGROUND" | "COVER_AND_BACKGROUND" | "COMPLETE_IDENTITY" | "ANIMATED_COVER";
export type VisualIntent = { trackId: string; title: string; artist?: string; album?: string; scope: VisualGenerationScope; prompt: string; signals: { energy?: number; bpm?: number; artworkAvailable: boolean; lyricsAvailable: false } };
export type VisualGenerationCandidate = { id: string; scope: VisualGenerationScope; coverUrl?: string; backgroundUrl?: string; description: string; providerId: string };
export interface EuterpeVisualGenerationBridge { request(intent: VisualIntent): Promise<readonly VisualGenerationCandidate[]>; }

export function createTrackVisualIdentity(trackId: string, now = new Date().toISOString()): TrackVisualIdentity { return { id: trackId, schemaVersion: 1, trackId, cover: { source: "PROCEDURAL", kind: "STATIC_IMAGE" }, background: { renderer: "PROCEDURAL" }, environment: { effects: [{ type: "STARS", intensity: .35, speed: .2, density: .18, depth: .4, audioBand: "treble", audioInfluence: .2, interaction: "scene", performanceCost: "low" }], anchors: [{ id: "safe-bottom-right", type: "SAFE_AREA", x: .84, y: .82, width: .14, height: .14, posture: "STAND" }] }, animation: { mode: "SMOOTH", reducedMotion: false }, audioReactive: "NORMAL", metadata: { createdAt: now, updatedAt: now } }; }
