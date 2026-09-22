export type IdlePhase = "ACTIVE_IDLE" | "RELAXED_IDLE" | "REST_ELIGIBLE";
export function idlePhase(elapsedMs: number): IdlePhase { if (elapsedMs < 30_000) return "ACTIVE_IDLE"; if (elapsedMs < 180_000) return "RELAXED_IDLE"; return "REST_ELIGIBLE"; }
export type EuterpeMovementKind = "WALK" | "FLOAT" | "HOP" | "MOVE_TO" | "SIT" | "LIE_DOWN" | "APPROACH" | "RETREAT";
export type MovementPlan = { kind: EuterpeMovementKind; origin: { x: number; y: number }; destination: { x: number; y: number }; durationMs: number; easing: "linear" | "ease-in-out"; interruptible: boolean; safeAreaId?: string };
export type RestSpot = { id: string; x: number; y: number; posture: "SIT" | "LIE_DOWN"; blocksControls: boolean };
export function selectRestSpot(spots: readonly RestSpot[]): RestSpot | undefined { return spots.filter((spot) => !spot.blocksControls).sort((a, b) => a.y - b.y || a.x - b.x)[0]; }
export const EUTERPE_IDLE_REST_SPOTS: readonly RestSpot[] = [
  { id: "now-playing-right-rest", x: .88, y: .57, posture: "LIE_DOWN", blocksControls: false },
];
export function idleRestPosition(): { x: number; y: number } {
  const spot = selectRestSpot(EUTERPE_IDLE_REST_SPOTS);
  return spot ? { x: spot.x, y: spot.y } : { x: .88, y: .78 };
}
export type EuterpePresenceMode = "MUSIC_SCENE" | "IN_APP_GLOBAL" | "SYSTEM_OVERLAY" | "LOCK_SCREEN_CONTEXT" | "HIDDEN";
export type PlatformKind = "WEB" | "PWA" | "ANDROID_NATIVE" | "DESKTOP";
export type PlatformCapabilities = { systemMediaSession: boolean; visualOverlay: boolean; lockScreenVisuals: boolean };
export function detectPlatformCapabilities(): { platform: PlatformKind; capabilities: PlatformCapabilities } { const standalone = typeof window !== "undefined" && window.matchMedia("(display-mode: standalone)").matches; return { platform: standalone ? "PWA" : "WEB", capabilities: { systemMediaSession: typeof navigator !== "undefined" && "mediaSession" in navigator, visualOverlay: false, lockScreenVisuals: false } }; }
export type EuterpeProp = { id: string; kind: "PILLOW" | "BENCH" | "MUSICAL_CLOUD" | "BLANKET"; owner: "euterpe"; temporary: true };
