import { submitFeedback } from "@/lib/experience/feedback-service";
import type { AthenaConversationFeedback } from "./quality-feedback";

/** Sends only explicit, minimal response-quality feedback to the account-scoped Experience Layer. */
export function recordAthenaFeedbackInExperience(feedback: Pick<AthenaConversationFeedback, "messageId" | "sessionId" | "category">) {
  return submitFeedback({
    type: feedback.category === "HELPFUL" ? "LIKE" : "DISLIKE",
    targetType: "ATHENA_RESPONSE",
    targetId: feedback.messageId,
    moduleId: "athena",
    agentId: "athena",
    sessionId: feedback.sessionId,
    strength: "HIGH",
    context: { qualityCategory: feedback.category },
  });
}
