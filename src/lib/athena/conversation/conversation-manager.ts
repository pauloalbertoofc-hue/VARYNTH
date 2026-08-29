import {
  ConversationState,
  ConversationIntent,
  ConversationMode,
  ConversationSummary,
} from "../domain/conversation";
import { sessionSummarizer } from "./session-summarizer";
import { AthenaMessage } from "../domain/response";
import { Project } from "@/lib/types";

export interface ResolvedContext {
  intent: ConversationIntent;
  mode: ConversationMode;
  targetProjectId?: string;
  targetProjectTitle?: string;
  isAmbiguousReference: boolean;
  ambiguousTerm?: string;
  topic?: string;
}

export class ConversationManager {
  private sessions: Map<string, ConversationState> = new Map();

  getOrCreateSession(sessionId: string, currentProjectId?: string): ConversationState {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, {
        sessionId,
        currentProjectId,
        recentEntities: [],
        mode: "casual",
        unresolvedReferences: [],
        messageCount: 0,
        lastInteractionAt: new Date().toISOString(),
      });
    }
    const state = this.sessions.get(sessionId)!;
    if (currentProjectId && !state.currentProjectId) {
      state.currentProjectId = currentProjectId;
    }
    return state;
  }

  /**
   * Classifies the conversational intent vs execution intent and resolves anaphora references.
   */
  processMessage(
    sessionId: string,
    rawPrompt: string,
    allProjects: Project[] = [],
    activeProjectId?: string
  ): ResolvedContext {
    const state = this.getOrCreateSession(sessionId, activeProjectId);
    const prompt = rawPrompt.trim();
    const lower = prompt.toLowerCase();

    state.messageCount += 1;
    state.lastInteractionAt = new Date().toISOString();

    // 1. Determine Intent
    let intent: ConversationIntent = "CONVERSATION_ONLY";
    let mode: ConversationMode = "casual";

    // Execution Request Patterns
    const isExecutionCommand =
      lower.startsWith("crie uma tarefa") ||
      lower.startsWith("criar tarefa") ||
      lower.startsWith("nova tarefa") ||
      lower.startsWith("adicione uma tarefa") ||
      lower.startsWith("crie uma nota") ||
      lower.startsWith("anote isso") ||
      lower.startsWith("anotar") ||
      lower.startsWith("excluir") ||
      lower.startsWith("apagar") ||
      lower.startsWith("deletar") ||
      lower.startsWith("remover") ||
      lower.includes("mover para a lixeira") ||
      lower.includes("gerar relatorio");

    if (isExecutionCommand) {
      intent = "EXECUTION_REQUEST";
      mode = "command";
    } else if (
      lower.includes("o que acha de") ||
      lower.includes("ideia") ||
      lower.includes("brainstorm") ||
      lower.includes("pensando em criar") ||
      lower.includes("sugira") ||
      lower.includes("sugestão")
    ) {
      intent = "BRAINSTORM";
      mode = "brainstorm";
    } else if (
      lower.includes("analisar") ||
      lower.includes("tese") ||
      lower.includes("precedente") ||
      lower.includes("metodologia") ||
      lower.includes("evidencia") ||
      lower.includes("artigo")
    ) {
      intent = "ANALYSIS";
      mode = "analysis";
    } else if (lower.includes("?") || lower.startsWith("como") || lower.startsWith("qual") || lower.startsWith("onde") || lower.startsWith("quando")) {
      intent = "QUESTION";
      mode = "casual";
    } else {
      intent = "CONVERSATION_ONLY";
      mode = "casual";
    }

    state.mode = mode;

    // 2. Anaphora & Reference Resolution ("esse projeto", "essa ideia", "aquela pesquisa", "isso")
    let targetProjectId = activeProjectId || state.currentProjectId;
    let targetProjectTitle: string | undefined;
    let isAmbiguousReference = false;
    let ambiguousTerm: string | undefined;

    // Check if an explicit project is named in the prompt
    const matchedProject = allProjects.find((p) =>
      lower.includes(p.title.toLowerCase())
    );

    if (matchedProject) {
      targetProjectId = matchedProject.id;
      targetProjectTitle = matchedProject.title;
      state.currentProjectId = matchedProject.id;
      if (!state.recentEntities.includes(matchedProject.title)) {
        state.recentEntities = [matchedProject.title, ...state.recentEntities].slice(0, 5);
      }
      state.currentTopic = matchedProject.title;
    } else if (
      lower.includes("esse projeto") ||
      lower.includes("este projeto") ||
      lower.includes("nesse projeto") ||
      lower.includes("no projeto")
    ) {
      if (targetProjectId) {
        const proj = allProjects.find((p) => p.id === targetProjectId);
        targetProjectTitle = proj?.title;
      } else if (allProjects.length === 1) {
        targetProjectId = allProjects[0].id;
        targetProjectTitle = allProjects[0].title;
        state.currentProjectId = targetProjectId;
      } else if (allProjects.length > 1) {
        isAmbiguousReference = true;
        ambiguousTerm = "esse projeto";
      }
    }

    return {
      intent,
      mode,
      targetProjectId,
      targetProjectTitle,
      isAmbiguousReference,
      ambiguousTerm,
      topic: state.currentTopic,
    };
  }

  updateSessionWithHistory(sessionId: string, messages: AthenaMessage[]): void {
    const state = this.getOrCreateSession(sessionId);
    if (messages.length >= 6) {
      state.conversationSummary = sessionSummarizer.summarize(messages);
    }
  }
}

export const athenaConversationManager = new ConversationManager();
