import { experienceEventRepository, experienceRepository } from "@/lib/persistence/repositories";
import { ExperienceRecord, EvidenceRef } from "./contracts";

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

export async function buildProjectRetrospective(projectId: string): Promise<ProjectRetrospective> {
  if (!projectId.trim()) throw new Error("[RETROSPECTIVE_INVALID] projectId obrigatório.");
  const events = await experienceEventRepository.getAll((event) => event.projectId === projectId);
  const experiences = await experienceRepository.getAll((record) => record.scopeId === projectId || record.scope !== "PROJECT");
  const evidence = events.map((event) => ({ eventId: event.id, weight: event.actor === "USER" ? "HIGH" as const : "LOW" as const, reason: `evento ${event.actionType}` }));
  return {
    projectId,
    initialApproach: events.filter((event) => event.actionType === "PROJECT_CREATED").map((event) => String(event.metadata.approach || event.source)),
    importantDecisions: events.filter((event) => event.actionType === "PROPOSAL_ACCEPTED" || event.actionType === "PREFERENCE_CONFIRMED").map((event) => event.id),
    rejectedApproaches: events.filter((event) => event.actionType === "PROPOSAL_REJECTED" || event.actionType === "PREFERENCE_REJECTED").map((event) => event.id),
    majorChanges: events.filter((event) => event.actionType === "MANUAL_EDIT" || event.actionType === "PROPOSAL_MODIFIED").map((event) => event.id),
    successfulExperiences: experiences.filter((experience) => (experience.usefulness || 0) >= 0.5), evidence,
    generatedAt: new Date().toISOString(),
  };
}
