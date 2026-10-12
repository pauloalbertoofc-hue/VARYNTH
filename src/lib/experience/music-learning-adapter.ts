import { experienceService } from "./experience-service";
import type { ExperienceEvent } from "./contracts";

export type MusicLearningAction = "VISUAL_MOTION_CHANGED" | "VISUAL_EFFECT_CHANGED" | "VISUAL_DIRECTIVE_APPLIED" | "TRACK_RATED" | "PLAYLIST_CREATED" | "PREFERENCE_CONFIRMED";

export interface MusicLearningInput {
  action: MusicLearningAction;
  trackId?: string;
  targetId?: string;
  projectId?: string;
  sessionId?: string;
  before?: unknown;
  after?: unknown;
  note?: string;
  correlationId?: string;
  userInitiated?: boolean;
}

/** Records explicit Music choices as account-owned, scoped evidence; never stores media bytes. */
export class MusicLearningAdapter {
  async record(input: MusicLearningInput): Promise<ExperienceEvent> {
    const outcome = input.action === "TRACK_RATED";
    const proposalAccepted = input.action === "VISUAL_DIRECTIVE_APPLIED" || input.action === "PLAYLIST_CREATED";
    return experienceService.record({
      actor: input.userInitiated === true ? "USER" : "SYSTEM",
      actionType: outcome ? "FEEDBACK_SUBMITTED" : input.action === "PREFERENCE_CONFIRMED" ? "PREFERENCE_CONFIRMED" : proposalAccepted ? "PROPOSAL_ACCEPTED" : "MANUAL_EDIT",
      moduleId: "music",
      domain: "music",
      projectId: input.projectId,
      sessionId: input.sessionId,
      artifactId: input.trackId,
      targetId: input.targetId ?? input.trackId,
      before: input.action === "TRACK_RATED" ? undefined : safeChoice(input.before),
      after: input.action === "TRACK_RATED" ? undefined : safeChoice(input.after),
      correlationId: input.correlationId,
      metadata: {
        musicAction: input.action,
        ...(outcome && typeof input.after === "number" ? { explicitRating: Math.max(1, Math.min(5, Math.round(input.after))) } : {}),
        ...(input.action === "PREFERENCE_CONFIRMED" ? { preferenceCategory: "music-style" } : {}),
        generatedAutomatically: input.userInitiated !== true,
      },
      source: "music-learning-adapter",
      privacyScope: input.projectId ? "PROJECT_SHARED" : "USER_SHARED",
      learningEligible: input.userInitiated === true,
    });
  }
}

function safeChoice(value: unknown): unknown {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "boolean") return value;
  if (typeof value === "string" && value.length <= 80 && /^[\p{L}\p{N}_ -]+$/u.test(value)) return value;
  return undefined;
}

export const musicLearningAdapter = new MusicLearningAdapter();
