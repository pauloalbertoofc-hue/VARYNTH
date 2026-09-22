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
export function shouldTrigger(step: DrumStep, random = Math.random()): boolean { return step.active && random >= 0 && random < 1 && random < step.probability; }
export function drumLanes(): DrumLane[] { return [...LANES]; }

const LANE_MIDI: Record<DrumLane, number> = { kick: 36, snare: 38, hat: 42, clap: 39, tom: 45, perc: 50 };
export function drumPatternToNotes(pattern: DrumPattern, tempoMap: TempoPoint[] = [{ beat: 0, bpm: 120 }], startBeat = 0, idPrefix = pattern.id) {
  return LANES.flatMap((lane) => pattern.lanes[lane].flatMap((step, index) => {
    if (!step.active) return [];
    const midi = LANE_MIDI[lane];
    const pitch = midiToPitch(midi);
    const subdivisionBeats = 4 / pattern.subdivision;
    const baseBeat = startBeat + index * subdivisionBeats + (index % 2 === 1 ? pattern.swing * subdivisionBeats * 0.5 : 0);
    const baseSeconds = tempoMapBeatsToSeconds(baseBeat, tempoMap);
    const position = tempoMapSecondsToBeats(Math.max(0, baseSeconds + step.microtimingMs / 1000), tempoMap);
    return [{ id: `${idPrefix}-${lane}-${index}`, ...pitch, startBeat: Math.max(0, position), durationBeats: subdivisionBeats, velocity: step.velocity, articulation: "staccato" as const, expression: step.probability, drum: { patternId: pattern.id, lane, step: index, probability: step.probability, microtimingMs: step.microtimingMs } }];
  }));
}
import { midiToPitch, tempoMapBeatsToSeconds, tempoMapSecondsToBeats, TempoPoint } from "./music-domain";
