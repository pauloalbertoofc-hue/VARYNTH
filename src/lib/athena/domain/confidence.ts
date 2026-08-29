export type ConfidenceLevel = "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";

export interface ConfidenceAssessment {
  level: ConfidenceLevel;
  score: number; // Internal 0.0 - 1.0 (never exposed as artificial pseudo-science percentage to user)
  factors: {
    sourceReliability: number;
    agentConsensus: number;
    contextCompleteness: number;
    toolExecutionSuccess: boolean;
  };
  rationale: string;
}
