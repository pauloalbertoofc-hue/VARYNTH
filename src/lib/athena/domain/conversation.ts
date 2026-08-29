export type ConversationIntent =
  | "CONVERSATION_ONLY"
  | "QUESTION"
  | "ANALYSIS"
  | "BRAINSTORM"
  | "EXECUTION_REQUEST"
  | "AMBIGUOUS";

export type ConversationMode = "casual" | "analysis" | "brainstorm" | "planning" | "command";

export interface ConversationSummary {
  topics: string[];
  decisions: string[];
  openQuestions: string[];
  referencedProjects: string[];
  importantFacts: string[];
}

export interface ConversationState {
  sessionId: string;
  currentTopic?: string;
  currentProjectId?: string;
  recentEntities: string[];
  mode: ConversationMode;
  unresolvedReferences: string[];
  conversationSummary?: ConversationSummary;
  messageCount: number;
  lastInteractionAt: string;
}

