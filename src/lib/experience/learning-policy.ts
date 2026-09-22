import type { ExperienceEvent } from "./contracts";

export interface LearningPolicyDecision { eligible: boolean; reason: string; }

export function evaluateLearningEligibility(event: Pick<ExperienceEvent, "actor" | "learningEligible" | "actionType" | "metadata">): LearningPolicyDecision {
  if (!event.learningEligible) return { eligible: false, reason: "evento explicitamente marcado como não-aprendível" };
  if (event.actor === "AGENT") return { eligible: false, reason: "eventos de agente não são evidência primária" };
  if (event.actor === "SYSTEM" && event.actionType !== "OUTCOME_RECORDED") return { eligible: false, reason: "evento automático do sistema não pode inflar aprendizado" };
  if (event.metadata.generatedAutomatically === true) return { eligible: false, reason: "evento automático não pode alimentar loop de aprendizado" };
  return { eligible: true, reason: "evento de usuário ou outcome autorizado" };
}
