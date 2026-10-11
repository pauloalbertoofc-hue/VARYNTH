import type { AgentExperienceTrace } from "@/lib/athena/domain/result";
import { experienceEventRepository } from "@/lib/persistence/repositories";
import { resolveExperienceFeatureFlags, type ExperienceFeatureFlags } from "./feature-flags";
import { experienceService } from "./experience-service";

export const MAX_DECISION_TRACES_PER_OWNER = 200;

export interface ExperienceDecisionTraceInput {
  ownerId?: string;
  taskId: string;
  agentId: string;
  domain?: string;
  projectId?: string;
  sessionId?: string;
  trace: AgentExperienceTrace;
}

function boundedIds(values: string[], limit = 12): string[] {
  return [...new Set(values.filter((value) => typeof value === "string").map((value) => value.trim()).filter((value) => value.length > 0 && value.length <= 160))].slice(0, limit);
}

/** Persist an ID-only, account-owned, non-learning record of actual Experience retrieval. */
export async function recordExperienceDecisionTrace(
  input: ExperienceDecisionTraceInput,
  flags: ExperienceFeatureFlags = resolveExperienceFeatureFlags(),
): Promise<boolean> {
  if (!flags.enabled || typeof input.taskId !== "string" || !input.taskId.trim() || typeof input.agentId !== "string" || !input.agentId.trim()) return false;
  if (input.trace.agentId !== input.agentId || input.trace.instructionPrecedence !== "CURRENT_INSTRUCTION_OVERRIDES_PERSONALIZATION") return false;

  const retrievedPreferenceIds = boundedIds(input.trace.retrievedPreferenceIds);
  const retrievedExperienceIds = boundedIds(input.trace.retrievedExperienceIds);
  if (!retrievedPreferenceIds.length && !retrievedExperienceIds.length) return false;

  try {
    const saved = await experienceService.record({
      id: `experience-trace:${encodeURIComponent(input.agentId)}:${encodeURIComponent(input.taskId)}`,
      ownerId: input.ownerId,
      actor: "AGENT",
      agentId: input.agentId,
      moduleId: "athena",
      domain: input.domain,
      projectId: input.projectId,
      sessionId: input.sessionId,
      correlationId: input.taskId.slice(0, 160),
      targetType: "ATHENA_EXPERIENCE_DECISION",
      targetId: input.taskId.slice(0, 160),
      actionType: "EXPERIENCE_CONTEXT_RETRIEVED",
      source: "athena-experience-context",
      privacyScope: "AGENT_PRIVATE",
      learningEligible: false,
      metadata: {
        retrievedPreferenceIds,
        retrievedExperienceIds,
        experienceIdsReferencedInResponse: boundedIds(input.trace.experienceIdsReferencedInResponse),
        evidenceEventIdsReferencedInResponse: boundedIds(input.trace.evidenceEventIdsReferencedInResponse),
        instructionPrecedence: input.trace.instructionPrecedence,
      },
    });
    try {
      const ownerTraces = await experienceEventRepository.getAll((event) => event.ownerId === saved.ownerId && event.actionType === "EXPERIENCE_CONTEXT_RETRIEVED");
      ownerTraces.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      await Promise.all(ownerTraces.slice(MAX_DECISION_TRACES_PER_OWNER).map((event) => experienceEventRepository.delete(event.id)));
    } catch {
      // Trace retention is best-effort; it must not change the specialist response.
    }
    return true;
  } catch {
    // Inspection telemetry is optional and must never delay or block the answer.
    return false;
  }
}
