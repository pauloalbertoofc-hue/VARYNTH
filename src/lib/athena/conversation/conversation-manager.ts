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
import { SemanticInterpretationEngine } from "../semantic/semantic-interpretation-engine";

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
      const projectTokens = projNorm
        .split(" ")
        .filter((token) => token.length > 1 && !["de", "da", "do", "das", "dos", "e"].includes(token));
      const matchesProject =
        clean.includes(projNorm) ||
        (projectTokens.length >= 2 && projectTokens.every((token) => clean.split(" ").includes(token)));
      if (matchesProject) {
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
    // 3. SEMANTIC INTERPRETATION LAYER INTEGRATION
    // -------------------------------------------------------------
    const semantic = SemanticInterpretationEngine.interpretSync(clean, prompt, {
      currentProjectId: targetProjectId,
      currentTopic: state.currentTopic,
      recentEntities: state.recentEntities,
    });

    let interactionType: InteractionType = "CONVERSATION";
    const intents: CognitiveIntent[] = [];
    let confidence: ConfidenceLevel = semantic.confidenceLevel === "HIGH" ? "HIGH" : semantic.confidenceLevel === "MEDIUM" ? "MEDIUM" : "LOW";
    let requiresContext = false;
    let requiresAction = false;
    let subject = "GENERAL";
    let isAmbiguous = semantic.isNoise || semantic.requiresClarification;
    let clarificationPrompt = semantic.clarificationPrompt;

    const isSocialCheckIn =
      clean.includes("como voce esta") ||
      clean.includes("tudo bem com voce") ||
      clean.includes("tudo bem por ai") ||
      clean.includes("como anda voce") ||
      clean.includes("voce esta bem") ||
      clean.includes("sentiu minha falta") ||
      clean.includes("que novidade voce tem") ||
      clean.includes("o que me conta");
    const isAthenaSelfDiagnostic =
      semantic.intent === "ATHENA_SELF_STATUS" ||
      clean.includes("seu kernel") ||
      clean.includes("seu sistema") ||
      clean.includes("seus modulos cognitivos") ||
      clean.includes("diagnostico da athena") ||
      clean.includes("voce esta funcionando");
    const isExplicitMutation =
      /^(crie|criar|adicione|adicionar|nova|novo)\s+(uma\s+|um\s+)?(tarefa|nota)\b/.test(clean) ||
      /^(mova|mover|exclua|excluir|apague|apagar|remova|remover)\b/.test(clean);
    const isCritiqueRequest =
      clean.includes("critique") || clean.includes("critica") ||
      clean.includes("ponto fraco") || clean.includes("pontos fracos") ||
      clean.includes("ponto cego") || clean.includes("pontos cegos") || clean.includes("riscos");
    const isComparisonRequest =
      clean.includes("compare") || clean.includes("comparar") || clean.includes("diferenca") ||
      clean.includes("vale mais a pena") || clean.includes("versus");
    const isBrainstormRequest =
      clean.includes("ideia") || clean.includes("ideias") || clean.includes("inventar") ||
      clean.includes("brainstorm") || clean.includes("projeto novo") || clean.includes("novo projeto") ||
      clean.includes("que projeto") || clean.includes("qual projeto") ||
      clean.includes("sugira") || clean.includes("sugestao") || clean.includes("recomende") ||
      clean.includes("alguma coisa legal pra comecar") || clean.includes("pensar em");
    const isPlanningRequest =
      clean.includes("o que voce faria") || clean.includes("proximo passo") ||
      clean.includes("destravar") || clean.includes("como resolver") ||
      clean.includes("planeje") || clean.includes("plano");
    const isDoubleNegation = clean.includes("nao precisa deixar de") || clean.includes("nao deixe de nao");
    const isConditionalFallback =
      clean.includes("se nao der") || clean.includes("se falhar") ||
      clean.includes("caso nao funcione") || clean.includes("como alternativa");
    const isProjectReadinessQuery =
      Boolean(targetProjectId) &&
      (clean.includes("pronto") || clean.includes("progresso") || clean.includes("100%") || clean.includes("publicacao"));
    const isPendingTargetSelection =
      Boolean(targetProjectTitle) &&
      Boolean(lastUserTurn?.intents?.includes("EXECUTION_REQUEST")) &&
      clean.split(" ").length <= 6;

    // A. Noise & Uncertainty
    if (semantic.isNoise || semantic.requiresClarification) {
      interactionType = "CONVERSATION";
      intents.push("CLARIFICATION_REQUIRED");
      confidence = "LOW";
      subject = "UNCERTAIN_INPUT";
      isAmbiguous = true;
      clarificationPrompt = semantic.clarificationPrompt || "Fiquei em dúvida sobre como direcionar. O que você gostaria de explorar no sistema?";
    }
    else if (isDoubleNegation) {
      interactionType = "COGNITIVE_REQUEST";
      intents.push("CLARIFICATION_REQUIRED");
      confidence = "LOW";
      requiresContext = false;
      subject = "AMBIGUOUS_NEGATION";
      isAmbiguous = true;
      clarificationPrompt = "A frase contém uma dupla negação. Só para confirmar: você quer que eu crie a capa, ou prefere que eu não faça isso ainda?";
    }
    // B. Explicit conversational and cognitive speech acts outrank noun matches
    // such as "projeto" or "sistema" from the statistical classifier.
    else if (isSocialCheckIn) {
      interactionType = "CONVERSATION";
      intents.push("SOCIAL_CONVERSATION");
      confidence = "HIGH";
      requiresContext = false;
      subject = "ATHENA";
    }
    else if (isAthenaSelfDiagnostic) {
      interactionType = "COGNITIVE_REQUEST";
      intents.push("ATHENA_SELF_STATUS");
      confidence = "HIGH";
      requiresContext = false;
      subject = "ATHENA_HEALTH";
    }
    else if (isExplicitMutation) {
      interactionType = "OPERATIONAL_REQUEST";
      intents.push("EXECUTION_REQUEST");
      confidence = "HIGH";
      requiresAction = true;
      requiresContext = true;
      subject = "DATABASE_MUTATION";
    }
    else if (isConditionalFallback) {
      interactionType = "COGNITIVE_REQUEST";
      intents.push("PLAN");
      confidence = "HIGH";
      requiresContext = true;
      subject = "CONDITIONAL_FALLBACK";
    }
    else if (isProjectReadinessQuery) {
      interactionType = "COGNITIVE_REQUEST";
      intents.push("ECOSYSTEM_STATUS");
      confidence = "HIGH";
      requiresContext = true;
      subject = "PROJECT";
    }
    else if (isPendingTargetSelection) {
      interactionType = "COGNITIVE_REQUEST";
      intents.push("CONTINUE");
      confidence = "HIGH";
      requiresContext = true;
      subject = "PROJECT";
      referencedEntityName = targetProjectTitle;
    }
    else if (isEllipsis && (clean.includes("por que") || clean.includes("porque") || clean.includes("razao") || clean.includes("motivo") || clean.includes("justificativa"))) {
      interactionType = "COGNITIVE_REQUEST";
      intents.push("EXPLAIN");
      confidence = "HIGH";
      requiresContext = true;
      subject = "PREVIOUS_RECOMMENDATION";
    }
    else if (isCritiqueRequest) {
      interactionType = "COGNITIVE_REQUEST";
      intents.push("CRITIQUE");
      confidence = "HIGH";
      requiresContext = true;
      subject = "CRITICAL_REVIEW";
    }
    else if (isComparisonRequest) {
      interactionType = "COGNITIVE_REQUEST";
      intents.push("COMPARE");
      confidence = "HIGH";
      requiresContext = true;
      subject = "COMPARISON";
    }
    else if (isPlanningRequest) {
      interactionType = "COGNITIVE_REQUEST";
      intents.push("RECOMMEND");
      intents.push("PLAN");
      confidence = "HIGH";
      requiresContext = true;
      subject = "ENGINEERING_PLAN";
    }
    else if (isBrainstormRequest) {
      interactionType = "COGNITIVE_REQUEST";
      intents.push("BRAINSTORM");
      confidence = "HIGH";
      if (
        clean.includes("projeto") || clean.includes("recomende") || clean.includes("sugira") ||
        clean.includes("comecar") || clean.includes("alguma coisa legal")
      ) {
        intents.push("RECOMMEND");
      }
      requiresContext = true;
      subject = clean.includes("imagem") || clean.includes("foto") || clean.includes("capa")
        ? "CREATIVE_STUDIO"
        : "GENERAL_TOPIC";
    }
    // C. Ecosystem / Tasks / Projects Status
    else if (
      semantic.intent === "TASK_QUERY" ||
      semantic.intent === "PROJECT_QUERY" ||
      semantic.intent === "ECOSYSTEM_STATUS" ||
      clean.includes("quantas tarefas") ||
      clean.includes("quantos projetos") ||
      clean.includes("tarefas existem") ||
      clean.includes("tarefas do projeto") ||
      clean.includes("projetos ativos") ||
      clean.includes("como esta meu sistema") ||
      clean.includes("como esta o sistema") ||
      clean.includes("como estao meus projetos") ||
      clean.includes("como estao minhas tarefas") ||
      clean.includes("como esta aquele projeto") ||
      clean.includes("como esta esse projeto") ||
      clean.includes("meus prazos")
    ) {
      interactionType = "COGNITIVE_REQUEST";
      intents.push("ECOSYSTEM_STATUS");
      subject = semantic.intent === "TASK_QUERY" ? "USER_RESOURCES" : semantic.intent === "PROJECT_QUERY" ? "PROJECT" : "USER_RESOURCES";
      requiresContext = true;
    }
    // D. Ecosystem Briefing
    else if (semantic.intent === "ECOSYSTEM_BRIEFING") {
      interactionType = "COGNITIVE_REQUEST";
      intents.push("ECOSYSTEM_BRIEFING");
      subject = "SYSTEM_ECOSYSTEM";
      requiresContext = true;
    }
    // E. Athena Self Diagnostic
    else if (semantic.intent === "ATHENA_SELF_STATUS") {
      interactionType = "COGNITIVE_REQUEST";
      intents.push("ATHENA_SELF_STATUS");
      subject = "ATHENA_HEALTH";
      requiresContext = false;
    }
    // F. Capability-shaped ideation is still a cognitive request, not a mutation.
    // Example: "Athena, consegue me dar uma ideia de imagem?"
    else if (
      semantic.trace.pragmaticFlags.includes("CAPABILITY_INQUIRY") &&
      (clean.includes("ideia") || clean.includes("ideias") || clean.includes("brainstorm") || clean.includes("sugestao"))
    ) {
      interactionType = "COGNITIVE_REQUEST";
      intents.push("BRAINSTORM");
      confidence = "HIGH";
      requiresContext = false;
      subject = clean.includes("imagem") || clean.includes("foto") || clean.includes("capa")
        ? "CREATIVE_STUDIO"
        : "GENERAL_TOPIC";
    }
    // G. Operational Mutation (Strictly affirmative, not negated)
    else if (
      (semantic.intent === "EXECUTION_REQUEST" || semantic.intent === "CREATIVE_INTENT") &&
      semantic.polarity !== "NEGATED" &&
      !semantic.negatedScope?.disallowedActions.includes("EXECUTE")
    ) {
      interactionType = "OPERATIONAL_REQUEST";
      intents.push("EXECUTION_REQUEST");
      requiresAction = true;
      requiresContext = true;
      subject = semantic.intent === "CREATIVE_INTENT" ? "CREATIVE_STUDIO" : "DATABASE_MUTATION";
    }
    // H. Epistemic Concepts & Explanations
    else if (semantic.intent === "EPISTEMIC_QUERY") {
      interactionType = "COGNITIVE_REQUEST";
      intents.push("EXPLAIN");
      subject = "EPISTEMIC_CONCEPT";
      requiresContext = false;
    }
    // I. Pragmatic Feedback (Sarcasm, Venting, Scolding)
    else if (
      semantic.trace.pragmaticFlags.includes("SARCASM_OR_IRONY") ||
      semantic.trace.pragmaticFlags.includes("EMOTIONAL_VENTING") ||
      clean.includes("nao queria") || clean.includes("apagou o errado") || clean.includes("nota do")
    ) {
      interactionType = "CONVERSATION";
      intents.push("SOCIAL_CONVERSATION");
      requiresContext = false;
    }
    // J. Cognitive Requests (Critique, Compare, Ideas, Recommend, Analyze, Explain, Plan)
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
    // K. Default: Social Conversation & Fast Chit-Chat
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
      isAmbiguous,
      clarificationPrompt,
      semanticInterpretation: semantic,
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
