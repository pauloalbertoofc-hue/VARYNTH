import { ExperienceEvent, EvidenceRef } from "./contracts";
import { evaluateLearningEligibility } from "./learning-policy";

export interface ExperienceSignal {
  kind: "EXPLICIT_FEEDBACK" | "DIRECT_EDIT" | "IMMEDIATE_UNDO" | "DELAYED_UNDO" | "REDO" | "PROPOSAL_ACCEPTED" | "PROPOSAL_REJECTED" | "PREFERENCE_CONFIRMED" | "PREFERENCE_REJECTED" | "PREFERENCE_CORRECTED" | "PROPOSAL_MODIFIED" | "PROJECT_CREATED" | "VERSION_CREATED" | "EXPORT_CREATED" | "OUTCOME";
  polarity: "POSITIVE" | "NEGATIVE" | "OBSERVATION";
  strength: EvidenceRef["weight"];
  eventId: string;
  context: { projectId?: string; moduleId?: string; agentId?: string; correlationId?: string };
  eligible: boolean;
}

const signalMap: Partial<Record<ExperienceEvent["actionType"], ExperienceSignal["kind"]>> = {
  FEEDBACK_SUBMITTED: "EXPLICIT_FEEDBACK", IMMEDIATE_UNDO: "IMMEDIATE_UNDO", DELAYED_UNDO: "DELAYED_UNDO", REDO: "REDO", PROPOSAL_ACCEPTED: "PROPOSAL_ACCEPTED",
  PROPOSAL_REJECTED: "PROPOSAL_REJECTED", PREFERENCE_CONFIRMED: "PREFERENCE_CONFIRMED", PREFERENCE_REJECTED: "PREFERENCE_REJECTED", PREFERENCE_CORRECTED: "PREFERENCE_CORRECTED",
  USER_ACTION: "DIRECT_EDIT", MANUAL_EDIT: "DIRECT_EDIT", PROPOSAL_MODIFIED: "PROPOSAL_MODIFIED", OUTCOME_RECORDED: "OUTCOME",
  PROJECT_CREATED: "PROJECT_CREATED",
  VERSION_CREATED: "VERSION_CREATED",
  EXPORT_CREATED: "EXPORT_CREATED",
};

export function extractSignal(event: ExperienceEvent): ExperienceSignal | null {
  const kind = signalMap[event.actionType];
  if (!kind) return null;
  const polarity: ExperienceSignal["polarity"] = kind === "PROPOSAL_REJECTED" || kind === "PREFERENCE_REJECTED" || kind === "PREFERENCE_CORRECTED"
    || (kind === "EXPLICIT_FEEDBACK" && ["DISLIKE", "CORRECTION", "REJECT"].includes(String(event.metadata.feedbackType)))
    ? "NEGATIVE"
    : kind === "PROPOSAL_ACCEPTED" || kind === "PREFERENCE_CONFIRMED"
      || (kind === "EXPLICIT_FEEDBACK" && ["LIKE", "ACCEPT", "CONFIRM_PREFERENCE"].includes(String(event.metadata.feedbackType)))
      ? "POSITIVE"
      : "OBSERVATION";
  const strength = kind === "EXPLICIT_FEEDBACK" || kind === "PREFERENCE_CONFIRMED" || kind === "PREFERENCE_REJECTED" || kind === "PREFERENCE_CORRECTED" ? "VERY_HIGH"
    : kind === "IMMEDIATE_UNDO" || kind === "PROPOSAL_ACCEPTED" || kind === "PROPOSAL_REJECTED" ? "HIGH"
      : kind === "PROPOSAL_MODIFIED" || kind === "DIRECT_EDIT" || kind === "PROJECT_CREATED" || kind === "VERSION_CREATED" ? "MEDIUM" : "LOW";
  const eligibility = evaluateLearningEligibility(event);
  return { kind, polarity, strength, eventId: event.id, context: { projectId: event.projectId, moduleId: event.moduleId, agentId: event.agentId, correlationId: event.correlationId }, eligible: eligibility.eligible };
}

export function confidenceFromEvidence(evidence: Array<{ weight: EvidenceRef["weight"] }>, contradictionCount = 0): number {
  const weights = { VERY_HIGH: 1, HIGH: 0.75, MEDIUM: 0.5, LOW: 0.25, VERY_LOW: 0.1 };
  const capped = Math.min(1, evidence.reduce((sum, item) => sum + weights[item.weight], 0) / 2);
  return Math.max(0, Math.round((capped - Math.min(0.5, contradictionCount * 0.15)) * 100) / 100);
}
