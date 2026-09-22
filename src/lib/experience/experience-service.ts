import { experienceEventRepository } from "@/lib/persistence/repositories";
import { ExperienceEvent, ExperienceEventInput, validateExperienceEvent } from "./contracts";

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
    const metadata = input.metadata && typeof input.metadata === "object" ? input.metadata : {};
    if (Object.keys(metadata).length > MAX_METADATA_KEYS) throw new Error("[EXPERIENCE_EVENT_INVALID] metadata excede o limite.");
    const event = validateExperienceEvent({
      ...input,
      id: input.id || eventId(),
      timestamp: input.timestamp || new Date().toISOString(),
      schemaVersion: 1,
    });
    if (safeSize(event) > MAX_EVENT_BYTES) throw new Error("[EXPERIENCE_EVENT_INVALID] evento excede o limite de tamanho.");
    const duplicate = await experienceEventRepository.getById(event.id);
    if (duplicate) return duplicate;
    return experienceEventRepository.save(event);
  }

  async list(filter?: (event: ExperienceEvent) => boolean): Promise<ExperienceEvent[]> {
    return experienceEventRepository.getAll(filter);
  }

  async forget(eventIdToForget: string): Promise<boolean> {
    if (!eventIdToForget.trim()) return false;
    return experienceEventRepository.delete(eventIdToForget);
  }
}

export const experienceService = new ExperienceService();
