/** Convert a pointer position over the waveform into a clamped media time. */
export function musicSeekTimeAtPointer(clientX: number, left: number, width: number, durationSeconds: number): number {
  if (![clientX, left, width, durationSeconds].every(Number.isFinite) || width <= 0 || durationSeconds <= 0) return 0;
  const progress = Math.max(0, Math.min(1, (clientX - left) / width));
  return progress * durationSeconds;
}
