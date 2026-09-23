import { experienceService } from "./experience-service";
import type { ExperienceEvent } from "./contracts";

export type MusicLearningAction = "VISUAL_MOTION_CHANGED" | "VISUAL_EFFECT_CHANGED" | "VISUAL_DIRECTIVE_APPLIED" | "TRACK_RATED" | "PLAYLIST_CREATED";

export interface MusicLearningInput {
  action: MusicLearningAction;
  trackId?: string;
  projectId?: string;
  sessionId?: string;
  before?: unknown;
  after?: unknown;
  note?: string;
  correlationId?: string;
}

/** Records explicit Music choices as account-owned, scoped evidence; never stores media bytes. */
export class MusicLearningAdapter {
  async record(input: MusicLearningInput): Promise<ExperienceEvent> {
    const outcome = input.action === "TRACK_RATED";
    return experienceService.record({
      actor: "USER",
      actionType: outcome ? "FEEDBACK_SUBMITTED" : input.action === "PLAYLIST_CREATED" ? "PROJECT_CREATED" : "MANUAL_EDIT",
      moduleId: "music",
      domain: "music",
      projectId: input.projectId,
      sessionId: input.sessionId,
      artifactId: input.trackId,
      targetId: input.trackId,
      before: input.before,
      after: input.after,
      correlationId: input.correlationId,
      metadata: {
        musicAction: input.action,
        ...(input.note ? { note: input.note.slice(0, 500) } : {}),
        ...(outcome && typeof input.after === "number" ? { explicitRating: Math.max(1, Math.min(5, input.after)) } : {}),
      },
      source: "music-learning-adapter",
      privacyScope: input.projectId ? "PROJECT_SHARED" : "USER_SHARED",
      learningEligible: true,
    });
  }
}

export const musicLearningAdapter = new MusicLearningAdapter();
