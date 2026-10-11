import type { ExperienceEvent } from "./contracts";
import { experienceService } from "./experience-service";

export type KnowledgeGovernanceAction = "CLASSIFY" | "PUBLISH" | "REVOKE" | "LIFECYCLE" | "VAULT_READING_STATUS" | "VAULT_DELETE";

/** Records a deliberate governance decision without copying knowledge contents or labels. */
export function recordKnowledgeGovernanceDecision(input: {
  action: KnowledgeGovernanceAction;
  itemId: string;
  domain?: string;
  lifecycleState?: string;
}): Promise<ExperienceEvent> {
  const actionType: ExperienceEvent["actionType"] = input.action === "PUBLISH" ? "PROPOSAL_ACCEPTED"
    : input.action === "REVOKE" || input.action === "VAULT_DELETE" ? "PROPOSAL_REJECTED" : "USER_ACTION";
  return experienceService.record({
    actor: "USER", actionType, targetType: input.action.startsWith("VAULT_") ? "VAULT_ITEM" : "KNOWLEDGE_ITEM", targetId: input.itemId,
    ...(input.domain ? { domain: input.domain } : {}),
    metadata: { governanceAction: input.action, ...(input.lifecycleState ? { lifecycleState: input.lifecycleState } : {}) },
    source: "knowledge-governance", moduleId: "knowledge", privacyScope: "USER_SHARED",
    learningEligible: false,
  });
}
