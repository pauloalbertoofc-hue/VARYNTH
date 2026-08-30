export interface FrameRate {
  numerator: number;
  denominator: number;
}

export const FPS_24: FrameRate = { numerator: 24, denominator: 1 };
export const FPS_25: FrameRate = { numerator: 25, denominator: 1 };
export const FPS_30: FrameRate = { numerator: 30, denominator: 1 };
export const FPS_60: FrameRate = { numerator: 60, denominator: 1 };
export const FPS_23_976: FrameRate = { numerator: 24000, denominator: 1001 };
export const FPS_29_97: FrameRate = { numerator: 30000, denominator: 1001 };
export const FPS_59_94: FrameRate = { numerator: 60000, denominator: 1001 };

export function parseFrameRate(input: number | FrameRate): FrameRate {
  if (typeof input === "object" && "numerator" in input && "denominator" in input) {
    return input;
  }
  if (Math.abs(input - 23.976) < 0.01) return FPS_23_976;
  if (Math.abs(input - 29.97) < 0.01) return FPS_29_97;
  if (Math.abs(input - 59.94) < 0.01) return FPS_59_94;
  return { numerator: Math.round(input * 1000), denominator: 1000 };
}

export function getFrameRateFloat(fps: FrameRate | number): number {
  if (typeof fps === "number") return fps;
  return fps.numerator / fps.denominator;
}

/**
 * Converts milliseconds to canonical integer frame index based on rational frame rate.
 */
export function timeMsToFrame(timeMs: number, fps: FrameRate | number): number {
  if (timeMs <= 0) return 0;
  const rate = typeof fps === "number" ? parseFrameRate(fps) : fps;
  // Frame = floor((timeMs * numerator) / (denominator * 1000))
  return Math.floor((timeMs * rate.numerator) / (rate.denominator * 1000));
}

/**
 * Converts frame index to exact milliseconds based on rational frame rate.
 */
export function frameToTimeMs(frame: number, fps: FrameRate | number): number {
  if (frame <= 0) return 0;
  const rate = typeof fps === "number" ? parseFrameRate(fps) : fps;
  // timeMs = (frame * denominator * 1000) / numerator
  return (frame * rate.denominator * 1000) / rate.numerator;
}

/**
 * Converts timeline milliseconds to audio sample index.
 */
export function timeToAudioSample(timeMs: number, sampleRate: number = 44100): number {
  if (timeMs <= 0) return 0;
  return Math.round((timeMs / 1000) * sampleRate);
}

/**
 * Converts audio sample index to timeline milliseconds.
 */
export function audioSampleToTime(sample: number, sampleRate: number = 44100): number {
  if (sample <= 0) return 0;
  return (sample / sampleRate) * 1000;
}

/**
 * Formats milliseconds into SMPTE Timecode (HH:MM:SS:FF) or standard digital time (MM:SS.mmm).
 */
export function formatTimecode(
  timeMs: number,
  options?: { fps?: FrameRate | number; showFrames?: boolean }
): string {
  const safeMs = Math.max(0, timeMs);
  const totalSeconds = Math.floor(safeMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (options?.showFrames && options.fps) {
    const fps = options.fps;
    const currentFrame = timeMsToFrame(safeMs, fps);
    const fpsFloat = getFrameRateFloat(fps);
    const frameInSecond = Math.floor(currentFrame % Math.round(fpsFloat));

    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}:${frameInSecond
      .toString()
      .padStart(2, "0")}`;
  }

  const millis = Math.floor(safeMs % 1000);
  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}.${millis.toString().padStart(3, "0")}`;
}

/**
 * Snaps time to grid interval or nearby magnetic points within a threshold.
 */
export function snapTimeToGrid(
  timeMs: number,
  gridIntervalMs: number = 1000,
  magneticPoints: number[] = [],
  snapThresholdMs: number = 250
): number {
  for (const point of magneticPoints) {
    if (Math.abs(timeMs - point) <= snapThresholdMs) {
      return point;
    }
  }

  if (gridIntervalMs > 0) {
    const remainder = timeMs % gridIntervalMs;
    if (remainder <= snapThresholdMs) {
      return timeMs - remainder;
    }
    if (gridIntervalMs - remainder <= snapThresholdMs) {
      return timeMs + (gridIntervalMs - remainder);
    }
  }

  return timeMs;
}

export interface TimeRange {
  startMs: number;
  endMs: number;
}

export interface TemporalMarker {
  id: string;
  timeMs: number;
  label: string;
  color?: string;
}

export function validateTimeRange(startMs: number, endMs: number): { valid: boolean; error?: string } {
  if (startMs < 0) {
    return { valid: false, error: "[INVALID_TIME_RANGE] O tempo inicial não pode ser negativo." };
  }
  if (startMs >= endMs) {
    return {
      valid: false,
      error: `[INVALID_TIME_RANGE] O tempo inicial (${startMs}ms) deve ser estritamente menor que o final (${endMs}ms).`,
    };
  }
  return { valid: true };
}

export function validateClipRange(
  timelineStartMs: number,
  sourceStartMs: number,
  sourceEndMs: number
): { valid: boolean; error?: string } {
  if (timelineStartMs < 0) {
    return { valid: false, error: "[INVALID_CLIP_RANGE] Início na timeline não pode ser negativo." };
  }
  if (sourceStartMs < 0 || sourceStartMs >= sourceEndMs) {
    return {
      valid: false,
      error: `[INVALID_CLIP_RANGE] Intervalo do source inválido (${sourceStartMs}ms a ${sourceEndMs}ms).`,
    };
  }
  return { valid: true };
}

/**
 * Interpolates scalar property (like opacity, scale, rotation) between two keyframes.
 */
export function interpolateScalar(
  timeMs: number,
  k1: { timeMs: number; value: number; interpolation?: "LINEAR" | "HOLD" },
  k2?: { timeMs: number; value: number; interpolation?: "LINEAR" | "HOLD" }
): number {
  if (!k2 || timeMs <= k1.timeMs) return k1.value;
  if (timeMs >= k2.timeMs) return k2.value;
  if (k1.interpolation === "HOLD") return k1.value;

  const progress = (timeMs - k1.timeMs) / (k2.timeMs - k1.timeMs);
  return k1.value + (k2.value - k1.value) * progress;
}

