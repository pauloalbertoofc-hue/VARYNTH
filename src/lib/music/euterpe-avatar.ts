export type NormalizedPosition = { x: number; y: number };
export const EUTERPE_POSITION_KEY = "varynth.music.euterpe.position.v1";
export const EUTERPE_DRAG_THRESHOLD = 8;
export type EuterpeGesture = "TAP" | "DRAG" | "LONG_PRESS";
export function classifyEuterpeGesture(moved: boolean, longPressed: boolean): EuterpeGesture { return moved ? "DRAG" : longPressed ? "LONG_PRESS" : "TAP"; }
export function isEuterpeMotionEnabled(reducedMotion: boolean, reactiveMotion: boolean): boolean { return !reducedMotion && reactiveMotion; }

export function clampPosition(position: NormalizedPosition): NormalizedPosition {
  return { x: Math.max(0, Math.min(1, Number.isFinite(position.x) ? position.x : .88)), y: Math.max(0, Math.min(1, Number.isFinite(position.y) ? position.y : .78)) };
}
export function positionFromPointer(clientX: number, clientY: number, bounds: { left: number; top: number; width: number; height: number }, size: { width: number; height: number }): NormalizedPosition {
  const width = Math.max(1, bounds.width - size.width), height = Math.max(1, bounds.height - size.height);
  return clampPosition({ x: (clientX - bounds.left - size.width / 2) / width, y: (clientY - bounds.top - size.height / 2) / height });
}
export function readEuterpePosition(storage: Pick<Storage, "getItem"> | undefined, key = EUTERPE_POSITION_KEY): NormalizedPosition | undefined {
  try { const raw = storage?.getItem(key); if (!raw) return; const value = JSON.parse(raw) as Partial<NormalizedPosition>; if (typeof value.x === "number" && typeof value.y === "number") return clampPosition({ x: value.x, y: value.y }); } catch { /* Use default position when storage is unavailable or malformed. */ }
}
export function saveEuterpePosition(storage: Pick<Storage, "setItem"> | undefined, position: NormalizedPosition, key = EUTERPE_POSITION_KEY): void {
  try { storage?.setItem(key, JSON.stringify(clampPosition(position))); } catch { /* Position remains usable until this page closes. */ }
}
