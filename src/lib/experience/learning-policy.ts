import type { ExperienceEvent, LearningExclusion } from "./contracts";
import { learningExclusionRepository } from "@/lib/persistence/repositories";

export interface LearningPolicyDecision { eligible: boolean; reason: string; }

export function evaluateLearningEligibility(event: Pick<ExperienceEvent, "actor" | "learningEligible" | "actionType" | "metadata">): LearningPolicyDecision {
  if (!event.learningEligible) return { eligible: false, reason: "evento explicitamente marcado como não-aprendível" };
  if (event.actor === "AGENT") return { eligible: false, reason: "eventos de agente não são evidência primária" };
  if (event.actor === "SYSTEM" && event.actionType !== "OUTCOME_RECORDED") return { eligible: false, reason: "evento automático do sistema não pode inflar aprendizado" };
  if (event.metadata.generatedAutomatically === true) return { eligible: false, reason: "evento automático não pode alimentar loop de aprendizado" };
  return { eligible: true, reason: "evento de usuário ou outcome autorizado" };
}

export async function findLearningExclusion(event: Pick<ExperienceEvent, "domain" | "agentId" | "moduleId" | "projectId" | "artifactId" | "sessionId">): Promise<LearningExclusion | null> {
  const exclusions = await learningExclusionRepository.getAll();
  const scopeIds: Record<LearningExclusion["scope"], string | undefined> = {
    GLOBAL: undefined, DOMAIN: event.domain, AGENT: event.agentId, MODULE: event.moduleId,
    PROJECT: event.projectId, ARTIFACT: event.artifactId, SESSION: event.sessionId,
  };
  return exclusions.find((exclusion) => exclusion.scope === "GLOBAL" || (!!scopeIds[exclusion.scope] && exclusion.scopeId === scopeIds[exclusion.scope])) || null;
}
