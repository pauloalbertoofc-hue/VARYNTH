export type DrumLane = "kick" | "snare" | "hat" | "clap" | "tom" | "perc";

export interface DrumStep { active: boolean; velocity: number; probability: number; microtimingMs: number; }
export interface DrumPattern { id: string; name: string; steps: number; subdivision: 4 | 8 | 16 | 32; lanes: Record<DrumLane, DrumStep[]>; swing: number; }

const LANES: DrumLane[] = ["kick", "snare", "hat", "clap", "tom", "perc"];
const clamp = (value: unknown, min: number, max: number, fallback: number) => Number.isFinite(Number(value)) ? Math.max(min, Math.min(max, Number(value))) : fallback;
const defaultStep = (): DrumStep => ({ active: false, velocity: 100, probability: 1, microtimingMs: 0 });

export function createDrumPattern(input: Partial<DrumPattern> & Pick<DrumPattern, "id" | "name">): DrumPattern {
  const steps = Math.round(clamp(input.steps, 1, 128, 16));
  const lanes = {} as Record<DrumLane, DrumStep[]>;
  for (const lane of LANES) {
    const source = input.lanes?.[lane] || [];
    lanes[lane] = Array.from({ length: steps }, (_, index) => {
      const step = source[index] || defaultStep();
      return { active: Boolean(step.active), velocity: Math.round(clamp(step.velocity, 1, 127, 100)), probability: clamp(step.probability, 0, 1, 1), microtimingMs: clamp(step.microtimingMs, -100, 100, 0) };
    });
  }
  const name = input.name.trim();
  if (!input.id.trim() || !name) throw new Error("[DRUM_PATTERN_INVALID] ID e nome são obrigatórios.");
  return { id: input.id.trim(), name, steps, subdivision: input.subdivision === 4 || input.subdivision === 8 || input.subdivision === 32 ? input.subdivision : 16, lanes, swing: clamp(input.swing, 0, 1, 0) };
}

export function stepTimeBeats(step: number, pattern: DrumPattern): number { return Math.max(0, step) * (4 / pattern.subdivision); }
export function shouldTrigger(step: DrumStep, random = Math.random()): boolean { return step.active && random >= 0 && random <= 1 && random <= step.probability; }
export function drumLanes(): DrumLane[] { return [...LANES]; }
