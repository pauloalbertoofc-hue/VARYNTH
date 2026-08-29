import { ConversationTurn, InteractionType, CognitiveIntent } from "../domain/conversation";

export type RegressionCategory =
  | "INTENT_MISCLASSIFICATION"
  | "CONTEXT_LOSS"
  | "ENTITY_RESOLUTION_FAILURE"
  | "FALSE_UNDERSTANDING"
  | "GENERIC_FALLBACK"
  | "OVER_TOOL_USAGE"
  | "UNDER_TOOL_USAGE"
  | "UNNECESSARY_CLARIFICATION"
  | "MISSING_CLARIFICATION"
  | "INCOMPLETE_RESPONSE"
  | "SOCIAL_MISREAD"
  | "OPERATIONAL_MISREAD"
  | "PRONOUN_RESOLUTION"
  | "FOLLOW_UP_FAILURE"
  | "MEMORY_CONTEXT_FAILURE"
  | "DESTRUCTIVE_ACTION_AMBIGUITY"
  | "TOPIC_SHIFT_DETECTION";

export interface ConversationalRegressionCase {
  id: string;
  title: string;
  category: RegressionCategory;
  isGoldenCase?: boolean;

  // Multi-turn context preceding the input
  context?: Array<{
    role: "user" | "athena";
    text: string;
    recommendations?: string[];
    critiques?: string[];
  }>;

  // The primary input and paraphrases
  input: string;
  paraphrases?: string[];

  // Expected semantic classification
  expectedInteractionType?: InteractionType;
  expectedIntents?: CognitiveIntent[];

  // Semantic behavioral requirements
  mustDo?: string[];
  mustNotDo?: string[];

  // Tool / Module expectations
  expectedTools?: string[];
  forbiddenTools?: string[];

  // Clarification evaluation
  shouldAskClarification?: boolean;

  // Engineering notes and historical bug reference
  notes?: string;
}

export interface AthenaFailureRecord {
  id: string;
  category: RegressionCategory;
  input: string;
  context?: unknown;
  detectedBehavior: string;
  expectedBehavior?: string;
  fixed: boolean;
  regressionTestId?: string;
  createdAt: string;
  fixedAt?: string;
}

export interface RegressionAssertionResult {
  caseId: string;
  title: string;
  input: string;
  passed: boolean;
  failures: string[];
  debugTrace: {
    interactionType?: string;
    intents?: string[];
    confidence?: string;
    path?: string;
    responseText?: string;
  };
}

export interface QualityGateReport {
  timestamp: string;
  totalCases: number;
  totalParaphrases: number;
  passed: number;
  failed: number;
  goldenCasesPassed: boolean;
  qualityScore: number;
  results: RegressionAssertionResult[];
}

