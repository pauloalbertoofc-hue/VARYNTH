/**
 * VARYNTH OS — ATHENA RESPONSE STRATEGY TYPES
 * Formal models for Structured Response Intent, Fact Grounding,
 * Targeted Clarification, Uncertainty Classification, and Persona Profile.
 */

export type ResponseMode =
  | "DIRECT_ANSWER"
  | "CLARIFICATION"
  | "ACKNOWLEDGEMENT"
  | "CORRECTION"
  | "UNCERTAINTY"
  | "STATUS_REPORT"
  | "PLAN_PROPOSAL"
  | "EXECUTION_REPORT"
  | "SOCIAL_RESPONSE";

export type ResponseTone =
  | "NEUTRAL"
  | "WARM"
  | "CONCISE"
  | "TECHNICAL"
  | "CAUTIOUS"
  | "SUPPORTIVE"
  | "HUMOROUS";

export type ResponseVerbosity = "SHORT" | "MEDIUM" | "DETAILED";

export type UncertaintyType =
  | "UNKNOWN"
  | "NOT_FOUND"
  | "AMBIGUOUS"
  | "CAPABILITY_UNAVAILABLE"
  | "INSUFFICIENT_CONTEXT"
  | "LOW_CONFIDENCE"
  | "EXECUTION_FAILED"
  | "NONE";

export type FactSourceType =
  | "TASK_REPOSITORY"
  | "PROJECT_REPOSITORY"
  | "GRAPH"
  | "JOB_MANAGER"
  | "VAULT"
  | "CODEX"
  | "SYSTEM_HEALTH"
  | "CAPABILITY_CATALOG"
  | "SESSION_STATE";

export interface FactProvenance {
  sourceType: FactSourceType;
  sourceId: string;
  revision?: string | number;
  queryRef?: string;
  evaluatedAt: string;
}

export interface StructuredFact {
  key: string;
  value: string | number | boolean | null;
  label: string;
  supportedBy: FactProvenance;
}

export interface ClarificationState {
  attemptCount: number;
  target: string;
  missingSlot?: string;
  askedCandidateIds: string[];
  candidates?: { id: string; name: string; description?: string }[];
  isLoopDetected?: boolean;
}

export interface GroundedErrorExplanation {
  whatHappened: string;
  whatIsSafe: string;
  whatCanHappenNext: string[];
  errorCode?: string;
}

export interface AthenaPersonaProfile {
  warmth: number; // 0.0 to 1.0 (baseline 0.7)
  directness: number; // 0.0 to 1.0 (baseline 0.85)
  verbosityBias: number; // 0.0 to 1.0 (baseline 0.5)
  humorTolerance: number; // 0.0 to 1.0 (baseline 0.6)
  technicalDepth: number; // 0.0 to 1.0 (baseline 0.8)
  cautionLevel: number; // 0.0 to 1.0 (baseline 0.9)
  formality: number; // 0.0 to 1.0 (baseline 0.4)
}

export interface ResponseIntent {
  mode: ResponseMode;
  tone: ResponseTone;
  verbosity: ResponseVerbosity;
  uncertaintyType: UncertaintyType;
  shouldAskQuestion: boolean;
  shouldMentionUncertainty: boolean;
  shouldMentionAuthorityBoundary: boolean;
  keyFacts: StructuredFact[];
  suggestedNextSteps: string[];
  clarificationState?: ClarificationState;
  groundedError?: GroundedErrorExplanation;
  sourceScope: string;
  isMisunderstandingRepair?: boolean;
  deltaContextOnly?: boolean;
}

export interface ResponseStrategyObservationTrace {
  timestamp: string;
  mode: ResponseMode;
  tone: ResponseTone;
  verbosity: ResponseVerbosity;
  factsCount: number;
  uncertaintyType: UncertaintyType;
  clarificationAttempt: number;
  localLMEligible: boolean;
}
