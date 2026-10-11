import type { ExperienceEvent, ExperienceRecord, Preference, PreferenceCandidate } from "./contracts";
import { extractSignal, type ExperienceSignal } from "./signals";

export interface ExperienceEventLineage {
  event: ExperienceEvent;
  signal: ExperienceSignal | null;
  candidates: PreferenceCandidate[];
  preferences: Preference[];
  experiences: ExperienceRecord[];
  decisionTraces: ExperienceEvent[];
}

function ids(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.length > 0 && item.length <= 160);
}

/** Joins only explicit evidence and ID references; it never infers causal links. */
export function buildExperienceEventLineage(
  sourceEventId: string,
  events: ExperienceEvent[],
  candidates: PreferenceCandidate[],
  preferences: Preference[],
  experiences: ExperienceRecord[],
): ExperienceEventLineage | undefined {
  const event = events.find((item) => item.id === sourceEventId);
  if (!event) return undefined;
  const sameOwner = <T extends { ownerId?: string }>(item: T) => item.ownerId === event.ownerId;
  const linkedCandidates = candidates.filter((item) => item.evidence.some((evidence) => evidence.eventId === event.id));
  const linkedPreferences = preferences.filter((item) => sameOwner(item) && item.evidence.some((evidence) => evidence.eventId === event.id));
  const linkedExperiences = experiences.filter((item) => sameOwner(item) && item.evidence.some((evidence) => evidence.eventId === event.id));
  const preferenceIds = new Set(linkedPreferences.map((item) => item.id));
  const experienceIds = new Set(linkedExperiences.map((item) => item.id));
  const decisionTraces = events.filter((candidate) => {
    if (candidate.actionType !== "EXPERIENCE_CONTEXT_RETRIEVED" || !sameOwner(candidate)) return false;
    const retrievedPreferences = ids(candidate.metadata.retrievedPreferenceIds);
    const retrievedExperiences = ids(candidate.metadata.retrievedExperienceIds);
    const citedEvidence = ids(candidate.metadata.evidenceEventIdsReferencedInResponse);
    return retrievedPreferences.some((id) => preferenceIds.has(id))
      || retrievedExperiences.some((id) => experienceIds.has(id))
      || citedEvidence.includes(event.id);
  });
  return { event, signal: extractSignal(event), candidates: linkedCandidates, preferences: linkedPreferences, experiences: linkedExperiences, decisionTraces };
}
