import {
  ConversationState,
  ConversationIntent,
  CognitiveIntent,
  InteractionType,
  ConfidenceLevel,
  ParsedCognitiveContext,
  ConversationTurn,
} from "../domain/conversation";
import { sessionSummarizer } from "./session-summarizer";
import { AthenaMessage } from "../domain/response";
import { Project } from "@/lib/types";

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.,!?;:()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export class ConversationManager {
  private sessions: Map<string, ConversationState> = new Map();
  private sessionHistories: Map<string, ConversationTurn[]> = new Map();

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
        recentRecommendations: [],
        recentCritiques: [],
        interruptedTopicStack: [],
      });
      this.sessionHistories.set(sessionId, []);
    }
    const state = this.sessions.get(sessionId)!;
    if (!state.interruptedTopicStack) {
      state.interruptedTopicStack = [];
    }
    if (currentProjectId && !state.currentProjectId) {
      state.currentProjectId = currentProjectId;
    }
    return state;
  }

  /**
   * Deep multi-layered contextual parser that evaluates history, entities, and ellipsis before classifying.
   */
  processMessage(
    sessionId: string,
    rawPrompt: string,
    allProjects: Project[] = [],
    activeProjectId?: string
  ): ParsedCognitiveContext {
    const state = this.getOrCreateSession(sessionId, activeProjectId);
    const history = this.sessionHistories.get(sessionId) || [];
    const prompt = rawPrompt.trim();
    const clean = normalizeText(prompt);

    state.messageCount += 1;
    state.lastInteractionAt = new Date().toISOString();

    const lastUserTurn = [...history].reverse().find((h) => h.role === "user");
    const lastAthenaTurn = [...history].reverse().find((h) => h.role === "athena");

    // -------------------------------------------------------------
    // 1. RESOLVE ENTITIES & ANAPHORA
    // -------------------------------------------------------------
    let targetProjectId = activeProjectId || state.currentProjectId;
    let targetProjectTitle: string | undefined;
    let referencedEntityName: string | undefined;

    // Check if user is returning to a previously interrupted topic
    if (clean.startsWith("voltando ao") || clean.startsWith("voltando a") || clean.startsWith("voltando para")) {
      if (state.interruptedTopicStack && state.interruptedTopicStack.length > 0) {
        const prev = state.interruptedTopicStack.pop();
        if (prev) {
          state.currentTopic = prev.topic;
          state.currentProjectId = prev.projectId;
          targetProjectId = prev.projectId;
          targetProjectTitle = prev.topic;
        }
      }
    }

    // Check if any registered project title is explicitly in the prompt
    for (const proj of allProjects) {
      const projNorm = normalizeText(proj.title);
      if (clean.includes(projNorm)) {
        if (state.currentTopic && state.currentTopic !== proj.title) {
          if (!state.interruptedTopicStack) state.interruptedTopicStack = [];
          state.interruptedTopicStack.push({
            topic: state.currentTopic,
            projectId: state.currentProjectId,
            timestamp: new Date().toISOString(),
          });
        }
        targetProjectId = proj.id;
        targetProjectTitle = proj.title;
        state.currentProjectId = proj.id;
        if (!state.recentEntities.includes(proj.title)) {
          state.recentEntities = [proj.title, ...state.recentEntities].slice(0, 6);
        }
        state.currentTopic = proj.title;
        break;
      }
    }

    // Pronoun Target Resolution
    let pronounTarget: "ATHENA" | "USER_SYSTEM" | "SPECIFIC_PROJECT" | "GENERAL" = "GENERAL";
    if (
      clean.includes("como voce esta") ||
      clean.includes("tudo bem com voce") ||
      clean.includes("sentiu minha falta") || clean.includes("voce acha")
    ) {
      pronounTarget = "ATHENA";
    } else if (
      clean.includes("meu sistema") || clean.includes("minha situacao") ||
      clean.includes("meus projetos") || clean.includes("minhas tarefas") || clean.includes("meus prazos")
    ) {
      pronounTarget = "USER_SYSTEM";
    } else if (
      clean.includes("seu sistema") || clean.includes("seu kernel") || clean.includes("sua memoria")
    ) {
      pronounTarget = "ATHENA";
    } else if (
      clean.includes("esse projeto") || clean.includes("aquele projeto") || clean.includes("este projeto")
    ) {
      pronounTarget = "SPECIFIC_PROJECT";
    }

    // -------------------------------------------------------------
    // 2. CONTEXTUAL ELLIPSIS RESOLUTION
    // -------------------------------------------------------------
    let isEllipsis = false;
    let originalReferent: string | undefined;
    let resolvedMeaning: string | undefined;

    // Ellipsis Case A: "o segundo", "o primeiro", "esse", "essa"
    if (
      clean === "o segundo" || clean === "a segunda" || clean === "o primeiro" || clean === "a primeira" ||
      clean === "e o segundo" || clean === "e o primeiro" || clean === "esse" || clean === "essa" ||
      clean.includes("o segundo") || clean.includes("do segundo") || clean.includes("segundo projeto")
    ) {
      isEllipsis = true;
      if (state.recentEntities.length >= 2) {
        if (clean.includes("segund")) {
          originalReferent = state.recentEntities[1];
          resolvedMeaning = `Analisar ou continuar discussão sobre o segundo item recente: "${state.recentEntities[1]}"`;
          referencedEntityName = state.recentEntities[1];
        } else if (clean.includes("primeir")) {
          originalReferent = state.recentEntities[0];
          resolvedMeaning = `Analisar ou continuar discussão sobre o primeiro item recente: "${state.recentEntities[0]}"`;
          referencedEntityName = state.recentEntities[0];
        }
      }
    }

    // Ellipsis Case B: "por que?", "porque?", "qual a razão"
    if (
      clean === "por que" || clean === "porque" || clean.startsWith("por que") || clean.startsWith("porque") ||
      clean.includes("razao") || clean.includes("motivo") || clean.includes("justificativa")
    ) {
      isEllipsis = true;
      if (state.recentRecommendations && state.recentRecommendations.length > 0) {
        originalReferent = state.recentRecommendations[0];
        resolvedMeaning = `Explicar a justificativa e os fundamentos da recomendação anterior ("${state.recentRecommendations[0]}")`;
      } else if (lastAthenaTurn) {
        resolvedMeaning = `Explicar as razões e fundamentos da resposta anterior da Athena`;
      }
    }

    // Ellipsis Case C: "continue", "prossiga", "mais", "e depois?"
    if (clean === "continue" || clean === "prossiga" || clean === "e depois" || clean === "e o que mais") {
      isEllipsis = true;
      resolvedMeaning = `Continuar o aprofundamento do raciocínio anterior`;
    }

    // Ellipsis Case D: "critique essa ideia", "compare os dois"
    if (
      clean.includes("critique") || clean.includes("critica") ||
      clean.includes("ponto fraco") || clean.includes("pontos fracos") ||
      clean.includes("ponto cego") || clean.includes("pontos cegos") || clean.includes("riscos")
    ) {
      isEllipsis = true;
      if (state.recentEntities.length > 0) {
        originalReferent = state.recentEntities[0];
        resolvedMeaning = `Apresentar crítica e objeções à iniciativa recente: "${state.recentEntities[0]}"`;
      }
    }

    if (clean.includes("compare") || clean.includes("comparar") || clean.includes("vale mais a pena")) {
      isEllipsis = true;
      if (state.recentEntities.length >= 2) {
        resolvedMeaning = `Comparar as duas iniciativas recentes: "${state.recentEntities[0]}" e "${state.recentEntities[1]}"`;
      }
    }

    // -------------------------------------------------------------
    // 3. TOP-LEVEL INTERACTION CLASS & INTENT COMPOSITION
    // -------------------------------------------------------------
    let interactionType: InteractionType = "CONVERSATION";
    const intents: CognitiveIntent[] = [];
    let confidence: ConfidenceLevel = "HIGH";
    let requiresContext = false;
    let requiresAction = false;
    let subject = "GENERAL";

    const nonPunct = prompt.replace(/[.,!?\s]/g, "");
    if (nonPunct.length === 0) {
      interactionType = "COGNITIVE_REQUEST";
      intents.push("CLARIFICATION_REQUIRED");
      confidence = "LOW";
      subject = "UNCERTAIN_INPUT";
    }

    // Check Operational Request (MUTATION)
    const isOperational =
      clean.startsWith("crie uma tarefa") ||
      clean.startsWith("criar tarefa") ||
      clean.startsWith("nova tarefa") ||
      clean.startsWith("adicione uma tarefa") ||
      clean.startsWith("adicionar tarefa") ||
      clean.startsWith("crie uma nota") ||
      clean.startsWith("criar nota") ||
      clean.startsWith("anote isso") ||
      clean.startsWith("anotar") ||
      clean.startsWith("excluir") ||
      clean.startsWith("exclua") ||
      clean.startsWith("apagar") ||
      clean.startsWith("apague") ||
      clean.startsWith("deletar") ||
      clean.startsWith("delete") ||
      clean.startsWith("remover") ||
      clean.startsWith("remova") ||
      clean.startsWith("mova") ||
      clean.startsWith("mover") ||
      clean.includes("para a lixeira") ||
      clean.includes("na lixeira") ||
      clean.includes("esvaziar lixeira");

    if (isOperational) {
      interactionType = "OPERATIONAL_REQUEST";
      intents.push("EXECUTION_REQUEST");
      requiresAction = true;
      requiresContext = true;
      subject = "DATABASE_MUTATION";
    }
    // Check Athena Self Diagnostic
    else if (
      clean.includes("seu kernel") ||
      clean.includes("sua memoria") ||
      clean.includes("problema na sua memoria") ||
      clean.includes("seus modulos") ||
      clean.includes("como esta seu sistema") ||
      clean.includes("voce esta funcionando") ||
      clean.includes("diagnostico da athena")
    ) {
      interactionType = "COGNITIVE_REQUEST";
      intents.push("ATHENA_SELF_STATUS");
      subject = "ATHENA_HEALTH";
      requiresContext = false;
    }
    // Check Ecosystem Briefing Explicit Requests
    else if (
      clean.includes("briefing") ||
      clean.includes("aconteceu desde") ||
      clean.includes("resumo executivo") ||
      clean.includes("me atualize sobre")
    ) {
      interactionType = "COGNITIVE_REQUEST";
      intents.push("ECOSYSTEM_BRIEFING");
      subject = "SYSTEM_ECOSYSTEM";
      requiresContext = true;
    }
    // Check Ecosystem / System Status (Adversarial: "como esta o varynth", "como esta aquele projeto", "como está meu sistema")
    else if (
      clean.includes("minha situacao") ||
      clean.includes("como esta o varynth") ||
      clean.includes("como esta meu sistema") ||
      clean.includes("como esta o sistema") ||
      clean.includes("meu sistema") ||
      clean.includes("saude do sistema") ||
      clean.includes("quantos projetos") ||
      clean.includes("projetos ativos") ||
      clean.includes("quantas tarefas") ||
      clean.includes("tarefas ativas") ||
      clean.includes("tarefas pendentes") ||
      clean.includes("como estao meus projetos") ||
      clean.includes("como estao minhas tarefas") ||
      clean.includes("como esta aquele projeto") ||
      clean.includes("como esta esse projeto") ||
      clean.includes("meus prazos") ||
      clean.includes("tenho muita coisa pendente") ||
      clean.includes("o que tenho pendente")
    ) {
      interactionType = "COGNITIVE_REQUEST";
      intents.push("ECOSYSTEM_STATUS");
      subject = "USER_RESOURCES";
      requiresContext = true;
    }
    // Check Cognitive Requests (CRITIQUE, COMPARE, IDEAS, RECOMMEND, ANALYZE, EXPLAIN, PLAN)
    else if (
      clean.includes("critique") || clean.includes("critica") ||
      clean.includes("ponto fraco") || clean.includes("pontos fracos") ||
      clean.includes("ponto cego") || clean.includes("pontos cegos") || clean.includes("riscos") ||
      clean.includes("compare") || clean.includes("comparar") || clean.includes("diferenca") ||
      clean.includes("vale mais a pena") || clean.includes("melhor continuar") ||
      clean.includes("ideia") || clean.includes("ideias") ||
      clean.includes("inventar") || clean.includes("criar") ||
      clean.includes("pensar em") || clean.includes("projeto novo") || clean.includes("novo projeto") ||
      clean.includes("que projeto") || clean.includes("qual projeto") ||
      clean.includes("comecar") || clean.includes("iniciar") ||
      clean.includes("recomende") || clean.includes("recomendacao") ||
      clean.includes("sugira") || clean.includes("sugestao") ||
      clean.includes("o que acha") || clean.includes("o que fazer") ||
      clean.includes("analisar") || clean.includes("analise") ||
      clean.includes("explique") || clean.includes("explica") || clean.includes("o que e") ||
      clean.includes("metodo cientifico") || clean.includes("epistemologia") || clean.includes("hermeneutica") ||
      clean.includes("voce sabe o que") ||
      clean.includes("planeje") || clean.includes("plano") ||
      clean.includes("o que voce faria") || clean.includes("proximo passo") || clean.includes("destravar") || clean.includes("como resolver") ||
      isEllipsis
    ) {
      interactionType = "COGNITIVE_REQUEST";
      requiresContext = true;

      // Priority 1: Critique
      if (
        clean.includes("critique") || clean.includes("critica") ||
        clean.includes("ponto fraco") || clean.includes("pontos fracos") ||
        clean.includes("ponto cego") || clean.includes("pontos cegos") || clean.includes("riscos")
      ) {
        intents.push("CRITIQUE");
      }
      // Priority 2: Compare
      else if (
        clean.includes("compare") || clean.includes("comparar") || clean.includes("diferenca") ||
        clean.includes("vale mais a pena") || clean.includes("versus")
      ) {
        intents.push("COMPARE");
      }
      // Priority 3: Planning / Next steps
      else if (
        clean.includes("o que voce faria") || clean.includes("proximo passo") || clean.includes("destravar") ||
        clean.includes("como resolver") || clean.includes("planeje") || clean.includes("plano")
      ) {
        intents.push("RECOMMEND");
        intents.push("PLAN");
        subject = "ENGINEERING_PLAN";
      }
      // Priority 4: Brainstorm & Recommend
      else {
        if (
          clean.includes("ideia") || clean.includes("ideias") ||
          clean.includes("inventar") || clean.includes("criar") ||
          clean.includes("pensar") || clean.includes("brainstorm")
        ) {
          intents.push("BRAINSTORM");
        }
        if (
          clean.includes("qual projeto") || clean.includes("que projeto") ||
          clean.includes("projeto novo") || clean.includes("novo projeto") ||
          clean.includes("recomende") || clean.includes("sugira") || clean.includes("comecar")
        ) {
          intents.push("RECOMMEND");
          subject = "PROJECT";
        }
        if (clean.includes("analise") || clean.includes("analisar") || clean.includes("examine")) {
          intents.push("ANALYZE");
        }
        if (
          clean.includes("o que e") || clean.includes("explique") || clean.includes("explica") ||
          clean.includes("voce sabe o que") || clean.includes("metodo cientifico") ||
          clean.includes("epistemologia") || clean.includes("hermeneutica")
        ) {
          intents.push("EXPLAIN");
        }
      }

      if (isEllipsis) {
        if (clean.includes("por que") || clean.includes("porque") || clean.includes("razao") || clean.includes("motivo") || clean.includes("justificativa")) {
          intents.push("EXPLAIN");
        } else if (clean.includes("continue") || clean.includes("prossiga")) {
          intents.push("CONTINUE");
        } else if (clean.includes("segund") || clean.includes("primeir")) {
          intents.push("ANALYZE");
          intents.push("RECOMMEND");
        }
      }

      if (intents.length === 0) {
        intents.push("EXPLORE");
      }
    }
    // Check Social Conversation & Fast Chit-Chat
    else {
      interactionType = "CONVERSATION";
      intents.push("SOCIAL_CONVERSATION");
      requiresContext = false;

      // Handle casual humor
      if (clean.includes("kkk") || clean.includes("rsrs") || clean.includes("haha")) {
        subject = "CASUAL_HUMOR";
      }
    }

    // Temporal Context Extraction
    let temporalContext: ParsedCognitiveContext["temporalContext"] = "NONE";
    if (clean.includes("hoje")) temporalContext = "TODAY";
    else if (clean.includes("esta semana") || clean.includes("essa semana")) temporalContext = "THIS_WEEK";
    else if (clean.includes("amanha") || clean.includes("futuro")) temporalContext = "FUTURE";
    else if (clean.includes("ontem") || clean.includes("passado")) temporalContext = "PAST";

    // Track user turn in history
    history.push({
      role: "user",
      text: prompt,
      timestamp: new Date().toISOString(),
      intents,
      entities: referencedEntityName ? [referencedEntityName] : [],
      projectReferenced: targetProjectTitle,
    });
    if (history.length > 20) history.shift();
    this.sessionHistories.set(sessionId, history);

    return {
      interactionType,
      intents,
      subject,
      temporalContext,
      confidence,
      requiresContext,
      requiresAction,
      resolvedEntities: {
        targetProjectId,
        targetProjectTitle,
        referencedEntityName,
        pronounTarget,
      },
      ellipsisResolved: isEllipsis
        ? {
            isEllipsis: true,
            originalReferent,
            resolvedMeaning,
          }
        : undefined,
      isAmbiguous: false,
    };
  }

  recordAssistantResponse(sessionId: string, text: string, recommendations?: string[], critiques?: string[]): void {
    const history = this.sessionHistories.get(sessionId) || [];
    history.push({
      role: "athena",
      text,
      timestamp: new Date().toISOString(),
    });
    if (history.length > 20) history.shift();
    this.sessionHistories.set(sessionId, history);

    const state = this.getOrCreateSession(sessionId);
    if (recommendations && recommendations.length > 0) {
      state.recentRecommendations = recommendations;
    }
    if (critiques && critiques.length > 0) {
      state.recentCritiques = critiques;
    }
  }

  updateSessionWithHistory(sessionId: string, messages: AthenaMessage[]): void {
    const state = this.getOrCreateSession(sessionId);
    if (messages.length >= 6) {
      state.conversationSummary = sessionSummarizer.summarize(messages);
    }
  }
}

export const athenaConversationManager = new ConversationManager();
