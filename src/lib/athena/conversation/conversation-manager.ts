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

function candidateClarificationSubject(question: string | undefined): string {
  const normalized = normalizeText(question || "");
  if (/projeto/.test(normalized)) return "PROJECT";
  if (/tarefa/.test(normalized)) return "TASK";
  if (/livro|arquivo|documento|vault/.test(normalized)) return "VAULT_ITEM";
  if (/resultado|esperava|quis dizer|significa/.test(normalized)) return "CLARIFICATION";
  return "GENERAL_TOPIC";
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
        suppliedInformation: {},
        correctionCount: 0,
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
    activeProjectId?: string,
    externalConversationContext?: readonly { role: "user" | "athena"; text: string }[]
  ): ParsedCognitiveContext {
    const state = this.getOrCreateSession(sessionId, activeProjectId);
    const history = externalConversationContext
      ? externalConversationContext.slice(-12).flatMap((turn): ConversationTurn[] =>
        turn && (turn.role === "user" || turn.role === "athena") && typeof turn.text === "string" && turn.text.trim()
          ? [{ role: turn.role, text: turn.text.trim().slice(0, 2000), timestamp: new Date().toISOString() }]
          : [])
      : this.sessionHistories.get(sessionId) || [];
    const prompt = rawPrompt.trim();
    const clean = normalizeText(prompt);

    state.messageCount += 1;
    state.lastInteractionAt = new Date().toISOString();

    const lastUserTurn = [...history].reverse().find((h) => h.role === "user");
    const lastAthenaTurn = [...history].reverse().find((h) => h.role === "athena");

    if (/^(nao|não)[, ]|corrigindo|na verdade|quis dizer/.test(prompt.toLowerCase())) {
      state.correctionCount += 1;
    }

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

    // Ellipsis Case E: direct selection of a numbered option just proposed by Athena.
    // This must be resolved before the generic social fallback ("faça a 2 então").
    // Accept the natural forms people actually use: "faça a 2 para mim ver",
    // "2", "opção 2" and even a pasted numbered item from the prior answer.
    const selectedOption = clean.match(/^(?:(?:faca|quero|escolho|manda|gere?)\s+(?:a|o|opcao)?\s*)?(?:numero\s*)?(1|2|3|primeir[oa]?|segund[oa]?|terceir[oa]?)(?:[.)\s].*)?$/);
    if (selectedOption) {
      const token = selectedOption[1];
      const index = token.startsWith("primeir") || token === "1" ? 0 : token.startsWith("segund") || token === "2" ? 1 : 2;
      const selected = state.recentRecommendations?.[index];
      if (selected && clean.split(" ").length <= 24) {
        isEllipsis = true;
        originalReferent = selected;
        resolvedMeaning = `Desenvolver a opção ${index + 1} escolhida pelo usuário: "${selected}"`;
        referencedEntityName = selected;
      }
    }

    // -------------------------------------------------------------
    // 3. SEMANTIC INTERPRETATION LAYER INTEGRATION
    // -------------------------------------------------------------
    const semantic = SemanticInterpretationEngine.interpretSync(clean, prompt, {
      currentProjectId: targetProjectId,
      currentTopic: state.currentTopic,
      recentEntities: state.recentEntities,
      hasPendingSlot: Boolean(state.pendingQuestion),
    });

    const isAnswerToPendingClarification = Boolean(state.pendingQuestion)
      && clean.split(" ").length <= 8
      && !/^(nao|mas|corrigindo|na verdade|quis dizer|eu quis dizer|nao era|nao,)/.test(clean)
      && !/\b(compare|comparar|critique|analise|analisar|explique|explica|resuma|sintetize|recomende|sugira|planeje|crie|criar|quero|preciso|pode|poderia)\b/.test(clean)
      && !/\b(por que|porque|explique|desenvolva|continue|prossiga)\b/.test(clean);
    const candidateProject = isAnswerToPendingClarification
      ? allProjects.find((project) => normalizeText(project.title) === clean)
      : undefined;
    if (isAnswerToPendingClarification) {
      semantic.intent = "CLARIFICATION_RESPONSE";
      semantic.confidence = candidateProject ? 0.95 : 0.8;
      semantic.confidenceLevel = "HIGH";
      semantic.ambiguity = "NONE";
      semantic.requiresClarification = false;
      semantic.clarificationPrompt = undefined;
      semantic.isNoise = false;
      semantic.comprehensionStatus = "UNDERSTOOD";
      semantic.missingInformation = [];
      semantic.trace.selectedIntent = "CLARIFICATION_RESPONSE";
      semantic.trace.confidenceScore = semantic.confidence;
      semantic.trace.confidenceBucket = "HIGH";
      semantic.trace.deterministicSignals.push("PENDING_CLARIFICATION_ANSWER");
      if (candidateProject) {
        targetProjectId = candidateProject.id;
        targetProjectTitle = candidateProject.title;
        referencedEntityName = candidateProject.title;
        state.currentProjectId = candidateProject.id;
        state.currentTopic = candidateProject.title;
      }
      state.pendingQuestion = undefined;
      if (state.clarificationContext) state.clarificationContext.status = "RESOLVED";
    }

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
      /^(mova|mover|exclua|excluir|apague|apagar|remova|remover)\b/.test(clean) ||
      /^(atualize|atualizar|altere|alterar)\b.*\b(projeto|tarefa|prazo|prioridade|status)\b/.test(clean) ||
      /^(arquive|arquivar)\b.*\bprojeto\b/.test(clean) ||
      /^(conclua|concluir|reabra|reabrir)\b.*\b(projeto|tarefa)\b/.test(clean) ||
      /^organize\b.*\bproxim\w*\b.*\btaref\w*\b/.test(clean);
    const isVaultSaveRequest =
      /\b(salvar|salva|salve|guardar|guarda|guarde|arquivar|arquiva|arquive|adicionar|adiciona|adicione)\b/.test(clean) &&
      /\b(vault|livro|arquivo|documento|pdf|obra)\b/.test(clean) &&
      /\bvault\b/.test(clean);
    const isCritiqueRequest =
      clean.includes("critique") || clean.includes("critica") ||
      clean.includes("ponto fraco") || clean.includes("pontos fracos") ||
      clean.includes("ponto cego") || clean.includes("pontos cegos") || clean.includes("riscos");
    const isComparisonRequest =
      clean.includes("compare") || clean.includes("comparar") || clean.includes("diferenca") ||
      clean.includes("vale mais a pena") || clean.includes("versus");
    const isPositiveSlangFeedback = /\b(?:ideia|resultado|trabalho|projeto)\b.{0,12}\bficou\b.{0,8}\b(?:foda|demais|louco|maluco)\b/.test(clean)
      || /\b(?:ideia|resultado|trabalho|projeto)\s+e\s+foda\b/.test(clean)
      || /\bficou\s+foda\b/.test(clean);
    const isAmbiguousSlangFeedback = /\b(?:isso|isto)\s+(?:e|foi)\s+foda\b/.test(clean);
    const isBrainstormRequest =
      (!isPositiveSlangFeedback && !isAmbiguousSlangFeedback) && (clean.includes("ideia") || clean.includes("ideias") || clean.includes("inventar") ||
      clean.includes("brainstorm") || clean.includes("projeto novo") || clean.includes("novo projeto") ||
      clean.includes("que projeto") || clean.includes("qual projeto") ||
      clean.includes("sugira") || clean.includes("sugestao") || clean.includes("recomende") ||
      clean.includes("alguma coisa legal pra comecar") || clean.includes("pensar em"));
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
    const isSelectedRecommendation = Boolean(originalReferent && selectedOption);
    const isUnresolvedDeictic =
      state.recentEntities.length === 0 &&
      !targetProjectId &&
      !isVaultSaveRequest &&
      !isExplicitMutation &&
      !semantic.isNoise &&
      !semantic.trace.pragmaticFlags.includes("EMOTIONAL_VENTING") &&
      !isPositiveSlangFeedback &&
      !isAmbiguousSlangFeedback &&
      !/\b(projeto|maluco|cansado|dificil)\b/.test(clean) &&
      /\b(esse|essa|isso|aquele|aquela|negocio la|coisa la)\b/.test(clean);
    const hasSupportedConversationSignal =
      isSocialCheckIn ||
      isAthenaSelfDiagnostic ||
      isVaultSaveRequest ||
      isExplicitMutation ||
      isCritiqueRequest ||
      isComparisonRequest ||
      isBrainstormRequest ||
      isPlanningRequest ||
      isConditionalFallback ||
      isProjectReadinessQuery ||
      isPendingTargetSelection ||
      isSelectedRecommendation ||
      isPositiveSlangFeedback ||
      isAmbiguousSlangFeedback ||
      isEllipsis;

    if (hasSupportedConversationSignal && !semantic.isNoise) {
      isAmbiguous = false;
      clarificationPrompt = undefined;
    }

    // A. Noise & Uncertainty
    if (isAnswerToPendingClarification) {
      interactionType = "CONVERSATION";
      intents.push("CLARIFICATION_RESPONSE");
      confidence = "HIGH";
      requiresContext = false;
      subject = candidateClarificationSubject(state.pendingQuestion);
      if (candidateProject) {
        targetProjectId = candidateProject.id;
        targetProjectTitle = candidateProject.title;
        referencedEntityName = candidateProject.title;
      }
    }
    else if (isUnresolvedDeictic) {
      interactionType = "CONVERSATION";
      intents.push("CLARIFICATION_REQUIRED");
      confidence = "LOW";
      subject = "UNRESOLVED_REFERENCE";
      isAmbiguous = true;
      clarificationPrompt = "Não tenho um item anterior confiável para associar a essa referência. Qual é o nome do item ou projeto?";
    }
    else if (semantic.isNoise || (semantic.requiresClarification && !hasSupportedConversationSignal)) {
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
    else if (isVaultSaveRequest) {
      interactionType = "CONVERSATION";
      intents.push("CLARIFICATION_REQUIRED");
      confidence = "LOW";
      requiresContext = true;
      subject = "VAULT_ITEM_REQUIRED";
      isAmbiguous = true;
      clarificationPrompt = "Consigo ajudar a colocar o livro no Vault, mas preciso saber qual é o item. Envie ou selecione o arquivo do livro e informe o título; não vou registrar nada antes disso.";
    }
    else if (isExplicitMutation) {
      interactionType = "OPERATIONAL_REQUEST";
      intents.push("EXECUTION_REQUEST");
      confidence = "HIGH";
      requiresAction = true;
      requiresContext = true;
      subject = "DATABASE_MUTATION";
    }
    else if (isPositiveSlangFeedback || isAmbiguousSlangFeedback) {
      interactionType = "CONVERSATION";
      intents.push("SOCIAL_CONVERSATION");
      confidence = "HIGH";
      subject = isPositiveSlangFeedback ? "POSITIVE_FEEDBACK" : "AMBIGUOUS_SLANG_FEEDBACK";
    }
    else if (isConditionalFallback) {
      interactionType = "COGNITIVE_REQUEST";
      intents.push("PLAN");
      confidence = "HIGH";
      requiresContext = true;
      subject = "CONDITIONAL_FALLBACK";
    }
    else if (isProjectReadinessQuery) {
      interactionType = "FACTUAL_QUERY";
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
    else if (isSelectedRecommendation) {
      interactionType = "COGNITIVE_REQUEST";
      intents.push("BRAINSTORM");
      confidence = "HIGH";
      requiresContext = true;
      subject = "SELECTED_RECOMMENDATION";
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
      interactionType = "FACTUAL_QUERY";
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

    const missingInformation = subject === "VAULT_ITEM_REQUIRED"
      ? ["vaultItem"]
      : subject === "UNRESOLVED_REFERENCE"
        ? ["referencedItem"]
        : semantic.missingInformation;
    const comprehensionStatus = subject === "VAULT_ITEM_REQUIRED"
      ? "MISSING_INFORMATION" as const
      : isAmbiguous
        ? (semantic.comprehensionStatus === "UNKNOWN" ? "UNKNOWN" as const : "AMBIGUOUS" as const)
        : semantic.comprehensionStatus;

    if (comprehensionStatus === "UNDERSTOOD") {
      state.lastUnderstoodRequest = prompt;
      state.currentGoal = subject || prompt;
      state.pendingQuestion = undefined;
    } else if (clarificationPrompt) {
      state.pendingQuestion = clarificationPrompt;
    }

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
            previousAssistantText: lastAthenaTurn?.text,
          }
        : undefined,
      isAmbiguous,
      clarificationPrompt,
      semanticInterpretation: semantic,
      comprehensionStatus,
      missingInformation,
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
    // Recommendations are valid only while the latest Athena turn contains them.
    // Keeping an older list here makes a later "por quê?" explain something that
    // was not said in the immediately preceding response.
    state.recentRecommendations = recommendations && recommendations.length > 0
      ? [...recommendations]
      : [];
    if (critiques && critiques.length > 0) {
      state.recentCritiques = critiques;
    }
  }

  getRecentTurns(sessionId: string, limit = 8): ConversationTurn[] {
    const safeLimit = Math.max(0, Math.min(20, Math.floor(limit)));
    return (this.sessionHistories.get(sessionId) || [])
      .slice(-safeLimit)
      .map((turn) => ({ ...turn }));
  }

  updateSessionWithHistory(sessionId: string, messages: AthenaMessage[]): void {
    const state = this.getOrCreateSession(sessionId);
    const relevant = messages.slice(-20);
    this.sessionHistories.set(sessionId, relevant.map((message) => ({
      role: message.sender === "athena" ? "athena" : "user",
      text: message.text,
      timestamp: message.timestamp,
    })));

    // Restore numbered recommendations after a page reload, device switch, or chat selection.
    // Without this, a persisted "faça a 2" loses its referent even though the user can see it.
    const latestAthena = [...relevant].reverse().find((message) => message.sender === "athena");
    state.recentRecommendations = [];
    if (latestAthena) {
      const numbered = [...latestAthena.text.matchAll(/^\s*[1-3]\.\s+\*\*[^:]+:\*\*\s*(.+?)(?:\.)?\s*$/gm)]
        .map((match) => match[1].trim())
        .filter(Boolean);
      if (numbered.length >= 2) state.recentRecommendations = numbered;
    }
    if (messages.length >= 6) {
      state.conversationSummary = sessionSummarizer.summarize(messages);
    }
  }

  clearSession(sessionId: string): void {
    this.sessions.delete(sessionId);
    this.sessionHistories.delete(sessionId);
  }
}

export const athenaConversationManager = new ConversationManager();
