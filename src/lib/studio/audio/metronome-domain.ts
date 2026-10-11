import { beatsPerMeasure, tempoMapBeatsToSeconds, tempoMapSecondsToBeats, TimeSignature, TempoPoint } from "./music-domain";

export interface MetronomeTick {
  beat: number;
  delayMs: number;
  accented: boolean;
}

export function scheduleMetronomeTicks(options: {
  positionMs: number;
  timeSignature: TimeSignature;
  tempoMap: TempoPoint[];
  fallbackBpm: number;
  countInBars?: number;
  tickCount?: number;
}): MetronomeTick[] {
  const { positionMs, timeSignature, tempoMap, fallbackBpm } = options;
  if (!Number.isFinite(positionMs) || positionMs < 0) throw new Error("Posição do metrônomo inválida.");
  if (!Number.isFinite(fallbackBpm) || fallbackBpm <= 0) throw new Error("BPM do metrônomo inválido.");
  const countInBars = Math.max(0, Math.floor(options.countInBars ?? 0));
  const tickCount = Math.max(1, Math.floor(options.tickCount ?? 4096));
  const ticksPerBar = timeSignature.numerator;
  const quarterNotesPerTick = 4 / timeSignature.denominator;
  const measureBeats = beatsPerMeasure(timeSignature);
  const positionSeconds = positionMs / 1000;
  const map = tempoMap.length ? tempoMap : [{ beat: 0, bpm: fallbackBpm }];
  const positionBeat = tempoMapSecondsToBeats(positionSeconds, map);
  const positionTick = positionBeat / quarterNotesPerTick;
  const firstTick = Math.ceil(positionTick - 0.0001) - countInBars * ticksPerBar;
  const initialBpm = map.slice().sort((a, b) => a.beat - b.beat)[0]?.bpm || fallbackBpm;
  if (!Number.isFinite(initialBpm) || initialBpm <= 0) throw new Error("BPM inicial do metrônomo inválido.");
  const startDelayMs = countInBars * measureBeats * 60_000 / initialBpm;

  return Array.from({ length: tickCount }, (_, index) => {
    const tick = firstTick + index;
    const beat = tick * quarterNotesPerTick;
    const delayMs = tick < 0
      ? startDelayMs + beat * 60_000 / initialBpm
      : startDelayMs + (tempoMapBeatsToSeconds(beat, map) - positionSeconds) * 1000;
    return { beat, delayMs: Math.max(0, delayMs), accented: ((tick % ticksPerBar) + ticksPerBar) % ticksPerBar === 0 };
  });
}
