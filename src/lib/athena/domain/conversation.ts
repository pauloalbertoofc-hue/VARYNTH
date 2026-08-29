import type { ConfidenceLevel } from "./confidence";
export type { ConfidenceLevel };

export type InteractionType =
  | "CONVERSATION"        // Diálogo social, humor, empatia, saudações (Fast Path - zero banco de dados)
  | "COGNITIVE_REQUEST"   // Ideação, recomendação, análise, crítica, síntese, explicação (Cognitive Path)
  | "OPERATIONAL_REQUEST"; // Mutação no sistema: tarefas, notas, lixeira, calendário (Operational Path)

export type CognitiveIntent =
  | "BRAINSTORM"           // "Me dê ideias", "O que poderíamos inventar?"
  | "RECOMMEND"           // "Qual projeto é interessante começar?", "O que você me recomenda?"
  | "ANALYZE"             // "Analise a tese", "Examine esse cenário"
  | "COMPARE"             // "Compare os dois", "Qual a diferença entre A e B?"
  | "EXPLAIN"             // "Explique isso", "O que é latim?", "Como funciona um jogo?"
  | "PLAN"                // "Planeje comigo", "Como estruturar esse projeto?"
  | "CRITIQUE"            // "Critique essa ideia", "Aponte os pontos fracos"
  | "REFLECT"             // "Estava pensando sobre...", "Qual a sua reflexão?"
  | "EXPLORE"             // "Vamos explorar essa possibilidade"
  | "DECIDE"              // "Me ajude a decidir", "Qual caminho tomar?"
  | "SUMMARIZE"           // "Resuma esse ponto", "Faça uma síntese"
  | "PRIORITIZE"          // "O que priorizar hoje?", "Qual é o mais urgente?"
  | "REVIEW"              // "Revise essa estrutura"
  | "CONTINUE"            // "Continue", "Prossiga"
  | "QUESTION"            // Perguntas gerais ou de esclarecimento
  | "SOCIAL_CONVERSATION" // "Como você está?", "Tudo bem?", "Sentiu minha falta?"
  | "ATHENA_SELF_STATUS"  // "Seu Kernel está operacional?", "Como está seu sistema?"
  | "ECOSYSTEM_STATUS"    // "Como estão minhas tarefas?", "Como está minha situação no sistema?"
  | "ECOSYSTEM_BRIEFING"  // "Me dê um briefing", "O que mudou no VARYNTH?"
  | "EXECUTION_REQUEST"   // "Crie uma tarefa", "Mova para a lixeira", "Crie uma nota"
  | "CLARIFICATION_REQUIRED"; // Baixa confiança exigindo esclarecimento honesto

export type ConversationIntent = CognitiveIntent;

export type ConversationMode = "casual" | "analysis" | "brainstorm" | "planning" | "command";

export interface ParsedCognitiveContext {
  interactionType: InteractionType;
  intents: CognitiveIntent[];
  mode?: ConversationMode;
  subject?: string;
  temporalContext?: "TODAY" | "THIS_WEEK" | "FUTURE" | "PAST" | "NONE";
  confidence: ConfidenceLevel;
  requiresContext: boolean;
  requiresAction: boolean;
  resolvedEntities: {
    targetProjectId?: string;
    targetProjectTitle?: string;
    referencedEntityName?: string;
    pronounTarget?: "ATHENA" | "USER_SYSTEM" | "SPECIFIC_PROJECT" | "GENERAL";
  };
  ellipsisResolved?: {
    isEllipsis: boolean;
    originalReferent?: string;
    resolvedMeaning?: string;
  };
  isAmbiguous: boolean;
  ambiguityType?: "IRRELEVANT" | "RELEVANT" | "DANGEROUS";
  clarificationPrompt?: string;
}

export interface InteractionDebugInfo {
  interactionType: InteractionType;
  detectedIntents: CognitiveIntent[];
  resolvedSubject?: string;
  contextUsed: string[];
  confidence: ConfidenceLevel;
  selectedPath: "FAST_CONVERSATION_PATH" | "COGNITIVE_PATH" | "OPERATIONAL_PATH";
  ellipsisResolved?: boolean;
}

export interface LocalFailureTelemetryRecord {
  id: string;
  timestamp: string;
  sessionId: string;
  prompt: string;
  failureType:
    | "LOW_CONFIDENCE"
    | "CLARIFICATION_REQUIRED"
    | "UNHANDLED_INTENT"
    | "INCOMPLETE_RESPONSE"
    | "FAILED_ENTITY_RESOLUTION"
    | "CAPABILITY_UNAVAILABLE";
  details?: Record<string, unknown>;
}

export interface ConversationTurn {
  role: "user" | "athena";
  text: string;
  timestamp: string;
  intents?: CognitiveIntent[];
  entities?: string[];
  projectReferenced?: string;
}

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
  recentRecommendations?: string[];
  recentCritiques?: string[];
}
