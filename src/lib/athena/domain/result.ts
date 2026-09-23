export interface AgentResult {
  agentId: string;
  agentName: string;
  role: string;
  success: boolean;
  content: string;
  confidence: number;
  sources?: string[];
  recommendations?: string[];
  criticism?: string[];
  limitations?: string[];
  metadata?: Record<string, unknown>;
}

export interface DeliberationContribution {
  agentId: string;
  specialty: string;
  analysis: string;
  pointsOfAgreement?: string[];
  pointsOfDissent?: string[];
}

export interface DeliberationResult {
  topic: string;
  participatingAgents: string[];
  contributions: DeliberationContribution[];
  critique?: {
    reviewerAgentId: string;
    identifiedFlaws: string[];
    counterArguments: string[];
  };
  consensusSummary: string;
  recommendedAction?: string;
}

export interface ReflectionReport {
  level: "NONE" | "LIGHT" | "STANDARD" | "DEEP";
  isCoherent: boolean;
  hasContradictions: boolean;
  identifiedRisks: string[];
  passedValidation: boolean;
  suggestedAdjustments?: string;
}

