import { GameEntity } from "./types";

export interface CameraState { x: number; y: number; zoom: number; }
export function stepCameras(entities: Record<string, GameEntity>, dtMs: number): Record<string, CameraState> {
  const result: Record<string, CameraState> = {};
  for (const entity of Object.values(entities)) {
    const camera = entity.components.find(c => c.type === "CAMERA") as any;
    if (!camera) continue;
    const target = camera.followEntityId ? entities[camera.followEntityId] : undefined;
    const tr = target?.components.find(c => c.type === "TRANSFORM") as any;
    const own = entity.components.find(c => c.type === "TRANSFORM") as any;
    const goalX = (tr?.x ?? own?.x ?? 0) + camera.offsetX;
    const goalY = (tr?.y ?? own?.y ?? 0) + camera.offsetY;
    const previous = (camera.runtimeState || { x: own?.x || 0, y: own?.y || 0 });
    const factor = Math.min(1, Math.max(0, (camera.smoothing || 1) * dtMs / 16.666));
    let x = previous.x + (goalX - previous.x) * factor, y = previous.y + (goalY - previous.y) * factor;
    if (camera.limits) { x = Math.max(camera.limits.left, Math.min(camera.limits.right, x)); y = Math.max(camera.limits.top, Math.min(camera.limits.bottom, y)); }
    camera.runtimeState = { x, y }; result[entity.id] = { x, y, zoom: camera.zoom || 1 };
  }
  return result;
}
