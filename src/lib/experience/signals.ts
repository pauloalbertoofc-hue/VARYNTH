import { ExperienceEvent, EvidenceRef } from "./contracts";

export interface ExperienceSignal {
  kind: "EXPLICIT_FEEDBACK" | "DIRECT_EDIT" | "IMMEDIATE_UNDO" | "PROPOSAL_ACCEPTED" | "PROPOSAL_MODIFIED" | "OUTCOME";
  strength: EvidenceRef["weight"];
  eventId: string;
  context: { projectId?: string; moduleId?: string; agentId?: string; correlationId?: string };
  eligible: boolean;
}

const signalMap: Partial<Record<ExperienceEvent["actionType"], ExperienceSignal["kind"]>> = {
  FEEDBACK_SUBMITTED: "EXPLICIT_FEEDBACK", IMMEDIATE_UNDO: "IMMEDIATE_UNDO", PROPOSAL_ACCEPTED: "PROPOSAL_ACCEPTED",
  USER_ACTION: "DIRECT_EDIT", PROPOSAL_MODIFIED: "PROPOSAL_MODIFIED", OUTCOME_RECORDED: "OUTCOME",
};

export function extractSignal(event: ExperienceEvent): ExperienceSignal | null {
  const kind = signalMap[event.actionType];
  if (!kind) return null;
  const strength = kind === "EXPLICIT_FEEDBACK" ? "VERY_HIGH" : kind === "IMMEDIATE_UNDO" || kind === "PROPOSAL_ACCEPTED" ? "HIGH" : kind === "PROPOSAL_MODIFIED" || kind === "DIRECT_EDIT" ? "MEDIUM" : "LOW";
  return { kind, strength, eventId: event.id, context: { projectId: event.projectId, moduleId: event.moduleId, agentId: event.agentId, correlationId: event.correlationId }, eligible: event.learningEligible && event.actor === "USER" };
}

export function confidenceFromEvidence(evidence: Array<{ weight: EvidenceRef["weight"] }>, contradictionCount = 0): number {
  const weights = { VERY_HIGH: 1, HIGH: 0.75, MEDIUM: 0.5, LOW: 0.25, VERY_LOW: 0.1 };
  const capped = Math.min(1, evidence.reduce((sum, item) => sum + weights[item.weight], 0) / 2);
  return Math.max(0, Math.round((capped - Math.min(0.5, contradictionCount * 0.15)) * 100) / 100);
}
