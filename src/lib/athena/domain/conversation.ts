export type ConversationIntent =
  | "SOCIAL_CONVERSATION"   // Perguntas à persona: "Como você está?", "E aí Athena?", "Sentiu minha falta?"
  | "ATHENA_SELF_STATUS"     // Diagnóstico da Athena: "Seu sistema está funcionando?", "Seu Kernel está operacional?"
  | "ECOSYSTEM_STATUS"       // Consulta ao estado do usuário: "Como estão minhas tarefas?", "Como estão meus projetos?"
  | "ECOSYSTEM_BRIEFING"     // Briefing explícito: "Me dê um briefing", "O que mudou nos meus projetos?"
  | "CONCEPT_INQUIRY"        // Explicação de conceitos: "O que é latim?", "Você sabe o que é um jogo?"
  | "BRAINSTORM"             // Ideação: "O que acha de...", "Estou com uma ideia..."
  | "ANALYSIS"               // Análise: "Análise da tese", "Metodologia científica"
  | "EXECUTION_REQUEST"      // Comandos: "Crie uma tarefa...", "Crie uma nota...", "Mover para a lixeira"
  | "AMBIGUOUS";             // Intenção ambígua com necessidade de resposta delicada sem presumir

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
