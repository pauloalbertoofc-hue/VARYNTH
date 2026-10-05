import type { ExperienceEvent, EvidenceRef, PreferenceCandidate } from "./contracts";
import { extractSignal } from "./signals";
import { findLearningExclusion } from "./learning-policy";
import { domainRegistry } from "@/lib/knowledge/domain-registry";

const MIN_EVIDENCE = 3;
const MIN_INDEPENDENT_ARTIFACTS = 2;

interface CandidateSignal {
  key: string;
  value: string | number | boolean;
}

function readCandidateSignal(event: ExperienceEvent): CandidateSignal | null {
  const raw = event.metadata.preferenceSignal;
  if (!raw || typeof raw !== "object") return null;
  const signal = raw as Record<string, unknown>;
  if (typeof signal.key !== "string" || !/^[a-z][a-zA-Z0-9_.-]{1,63}$/.test(signal.key)) return null;
  if (!(typeof signal.value === "string" || typeof signal.value === "number" || typeof signal.value === "boolean")) return null;
  if (typeof signal.value === "number" && !Number.isFinite(signal.value)) return null;
  if (typeof signal.value === "string" && (!signal.value.trim() || signal.value.length > 120)) return null;
  return { key: signal.key, value: signal.value };
}

function valueKey(value: CandidateSignal["value"]): string {
  return `${typeof value}:${String(value)}`;
}

function eventEvidence(event: ExperienceEvent, weight: EvidenceRef["weight"]): EvidenceRef {
  return { eventId: event.id, weight, reason: `Sinal ${String(event.metadata.audioAction || event.actionType)} registrado pelo usuário em ${event.artifactId ? "um artefato distinto" : "um contexto observado"}.` };
}

/**
 * Proposes only repeated, adapter-declared discrete choices. It never writes a
 * Preference: the caller must present the candidate to the user first.
 */
export function derivePreferenceCandidates(events: ExperienceEvent[], subject: string, domain?: string): PreferenceCandidate[] {
  if (!subject.trim()) return [];
  const groups = new Map<string, { domain: string; events: ExperienceEvent[] }>();
  for (const event of events) {
    if (event.ownerId !== subject) continue;
    if (!event.domain || (domain && !domainRegistry.isWithinDomain(domain, event.domain))) continue;
    const signal = extractSignal(event);
    if (!signal?.eligible) continue;
    const declared = readCandidateSignal(event);
    if (!declared) continue;
    const key = `${event.domain}\u0000${declared.key}`;
    const group = groups.get(key) || { domain: event.domain, events: [] };
    group.events.push(event);
    groups.set(key, group);
  }

  const candidates: PreferenceCandidate[] = [];
  for (const group of groups.values()) {
    const values = new Map<string, ExperienceEvent[]>();
    for (const event of group.events) {
      const signal = readCandidateSignal(event)!;
      const key = valueKey(signal.value);
      values.set(key, [...(values.get(key) || []), event]);
    }
    // Conflicting observed values are not averaged into a preference hypothesis.
    if (values.size !== 1) continue;
    const observations = [...values.values()][0];
    const independent = new Map<string, ExperienceEvent>();
    for (const event of observations) {
      const independenceKey = event.correlationId || event.id;
      if (!independent.has(independenceKey)) independent.set(independenceKey, event);
    }
    const evidenceEvents = [...independent.values()];
    const artifacts = new Set(evidenceEvents.map((event) => event.artifactId).filter((id): id is string => Boolean(id)));
    if (evidenceEvents.length < MIN_EVIDENCE || artifacts.size < MIN_INDEPENDENT_ARTIFACTS) continue;
    const declared = readCandidateSignal(evidenceEvents[0])!;
    candidates.push({
      subject: subject.trim(), domain: group.domain, key: declared.key, value: declared.value,
      scope: "DOMAIN", scopeId: group.domain,
      evidence: evidenceEvents.map((event) => eventEvidence(event, extractSignal(event)!.strength)),
      proposedAt: new Date().toISOString(),
    });
  }
  return candidates.sort((left, right) => left.domain.localeCompare(right.domain) || left.key.localeCompare(right.key));
}

/** Applies current account exclusions to historical events before proposing candidates.
 * Excluded observations remain in the audit log but cannot create new hypotheses. */
export async function derivePreferenceCandidatesWithPolicy(events: ExperienceEvent[], subject: string, domain?: string): Promise<PreferenceCandidate[]> {
  const ownerId = subject.trim();
  if (!ownerId) return [];
  const eligibleEvents: ExperienceEvent[] = [];
  for (const event of events) {
    if (event.ownerId !== ownerId || !extractSignal(event)?.eligible) continue;
    if (await findLearningExclusion(event)) continue;
    eligibleEvents.push(event);
  }
  return derivePreferenceCandidates(eligibleEvents, ownerId, domain);
}
