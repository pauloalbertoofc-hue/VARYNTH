import { experienceService } from "./experience-service";
import type { ExperienceEvent } from "./contracts";
import type { AudioDocumentState } from "@/lib/studio/audio/types";

export type AudioLearningAction = "BPM_CHANGED" | "TRACK_REMOVED" | "EFFECT_CHANGED" | "MIX_CHANGED" | "VOICE_TAKE_SELECTED" | "VOICE_TAKE_REJECTED" | "SFX_VARIATION_SELECTED" | "AGENT_MIX_MODIFIED" | "COMPOSITION_PROPOSAL_ACCEPTED" | "COMPOSITION_PROPOSAL_REJECTED";

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

export interface AudioLearningObservation {
  action: Extract<AudioLearningAction, "BPM_CHANGED" | "TRACK_REMOVED" | "EFFECT_CHANGED" | "MIX_CHANGED">;
  before: unknown;
  after: unknown;
  targetId?: string;
}

export function collectAudioLearningObservations(previous: AudioDocumentState, next: AudioDocumentState): AudioLearningObservation[] {
  const observations: AudioLearningObservation[] = [];
  const previousBpm = previous.music?.tempoMap?.[0]?.bpm ?? previous.settings?.bpm;
  const nextBpm = next.music?.tempoMap?.[0]?.bpm ?? next.settings?.bpm;
  if (previousBpm !== undefined && nextBpm !== undefined && previousBpm !== nextBpm) observations.push({ action: "BPM_CHANGED", before: previousBpm, after: nextBpm });
  for (const track of previous.tracks) {
    if (!next.tracks.some((item) => item.id === track.id)) {
      observations.push({ action: "TRACK_REMOVED", before: { id: track.id, type: track.type, name: track.name }, after: null, targetId: track.id });
      continue;
    }
    const updated = next.tracks.find((item) => item.id === track.id)!;
    if (JSON.stringify(track.effects || []) !== JSON.stringify(updated.effects || [])) observations.push({ action: "EFFECT_CHANGED", before: track.effects || [], after: updated.effects || [], targetId: track.id });
    const beforeMix = { volume: track.volume, pan: track.pan, muted: track.muted, solo: track.solo };
    const afterMix = { volume: updated.volume, pan: updated.pan, muted: updated.muted, solo: updated.solo };
    if (JSON.stringify(beforeMix) !== JSON.stringify(afterMix)) observations.push({ action: "MIX_CHANGED", before: beforeMix, after: afterMix, targetId: track.id });
  }
  return observations;
}

export class AudioLearningAdapter {
  async record(input: AudioLearningInput): Promise<ExperienceEvent> {
    return experienceService.record({
      actor: "USER", actionType: input.action === "COMPOSITION_PROPOSAL_ACCEPTED" ? "PROPOSAL_ACCEPTED" : input.action === "COMPOSITION_PROPOSAL_REJECTED" ? "PROPOSAL_REJECTED" : "USER_ACTION",
      moduleId: "audio", domain: "audio", projectId: input.projectId, sessionId: input.sessionId, artifactId: input.artifactId, targetId: input.targetId,
      before: input.before, after: input.after, correlationId: input.correlationId,
      metadata: { audioAction: input.action }, source: input.source || "audio-learning-adapter", privacyScope: input.projectId ? "PROJECT_SHARED" : "USER_SHARED", learningEligible: true,
    });
  }
}

export const audioLearningAdapter = new AudioLearningAdapter();
