import { GameEntity } from "./types";

export interface PhysicsStepResult { collisions: { entityId: string; targetEntityId: string }[]; }
const component = (e: GameEntity, type: string) => e.components.find(c => c.type === type) as any;

export function stepPhysics(entities: Record<string, GameEntity>, dtMs: number): PhysicsStepResult {
  const list = Object.values(entities).filter(e => e.active);
  for (const entity of list) {
    const body = component(entity, "RIGID_BODY"); const tr = component(entity, "TRANSFORM");
    if (!body || !tr || body.mode === "STATIC") continue;
    const dt = dtMs / 1000;
    body.velocityY += 980 * body.gravityScale * dt;
    tr.x += body.velocityX * dt; tr.y += body.velocityY * dt;
  }
  const collisions: PhysicsStepResult["collisions"] = [];
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    const a = component(list[i], "COLLIDER"), b = component(list[j], "COLLIDER"), at = component(list[i], "TRANSFORM"), bt = component(list[j], "TRANSFORM");
    if (!a || !b || !at || !bt || !overlap(at, a, bt, b)) continue;
    collisions.push({ entityId: list[i].id, targetEntityId: list[j].id }, { entityId: list[j].id, targetEntityId: list[i].id });
    if (!a.isTrigger && !b.isTrigger) resolve(list[i], list[j]);
  }
  return { collisions };
}

function overlap(at: any, a: any, bt: any, b: any) {
  if (a.shape === "CIRCLE" && b.shape === "CIRCLE") return Math.hypot(at.x - bt.x, at.y - bt.y) <= (a.radius || 0) + (b.radius || 0);
  const aw = a.shape === "CIRCLE" ? (a.radius || 0) * 2 : a.width, ah = a.shape === "CIRCLE" ? (a.radius || 0) * 2 : a.height;
  const bw = b.shape === "CIRCLE" ? (b.radius || 0) * 2 : b.width, bh = b.shape === "CIRCLE" ? (b.radius || 0) * 2 : b.height;
  return Math.abs(at.x - bt.x) * 2 < aw + bw && Math.abs(at.y - bt.y) * 2 < ah + bh;
}
function resolve(a: GameEntity, b: GameEntity) { const ab = component(a, "RIGID_BODY"), bb = component(b, "RIGID_BODY"); if (ab?.mode === "DYNAMIC" && bb?.mode === "STATIC") { ab.velocityX *= Math.max(0, 1 - Number(ab.friction || 0) * 0.016); ab.velocityY = -Math.abs(ab.velocityY) * Math.max(0, Number(ab.restitution || 0)); } if (bb?.mode === "DYNAMIC" && ab?.mode === "STATIC") { bb.velocityX *= Math.max(0, 1 - Number(bb.friction || 0) * 0.016); bb.velocityY = -Math.abs(bb.velocityY) * Math.max(0, Number(bb.restitution || 0)); } }
