import type { ExperienceEvent, LearningExclusion } from "./contracts";
import { learningExclusionRepository } from "@/lib/persistence/repositories";

export interface LearningPolicyDecision { eligible: boolean; reason: string; }

export function evaluateLearningEligibility(event: Pick<ExperienceEvent, "ownerId" | "actor" | "learningEligible" | "actionType" | "metadata">): LearningPolicyDecision {
  if (!event.ownerId?.trim()) return { eligible: false, reason: "evento sem conta proprietária não pode alimentar aprendizado" };
  if (!event.learningEligible) return { eligible: false, reason: "evento explicitamente marcado como não-aprendível" };
  if (event.actor === "AGENT") return { eligible: false, reason: "eventos de agente não são evidência primária" };
  if (event.actor === "SYSTEM" && event.actionType !== "OUTCOME_RECORDED") return { eligible: false, reason: "evento automático do sistema não pode inflar aprendizado" };
  if (event.metadata.generatedAutomatically === true) return { eligible: false, reason: "evento automático não pode alimentar loop de aprendizado" };
  return { eligible: true, reason: "evento de usuário ou outcome autorizado" };
}

export async function findLearningExclusion(event: Pick<ExperienceEvent, "ownerId" | "domain" | "agentId" | "moduleId" | "projectId" | "artifactId" | "sessionId">): Promise<LearningExclusion | null> {
  // Unassigned legacy exclusions fail closed until a user-reviewed migration
  // assigns or retires them; they must never silently reactivate learning.
  const exclusions = await learningExclusionRepository.getAll((item) => item.ownerId === event.ownerId || !item.ownerId);
  const scopeIds: Record<LearningExclusion["scope"], string | undefined> = {
    GLOBAL: undefined, DOMAIN: event.domain, AGENT: event.agentId, MODULE: event.moduleId,
    PROJECT: event.projectId, ARTIFACT: event.artifactId, SESSION: event.sessionId,
  };
  return exclusions.find((exclusion) => exclusion.scope === "GLOBAL" || (!!scopeIds[exclusion.scope] && exclusion.scopeId === scopeIds[exclusion.scope])) || null;
}
