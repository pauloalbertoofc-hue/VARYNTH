import { experienceEventRepository, experiencePreferenceRepository, experienceRepository } from "@/lib/persistence/repositories";
import { ExperienceEvent, ExperienceEventInput, validateExperienceEvent } from "./contracts";
import { evaluateLearningEligibility, findLearningExclusion } from "./learning-policy";
import { confidenceFromEvidence } from "./signals";
import { getExperienceOwnerId } from "./identity";

const MAX_METADATA_KEYS = 40;
const MAX_EVENT_BYTES = 80_000;

function eventId(): string {
  return `experience-event-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function safeSize(value: unknown): number {
  try { return JSON.stringify(value).length; } catch { return Number.POSITIVE_INFINITY; }
}

export class ExperienceService {
  async record(input: ExperienceEventInput): Promise<ExperienceEvent> {
    const ownerId = await getExperienceOwnerId(input.ownerId);
    const metadata = input.metadata && typeof input.metadata === "object" ? input.metadata : {};
    if (Object.keys(metadata).length > MAX_METADATA_KEYS) throw new Error("[EXPERIENCE_EVENT_INVALID] metadata excede o limite.");
    let event = validateExperienceEvent({
      ...input,
      ownerId,
      id: input.id || eventId(),
      timestamp: input.timestamp || new Date().toISOString(),
      schemaVersion: 1,
    });
    if (event.learningEligible) {
      const decision = evaluateLearningEligibility(event);
      if (!decision.eligible) event = { ...event, learningEligible: false, metadata: { ...event.metadata, learningExclusionReason: decision.reason } };
      const exclusion = await findLearningExclusion(event);
      if (exclusion) event = { ...event, learningEligible: false, metadata: { ...event.metadata, learningExclusionReason: `aprendizado desativado para o escopo ${exclusion.scope}` } };
    }
    if (safeSize(event) > MAX_EVENT_BYTES) throw new Error("[EXPERIENCE_EVENT_INVALID] evento excede o limite de tamanho.");
    const duplicate = await experienceEventRepository.getById(event.id);
    if (duplicate) {
      if (duplicate.ownerId !== ownerId) throw new Error("[EXPERIENCE_EVENT_ID_COLLISION] O identificador já pertence a outra conta.");
      return duplicate;
    }
    return experienceEventRepository.save(event);
  }

  async list(filter?: (event: ExperienceEvent) => boolean, requestedOwnerId?: string): Promise<ExperienceEvent[]> {
    const ownerId = await getExperienceOwnerId(requestedOwnerId);
    return experienceEventRepository.getAll((event) => event.ownerId === ownerId && (!filter || filter(event)));
  }

  async forget(eventIdToForget: string, requestedOwnerId?: string): Promise<boolean> {
    if (!eventIdToForget.trim()) return false;
    const ownerId = await getExperienceOwnerId(requestedOwnerId);
    const event = await experienceEventRepository.getById(eventIdToForget);
    if (!event || event.ownerId !== ownerId) return false;
    const [preferences, experiences] = await Promise.all([
      experiencePreferenceRepository.getAll((item) => item.ownerId === ownerId && item.evidence.some((evidence) => evidence.eventId === eventIdToForget)),
      experienceRepository.getAll((item) => item.ownerId === ownerId && item.evidence.some((evidence) => evidence.eventId === eventIdToForget)),
    ]);
    for (const preference of preferences) {
      const evidence = preference.evidence.filter((item) => item.eventId !== eventIdToForget);
      if (evidence.length) await experiencePreferenceRepository.save({ ...preference, evidence, confidence: confidenceFromEvidence(evidence), updatedAt: new Date().toISOString() });
      else if (preference.source === "INFERRED") await experiencePreferenceRepository.delete(preference.id);
      else await experiencePreferenceRepository.save({ ...preference, evidence: [], confidence: 0, status: "DEPRECATED", updatedAt: new Date().toISOString() });
    }
    for (const experience of experiences) {
      const evidence = experience.evidence.filter((item) => item.eventId !== eventIdToForget);
      if (evidence.length) await experienceRepository.save({ ...experience, evidence, confidence: confidenceFromEvidence(evidence) });
      else await experienceRepository.delete(experience.id);
    }
    return experienceEventRepository.delete(eventIdToForget);
  }
}

export const experienceService = new ExperienceService();
