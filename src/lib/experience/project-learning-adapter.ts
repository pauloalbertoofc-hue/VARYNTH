import type { ExperienceEvent } from "./contracts";
import { experienceService } from "./experience-service";

/** Records only the fact and coarse category of an explicit project creation. */
export function recordProjectCreated(input: {
  projectId: string;
  category: string;
  actor?: "USER" | "AGENT";
  projectSessionId?: string;
  correlationId?: string;
}): Promise<ExperienceEvent> {
  const userInitiated = input.actor !== "AGENT";
  const category = input.category.trim().slice(0, 60);
  return experienceService.record({
    actor: userInitiated ? "USER" : "AGENT",
    actionType: "PROJECT_CREATED",
    domain: "project-management",
    moduleId: "projects",
    projectId: input.projectId,
    sessionId: input.projectSessionId,
    correlationId: input.correlationId,
    targetType: "PROJECT",
    targetId: input.projectId,
    metadata: { ...(category ? { category } : {}), generatedAutomatically: !userInitiated },
    source: "project-learning-adapter",
    privacyScope: "PROJECT_SHARED",
    learningEligible: userInitiated,
  });
}
