export type VisualAssetScope = "TRACK" | "SELECTED" | "LIBRARY";

/**
 * Resolves the tracks that receive a visual asset. The active track is always
 * retained for an explicit multi-track selection, and stale IDs never leak
 * into persistence calls after the library changes.
 */
export function resolveVisualAssetTargetIds(
  scope: VisualAssetScope,
  selectedTrackId: string,
  requestedTrackIds: readonly string[],
  libraryTrackIds: readonly string[],
): string[] {
  const available = new Set(libraryTrackIds);

  if (scope === "LIBRARY") return Array.from(new Set(libraryTrackIds));
  if (scope === "TRACK") return available.has(selectedTrackId) ? [selectedTrackId] : [];

  return Array.from(new Set([selectedTrackId, ...requestedTrackIds]))
    .filter((trackId) => available.has(trackId));
}
