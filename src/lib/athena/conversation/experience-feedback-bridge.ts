import { submitFeedback } from "@/lib/experience/feedback-service";
import type { AthenaConversationFeedback } from "./quality-feedback";

/** Sends only explicit, minimal response-quality feedback to the account-scoped Experience Layer. */
export function recordAgentFeedbackInExperience(feedback: Pick<AthenaConversationFeedback, "messageId" | "sessionId" | "category" | "agentId" | "moduleId">) {
  const agentId = feedback.agentId || "athena";
  return submitFeedback({
    type: feedback.category === "HELPFUL" ? "LIKE" : "DISLIKE",
    targetType: `${agentId.toUpperCase().replace(/[^A-Z0-9_]/g, "_")}_RESPONSE`,
    targetId: feedback.messageId,
    moduleId: feedback.moduleId || (agentId === "athena" ? "athena" : undefined),
    agentId,
    sessionId: feedback.sessionId,
    strength: "HIGH",
    context: { qualityCategory: feedback.category },
  });
}

export function recordAthenaFeedbackInExperience(feedback: Pick<AthenaConversationFeedback, "messageId" | "sessionId" | "category">) {
  return recordAgentFeedbackInExperience({ ...feedback, agentId: "athena", moduleId: "athena" });
}
