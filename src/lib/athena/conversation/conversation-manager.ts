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
  relevantModule?: "projects" | "tasks" | "vault" | "codex" | "chronos" | "general";
}

export class ConversationManager {
  private sessions: Map<string, ConversationState> = new Map();
  private sessionHistories: Map<string, Array<{ role: "user" | "athena"; text: string }>> = new Map();

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
      this.sessionHistories.set(sessionId, []);
    }
    const state = this.sessions.get(sessionId)!;
    if (currentProjectId && !state.currentProjectId) {
      state.currentProjectId = currentProjectId;
    }
    return state;
  }

  /**
   * Deep multi-layered contextual intent classifier considering conversation history, topic, and persona boundaries.
   */
  processMessage(
    sessionId: string,
    rawPrompt: string,
    allProjects: Project[] = [],
    activeProjectId?: string
  ): ResolvedContext {
    const state = this.getOrCreateSession(sessionId, activeProjectId);
    const history = this.sessionHistories.get(sessionId) || [];
    const prompt = rawPrompt.trim();
    const lower = prompt.toLowerCase().replace(/[.,!?;:]/g, " ");

    state.messageCount += 1;
    state.lastInteractionAt = new Date().toISOString();

    const lastUserMsg = history.filter((h) => h.role === "user").slice(-1)[0]?.text.toLowerCase() || "";
    const lastAthenaMsg = history.filter((h) => h.role === "athena").slice(-1)[0]?.text.toLowerCase() || "";

    let intent: ConversationIntent = "SOCIAL_CONVERSATION";
    let mode: ConversationMode = state.mode || "casual";
    let relevantModule: "projects" | "tasks" | "vault" | "codex" | "chronos" | "general" = "general";

    // 1. Direct Operational Execution Commands (Action Layer)
    const isExecutionCommand =
      lower.startsWith("crie uma tarefa") ||
      lower.startsWith("criar tarefa") ||
      lower.startsWith("nova tarefa") ||
      lower.startsWith("adicione uma tarefa") ||
      lower.startsWith("adicionar tarefa") ||
      lower.startsWith("crie uma nota") ||
      lower.startsWith("criar nota") ||
      lower.startsWith("anote isso") ||
      lower.startsWith("anotar") ||
      lower.startsWith("excluir") ||
      lower.startsWith("apagar") ||
      lower.startsWith("deletar") ||
      lower.startsWith("remover") ||
      lower.includes("mover para a lixeira") ||
      lower.includes("esvaziar lixeira");

    if (isExecutionCommand) {
      intent = "EXECUTION_REQUEST";
      mode = "command";
    }
    // 2. Athena's Own Technical Health & Self-Diagnostic (ATHENA_SELF_STATUS)
    else if (
      lower.includes("voce esta funcionando") || lower.includes("você está funcionando") ||
      lower.includes("como esta seu sistema") || lower.includes("como está seu sistema") ||
      lower.includes("seus modulos estao") || lower.includes("seus módulos estão") ||
      lower.includes("problema na sua memoria") || lower.includes("problema na sua memória") ||
      lower.includes("seu kernel") ||
      lower.includes("sua memoria esta") || lower.includes("sua memória está") ||
      lower.includes("como voce esta rodando") || lower.includes("como você está rodando") ||
      lower.includes("diagnostico da athena") || lower.includes("diagnóstico da athena")
    ) {
      intent = "ATHENA_SELF_STATUS";
      mode = "casual";
    }
    // 3. Brainstorming & Ideation (BRAINSTORM) -> "me dê ideias", "que projeto começar", "o que criar"
    else if (
      lower.includes("ideia") || lower.includes("ideias") ||
      lower.includes("que projeto") || lower.includes("qual projeto") ||
      lower.includes("comecar projeto") || lower.includes("começar projeto") ||
      lower.includes("iniciar projeto") || lower.includes("criar projeto") ||
      lower.includes("o que acha de") || lower.includes("o que você acha de") ||
      lower.includes("sugira") || lower.includes("sugestao") || lower.includes("sugestão") ||
      lower.includes("brainstorm") || lower.includes("o que criar") ||
      lower.includes("me recomende algo") || lower.includes("tema interessante")
    ) {
      intent = "BRAINSTORM";
      mode = "brainstorm";
    }
    // 4. Explicit Ecosystem Briefing Request (ECOSYSTEM_BRIEFING)
    else if (
      lower.includes("me de um briefing") || lower.includes("me dê um briefing") ||
      lower.includes("o que mudou no varynth") || lower.includes("o que mudou nos meus projetos") ||
      lower.includes("o que aconteceu desde a ultima vez") || lower.includes("o que aconteceu desde a última vez") ||
      lower.includes("me atualize sobre minhas coisas") ||
      lower.includes("algo importante que eu deveria saber") ||
      lower.includes("resumo executivo do dia") ||
      ((lastUserMsg.includes("fiquei") && lastUserMsg.includes("sem abrir")) || lastAthenaMsg.includes("coisas para revisar")) &&
      (lower.includes("como estao as coisas") || lower.includes("como estão as coisas") || lower.includes("o que temos"))
    ) {
      intent = "ECOSYSTEM_BRIEFING";
      mode = "casual";
    }
    // 5. Ecosystem & User Data Status (ECOSYSTEM_STATUS)
    else if (
      lower.includes("minha situacao no sistema") || lower.includes("minha situação no sistema") ||
      lower.includes("como estao meus projetos") || lower.includes("como estão meus projetos") ||
      lower.includes("como estao minhas tarefas") || lower.includes("como estão minhas tarefas") ||
      lower.includes("tenho muita coisa pendente") || lower.includes("o que tenho pendente") ||
      lower.includes("quais sao meus prazos") || lower.includes("quais meus prazos") ||
      lower.includes("quando vence") || lower.includes("quais editais") ||
      lower.includes("como esta o varynth") || lower.includes("como está o varynth")
    ) {
      intent = "ECOSYSTEM_STATUS";
      mode = "casual";
      if (lower.includes("tarefa") || lower.includes("pendente")) relevantModule = "tasks";
      else if (lower.includes("projeto")) relevantModule = "projects";
      else if (lower.includes("prazo") || lower.includes("vence")) relevantModule = "chronos";
      else if (lower.includes("edital")) relevantModule = "general";
    }
    // 6. Epistemic & Concept Inquiry (CONCEPT_INQUIRY)
    else if (
      lower.startsWith("o que e ") || lower.startsWith("o que é ") ||
      lower.startsWith("qual e ") || lower.startsWith("qual é ") ||
      lower.startsWith("o que significa ") ||
      lower.includes("voce sabe o que e") || lower.includes("você sabe o que é") ||
      lower.includes("voce sabe o que") || lower.includes("você sabe o que") ||
      lower.includes("me explica ") || lower.includes("me explique ") ||
      lower.includes("latim") || lower.includes("jogo") || lower.includes("hermeneutica") ||
      lower.includes("metodo cientifico") || lower.includes("epistemologia")
    ) {
      intent = "CONCEPT_INQUIRY";
      mode = "casual";
    }
    // 7. Analysis & Review (ANALYSIS)
    else if (
      lower.includes("analisar tese") ||
      lower.includes("analise juridica") ||
      lower.includes("precedente vinculante") ||
      lower.includes("metodologia cientifica") ||
      lower.includes("evidence board")
    ) {
      intent = "ANALYSIS";
      mode = "analysis";
    }
    // 8. Social Conversation directed to Athena's persona (SOCIAL_CONVERSATION)
    else if (
      lower.includes("como voce esta") || lower.includes("como você está") ||
      lower.includes("tudo bem com voce") || lower.includes("tudo bem com você") ||
      lower.includes("tudo bem") || lower.includes("como vai") ||
      lower.includes("e ai athena") || lower.includes("e aí athena") ||
      lower.includes("como anda voce") || lower.includes("como anda você") ||
      lower.includes("sentiu minha falta") ||
      lower.includes("que novidade voce tem") || lower.includes("que novidade você tem") ||
      lower.includes("o que me conta") || lower.includes("o que me diz") ||
      lower === "oi" || lower === "ola" || lower === "olá" ||
      lower.startsWith("ola") || lower.startsWith("olá") || lower.startsWith("oi") ||
      lower.startsWith("bom dia") || lower.startsWith("boa tarde") || lower.startsWith("boa noite") ||
      lower.includes("kkk") || lower.includes("rsrs") || lower.includes("ta foda") || lower.includes("tá foda")
    ) {
      intent = "SOCIAL_CONVERSATION";
      mode = "casual";
    }
    // 9. Ambiguous or General Dialogue
    else {
      intent = "SOCIAL_CONVERSATION";
      mode = "casual";
    }

    state.mode = mode;

    // Record interaction in history
    history.push({ role: "user", text: prompt });
    if (history.length > 20) history.shift();
    this.sessionHistories.set(sessionId, history);

    // Anaphora & Reference Resolution
    let targetProjectId = activeProjectId || state.currentProjectId;
    let targetProjectTitle: string | undefined;
    let isAmbiguousReference = false;
    let ambiguousTerm: string | undefined;

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
      relevantModule,
    };
  }

  recordAssistantResponse(sessionId: string, text: string): void {
    const history = this.sessionHistories.get(sessionId) || [];
    history.push({ role: "athena", text });
    if (history.length > 20) history.shift();
    this.sessionHistories.set(sessionId, history);
  }

  updateSessionWithHistory(sessionId: string, messages: AthenaMessage[]): void {
    const state = this.getOrCreateSession(sessionId);
    if (messages.length >= 6) {
      state.conversationSummary = sessionSummarizer.summarize(messages);
    }
  }
}

export const athenaConversationManager = new ConversationManager();
