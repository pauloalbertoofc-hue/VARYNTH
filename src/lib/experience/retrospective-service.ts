import { experienceEventRepository, experienceRepository } from "@/lib/persistence/repositories";
import { ExperienceRecord, EvidenceRef } from "./contracts";
import { getExperienceOwnerId } from "./identity";

export interface ProjectRetrospective {
  projectId: string;
  initialApproach: string[];
  importantDecisions: string[];
  rejectedApproaches: string[];
  majorChanges: string[];
  successfulExperiences: ExperienceRecord[];
  evidence: EvidenceRef[];
  generatedAt: string;
}

export async function buildProjectRetrospective(projectId: string, requestedOwnerId?: string): Promise<ProjectRetrospective> {
  const normalizedProjectId = projectId.trim();
  if (!normalizedProjectId) throw new Error("[RETROSPECTIVE_INVALID] projectId obrigatório.");
  const ownerId = await getExperienceOwnerId(requestedOwnerId);
  const events = (await experienceEventRepository.getAll((event) => event.ownerId === ownerId && event.projectId === normalizedProjectId))
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const projectEventIds = new Set(events.map((event) => event.id));
  const experiences = await experienceRepository.getAll((record) =>
    record.ownerId === ownerId
    && (record.scope === "PROJECT" && record.scopeId === normalizedProjectId
      || record.evidence.some((ref) => projectEventIds.has(ref.eventId))),
  );
  const evidence = events.map((event) => ({
    eventId: event.id,
    weight: event.actor === "USER" ? "HIGH" as const : "LOW" as const,
    reason: `evento observado: ${event.actionType}`,
  }));
  return {
    projectId: normalizedProjectId,
    initialApproach: events.filter((event) => event.actionType === "PROJECT_CREATED").map((event) => String(event.metadata.approach || event.source).slice(0, 400)),
    importantDecisions: events.filter((event) => event.actionType === "PROPOSAL_ACCEPTED" || event.actionType === "PREFERENCE_CONFIRMED").map((event) => event.id),
    rejectedApproaches: events.filter((event) => event.actionType === "PROPOSAL_REJECTED" || event.actionType === "PREFERENCE_REJECTED").map((event) => event.id),
    majorChanges: events.filter((event) => event.actionType === "MANUAL_EDIT" || event.actionType === "PROPOSAL_MODIFIED").map((event) => event.id),
    successfulExperiences: experiences
      .filter((experience) => (experience.usefulness || 0) >= 0.5)
      .map((experience) => ({
        ...experience,
        evidence: experience.evidence.filter((ref) => projectEventIds.has(ref.eventId)),
      }))
      .filter((experience) => experience.evidence.length > 0),
    evidence,
    generatedAt: new Date().toISOString(),
  };
}
