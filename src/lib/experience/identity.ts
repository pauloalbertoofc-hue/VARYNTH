/** Stable local account boundary for Experience records. Legacy records without
 * an owner remain unassigned and are deliberately excluded from account views. */
export async function getExperienceOwnerId(explicitOwnerId?: string): Promise<string> {
  const explicit = explicitOwnerId?.trim();
  if (typeof window === "undefined") return explicit || "local-owner";
  const { getSession } = await import("next-auth/react");
  const session = await getSession();
  const user = session?.user as { id?: string } | undefined;
  const ownerId = user?.id?.trim();
  if (!ownerId) throw new Error("[EXPERIENCE_OWNER_REQUIRED] Entre na sua conta para acessar a Experience Layer.");
  if (explicit && explicit !== ownerId) throw new Error("[EXPERIENCE_OWNER_MISMATCH] A conta autenticada não corresponde ao dono solicitado.");
  return ownerId;
}

export interface LegacyExperienceInventory {
  events: number;
  preferences: number;
  experiences: number;
  learningExclusions: number;
}

export interface LegacyExperienceSelection {
  events?: boolean;
  preferences?: boolean;
  experiences?: boolean;
}

/**
 * Account-confirmed recovery for ownerless local records. The preview is
 * read-only. Migration validates every selected evidence link before writing, and never
 * transfers unowned learning exclusions because their scope is ambiguous.
 */
export class LegacyExperienceMigrationService {
  constructor(private readonly stores: {
    events: { getAll: (filter?: (item: any) => boolean) => Promise<any[]>; saveBatch: (items: any[]) => Promise<void> };
    preferences: { getAll: (filter?: (item: any) => boolean) => Promise<any[]>; saveBatch: (items: any[]) => Promise<void> };
    experiences: { getAll: (filter?: (item: any) => boolean) => Promise<any[]>; saveBatch: (items: any[]) => Promise<void> };
    exclusions: { getAll: (filter?: (item: any) => boolean) => Promise<any[]> };
  }) {}

  async preview(): Promise<LegacyExperienceInventory> {
    const [events, preferences, experiences, learningExclusions] = await Promise.all([
      this.stores.events.getAll((item) => !item.ownerId),
      this.stores.preferences.getAll((item) => !item.ownerId),
      this.stores.experiences.getAll((item) => !item.ownerId),
      this.stores.exclusions.getAll((item) => !item.ownerId),
    ]);
    return { events: events.length, preferences: preferences.length, experiences: experiences.length, learningExclusions: learningExclusions.length };
  }

  async migrate(selection: LegacyExperienceSelection, confirmed: boolean, requestedOwnerId?: string): Promise<LegacyExperienceInventory> {
    if (!confirmed) throw new Error("[EXPERIENCE_MIGRATION_CONFIRMATION_REQUIRED] Confirme a recuperação para esta conta.");
    const ownerId = await getExperienceOwnerId(requestedOwnerId);
    const [events, preferences, experiences] = await Promise.all([
      this.stores.events.getAll((item) => !item.ownerId),
      this.stores.preferences.getAll((item) => !item.ownerId),
      this.stores.experiences.getAll((item) => !item.ownerId),
    ]);
    const selectedEvents = selection.events ? events : [];
    const selectedPreferences = selection.preferences ? preferences : [];
    const selectedExperiences = selection.experiences ? experiences : [];
    const selectedEventIds = new Set(selectedEvents.map((item) => item.id));
    const allEvents = await this.stores.events.getAll();
    const acceptableEvidence = (eventId: string) => {
      const source = allEvents.find((item) => item.id === eventId);
      return !!source && (source.ownerId === ownerId || (!source.ownerId && selectedEventIds.has(eventId)));
    };
    for (const preference of selectedPreferences) {
      if (!Array.isArray(preference.evidence) || preference.evidence.length === 0 || preference.evidence.some((evidence: any) => !evidence.eventId)) {
        throw new Error("[EXPERIENCE_MIGRATION_INVALID_EVIDENCE] Preferência legada possui referências inválidas.");
      }
      if (preference.evidence.some((evidence: any) => !acceptableEvidence(evidence.eventId))) {
        throw new Error("[EXPERIENCE_MIGRATION_EVIDENCE_SCOPE] Preferência depende de evidência que não será recuperada para esta conta.");
      }
    }
    for (const experience of selectedExperiences) {
      if (!Array.isArray(experience.evidence) || experience.evidence.some((evidence: any) => !evidence.eventId)) {
        throw new Error("[EXPERIENCE_MIGRATION_INVALID_EVIDENCE] Experiência legada possui referências inválidas.");
      }
      if (experience.evidence.length === 0 || experience.evidence.some((evidence: any) => !acceptableEvidence(evidence.eventId))) {
        throw new Error("[EXPERIENCE_MIGRATION_EVIDENCE_SCOPE] Experiência depende de evidência que não será recuperada para esta conta.");
      }
    }

    const ownerize = (items: any[]) => items.map((item) => ({ ...item, ownerId }));
    try {
      await this.stores.events.saveBatch(ownerize(selectedEvents));
      await this.stores.preferences.saveBatch(ownerize(selectedPreferences));
      await this.stores.experiences.saveBatch(ownerize(selectedExperiences));
    } catch (error) {
      try {
        await Promise.all([
          this.stores.events.saveBatch(selectedEvents),
          this.stores.preferences.saveBatch(selectedPreferences),
          this.stores.experiences.saveBatch(selectedExperiences),
        ]);
      } catch {
        throw new Error("[EXPERIENCE_MIGRATION_ROLLBACK_FAILED] A gravação falhou e a restauração automática não pôde ser confirmada; revise o armazenamento local antes de tentar novamente.");
      }
      throw error;
    }
    return { events: selectedEvents.length, preferences: selectedPreferences.length, experiences: selectedExperiences.length, learningExclusions: 0 };
  }
}
