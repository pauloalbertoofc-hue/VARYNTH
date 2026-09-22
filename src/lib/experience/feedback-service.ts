import { experienceService } from "./experience-service";
import { FeedbackInput, ExperienceEvent } from "./contracts";

const actionByFeedback: Record<FeedbackInput["type"], ExperienceEvent["actionType"]> = {
  LIKE: "FEEDBACK_SUBMITTED", DISLIKE: "FEEDBACK_SUBMITTED", ACCEPT: "PROPOSAL_ACCEPTED", REJECT: "PROPOSAL_REJECTED",
  RATING: "FEEDBACK_SUBMITTED", PREFER_A: "FEEDBACK_SUBMITTED", PREFER_B: "FEEDBACK_SUBMITTED", CORRECTION: "FEEDBACK_SUBMITTED",
  COMMENT: "FEEDBACK_SUBMITTED", CONFIRM_PREFERENCE: "PREFERENCE_CONFIRMED", REJECT_PREFERENCE: "PREFERENCE_REJECTED",
};

export async function submitFeedback(input: FeedbackInput): Promise<ExperienceEvent> {
  if (!input.targetType.trim() || !input.targetId.trim()) throw new Error("[FEEDBACK_INVALID] alvo obrigatório.");
  const event = await experienceService.record({
    actor: "USER", actionType: actionByFeedback[input.type], targetType: input.targetType, targetId: input.targetId,
    projectId: input.projectId, moduleId: input.moduleId, agentId: input.agentId, sessionId: input.sessionId,
    metadata: { feedbackType: input.type, context: input.context || {}, reason: input.reason?.trim().slice(0, 500), strength: input.strength || "MEDIUM" },
    source: "experience-feedback", privacyScope: input.projectId ? "PROJECT_SHARED" : "USER_SHARED", learningEligible: true,
  });
  return event;
}
