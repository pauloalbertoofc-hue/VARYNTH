import type { FeedbackType, ExperienceEvent } from "./contracts";
import { submitFeedback } from "./feedback-service";

export interface StudioResultFeedbackInput {
  artifactId: string;
  moduleId: "document" | "web" | "image" | "audio" | "video" | "game";
  projectId?: string;
  createdByAthena?: boolean;
  helpful: boolean;
  correction?: string;
}

/** Record deliberate feedback on a saved Studio artifact without copying its contents. */
export function recordStudioResultFeedback(input: StudioResultFeedbackInput): Promise<ExperienceEvent> {
  const correction = input.correction?.trim().slice(0, 500);
  const type: FeedbackType = correction ? "CORRECTION" : input.helpful ? "LIKE" : "DISLIKE";
  return submitFeedback({
    type,
    targetType: "STUDIO_ARTIFACT",
    targetId: input.artifactId,
    moduleId: input.moduleId,
    projectId: input.projectId,
    ...(input.createdByAthena ? { agentId: "athena" } : {}),
    strength: correction ? "HIGH" : "MEDIUM",
    ...(correction ? { reason: correction } : {}),
    context: { feedbackSurface: "studio-saved-result" },
  });
}
