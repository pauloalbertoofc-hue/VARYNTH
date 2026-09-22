import { experienceService } from "./experience-service";
import type { ExperienceEvent } from "./contracts";

export type AudioLearningAction = "BPM_CHANGED" | "TRACK_REMOVED" | "EFFECT_CHANGED" | "VOICE_TAKE_SELECTED" | "VOICE_TAKE_REJECTED" | "SFX_VARIATION_SELECTED" | "AGENT_MIX_MODIFIED" | "COMPOSITION_PROPOSAL_ACCEPTED" | "COMPOSITION_PROPOSAL_REJECTED";

export interface AudioLearningInput {
  action: AudioLearningAction;
  projectId?: string;
  sessionId?: string;
  artifactId?: string;
  targetId?: string;
  before?: unknown;
  after?: unknown;
  source?: string;
  correlationId?: string;
}

export class AudioLearningAdapter {
  async record(input: AudioLearningInput): Promise<ExperienceEvent> {
    return experienceService.record({
      actor: "USER", actionType: input.action === "COMPOSITION_PROPOSAL_ACCEPTED" ? "PROPOSAL_ACCEPTED" : input.action === "COMPOSITION_PROPOSAL_REJECTED" ? "PROPOSAL_REJECTED" : "MANUAL_EDIT",
      moduleId: "audio", projectId: input.projectId, sessionId: input.sessionId, artifactId: input.artifactId, targetId: input.targetId,
      before: input.before, after: input.after, correlationId: input.correlationId,
      metadata: { audioAction: input.action }, source: input.source || "audio-learning-adapter", privacyScope: input.projectId ? "PROJECT_SHARED" : "USER_SHARED", learningEligible: true,
    });
  }
}

export const audioLearningAdapter = new AudioLearningAdapter();
