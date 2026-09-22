import { GameEntity } from "./types";

export function stepAnimations(entities: Record<string, GameEntity>, dtMs: number) {
  for (const entity of Object.values(entities)) {
    const animator = entity.components.find(c => c.type === "ANIMATOR") as any;
    if (!animator?.playing || !animator.clips.length) continue;
    const clip = animator.clips.find((c: any) => c.id === animator.activeClipId) || animator.clips[0];
    animator.activeClipId = clip.id;
    const total = clip.frames.reduce((sum: number, frame: any) => sum + frame.durationMs, 0);
    const elapsed = (animator.elapsedMs || 0) + dtMs;
    animator.elapsedMs = clip.loop ? (total ? elapsed % total : 0) : Math.min(elapsed, total);
    let cursor = 0;
    animator.frameIndex = clip.frames.findIndex((frame: any) => { cursor += frame.durationMs; return animator.elapsedMs < cursor; });
    if (animator.frameIndex < 0) animator.frameIndex = Math.max(0, clip.frames.length - 1);
  }
}
