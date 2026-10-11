export interface ConversationFeedbackTarget {
  agentId?: string;
  agentName?: string;
}

/** Attribute visible-response feedback to the agent that actually produced it. */
export function feedbackTargetFromMetadata(metadata: unknown): ConversationFeedbackTarget {
  if (!metadata || typeof metadata !== "object") return {};
  const agentExecution = (metadata as Record<string, unknown>).agentExecution;
  if (!agentExecution || typeof agentExecution !== "object") return {};
  const { agentId, agentName } = agentExecution as Record<string, unknown>;
  return {
    ...(typeof agentId === "string" && agentId.trim() ? { agentId } : {}),
    ...(typeof agentName === "string" && agentName.trim() ? { agentName } : {}),
  };
}
