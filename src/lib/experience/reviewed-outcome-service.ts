import { experienceEventRepository } from "@/lib/persistence/repositories";
import type { ExperienceEvent } from "./contracts";
import { experienceService } from "./experience-service";
import { findLearningExclusion } from "./learning-policy";
import { getExperienceOwnerId } from "./identity";
import { retainExperience } from "./outcome-service";

export interface ReviewedProjectOutcomeInput {
  projectId: string;
  situation: string;
  action: string;
  outcome: string;
  evidenceEventIds: string[];
  confirmsUseful: boolean;
  ownerId?: string;
}

function requiredText(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`[REVIEWED_OUTCOME_REQUIRED] ${field} é obrigatório.`);
  if (normalized.length > 500) throw new Error(`[REVIEWED_OUTCOME_TOO_LONG] ${field} deve ter no máximo 500 caracteres.`);
  return normalized;
}

/** Persist only a user-reviewed, useful outcome with exact owner/project evidence. */
export async function recordReviewedProjectOutcome(input: ReviewedProjectOutcomeInput) {
  const projectId = input.projectId.trim();
  if (!projectId) throw new Error("[REVIEWED_OUTCOME_PROJECT_REQUIRED] Selecione um projeto.");
  if (!input.confirmsUseful) throw new Error("[REVIEWED_OUTCOME_CONFIRMATION_REQUIRED] Confirme que o resultado foi útil antes de registrar.");

  const situation = requiredText(input.situation, "A situação");
  const action = requiredText(input.action, "A ação");
  const outcome = requiredText(input.outcome, "O resultado");
  const ownerId = await getExperienceOwnerId(input.ownerId);
  const evidenceEventIds = [...new Set(input.evidenceEventIds.map((id) => id.trim()).filter(Boolean))].slice(0, 12);
  if (!evidenceEventIds.length) throw new Error("[REVIEWED_OUTCOME_EVIDENCE_REQUIRED] Selecione ao menos um evento desta retrospectiva.");

  const selectedIds = new Set(evidenceEventIds);
  const selectedEvents = await experienceEventRepository.getAll((event) => selectedIds.has(event.id));
  if (selectedEvents.length !== selectedIds.size
    || selectedEvents.some((event) => event.ownerId !== ownerId || event.projectId !== projectId)) {
    throw new Error("[REVIEWED_OUTCOME_EVIDENCE_SCOPE] Cada evidência precisa pertencer à sua conta e ao projeto selecionado.");
  }

  const domains = [...new Set(selectedEvents.map((event) => event.domain?.trim()).filter((domain): domain is string => Boolean(domain)))];
  const domain = domains.length === 1 ? domains[0] : "project";
  const exclusionCandidates: Array<Pick<ExperienceEvent, "ownerId" | "domain" | "agentId" | "moduleId" | "projectId" | "artifactId" | "sessionId">> = [
    { ownerId, domain, projectId },
    ...selectedEvents,
  ];
  for (const candidate of exclusionCandidates) {
    if (await findLearningExclusion(candidate)) {
      throw new Error("[REVIEWED_OUTCOME_LEARNING_DISABLED] O aprendizado está desativado para este projeto ou para uma evidência selecionada.");
    }
  }

  const event = await experienceService.record({
    ownerId,
    actor: "USER",
    actionType: "OUTCOME_RECORDED",
    domain,
    projectId,
    targetType: "PROJECT_RETROSPECTIVE",
    targetId: projectId,
    metadata: { reviewedByUser: true, reviewedEvidenceEventIds: evidenceEventIds },
    source: "experience-center.project-retrospective",
    privacyScope: "PROJECT_SHARED",
    learningEligible: true,
  });
  if (!event.learningEligible) {
    throw new Error("[REVIEWED_OUTCOME_LEARNING_DISABLED] A política de aprendizado bloqueou este registro.");
  }

  return retainExperience({
    ownerId,
    domain,
    context: { projectId, reviewedEvidenceEventIds: evidenceEventIds },
    situation,
    action,
    outcome,
    usefulness: 1,
    evidence: [{ eventId: event.id, weight: "VERY_HIGH", reason: "resultado explicitamente revisado e marcado como útil pelo usuário" }],
    scope: "PROJECT",
    scopeId: projectId,
  });
}
