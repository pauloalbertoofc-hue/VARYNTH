import type { ExperienceEvent } from "./contracts";
import type { CapabilityPlanStatus } from "@/lib/athena/domain/capability-plan";
import { submitFeedback } from "./feedback-service";

export interface CapabilityPlanFeedbackInput {
  planId: string;
  projectId?: string;
  sessionId?: string;
  revision: number;
  status: CapabilityPlanStatus;
  helpful: boolean;
  correction?: string;
}

/** Records deliberate feedback on a governed plan without copying its objective, steps, or results. */
export function recordCapabilityPlanFeedback(input: CapabilityPlanFeedbackInput): Promise<ExperienceEvent> {
  if (!input.planId.trim() || !Number.isInteger(input.revision) || input.revision < 1) {
    throw new Error("[CAPABILITY_PLAN_FEEDBACK_INVALID] Plano e revisão válida são obrigatórios.");
  }
  const correction = input.correction?.trim().slice(0, 500);
  return submitFeedback({
    type: correction ? "CORRECTION" : input.helpful ? "LIKE" : "DISLIKE",
    targetType: "ATHENA_CAPABILITY_PLAN",
    targetId: input.planId,
    moduleId: "athena",
    projectId: input.projectId,
    sessionId: input.sessionId,
    strength: correction ? "HIGH" : "MEDIUM",
    ...(correction ? { reason: correction } : {}),
    context: { feedbackSurface: "capability-plan", planRevision: input.revision, planStatus: input.status },
  });
}
