import {
  AthenaMessage,
  AthenaScope,
  AthenaActionCard,
  Project,
  Task,
  VaultItem,
  ChronosEvent,
  ArgumentThesis,
  EvidenceItem,
  Opportunity,
  Note,
} from "../types";
import { athenaPerceptionEngine } from "./kernel/perception";
import { athenaContextBuilder } from "./memory/context-builder";
import { athenaWorkflowBuilder } from "./runtime/workflow-builder";
import { athenaResponseBuilder } from "./kernel/response-builder";
import { athenaConversationManager } from "./conversation/conversation-manager";
import { athenaPersonaEngine } from "./persona/persona-engine";
import { ollamaAdapter } from "./models/providers/ollama-adapter";
import { athenaToolManager } from "./tools/tool-manager";
import { responseCompletenessValidator } from "./conversation/completeness-validator";
import { InteractionDebugInfo } from "./domain/conversation";
import { AthenaResponseStrategyEngine } from "./strategy/response-strategy-engine";
import { FactLockValidator } from "./strategy/fact-lock-validator";
import { SemanticInterpretation } from "./semantic/types";
import { athenaProjectOperations } from "./operations/project-operations";
import { athenaGlobalIntelligence } from "./insights/global-intelligence";
import { athenaContextualMemory } from "./memory/contextual-memory";
import { athenaProjectPlanManager } from "./planning/project-plan-manager";

export interface AthenaEngineContext {
  projects: Project[];
  tasks: Task[];
  vaultItems: VaultItem[];
  chronosEvents: ChronosEvent[];
  theses: ArgumentThesis[];
  evidences: EvidenceItem[];
  opportunities: Opportunity[];
  notes?: Note[];
  addTask: (taskData: Omit<Task, "id" | "createdAt">, actorType?: "user" | "athena" | "system") => Task;
  addNote: (noteData: { title: string; content: string; projectId?: string; tags: string[]; pinned?: boolean }, actorType?: "user" | "athena" | "system") => unknown;
  updateProject?: (id: string, updates: Partial<Project>, actorType?: "user" | "athena" | "system") => void;
  deleteProject?: (id: string, actorType?: "user" | "athena" | "system") => { id: string } | void;
  restoreFromTrash?: (trashId: string, actorType?: "user" | "athena" | "system") => unknown;
  toggleTask?: (id: string, actorType?: "user" | "athena" | "system") => void;
  updateTask?: (id: string, updates: Partial<Task>, actorType?: "user" | "athena" | "system") => void;
  deleteTask?: (id: string, actorType?: "user" | "athena" | "system") => unknown;
}

function alignSemanticWithConversationIntent(
  semantic: SemanticInterpretation,
  parsed: ReturnType<typeof athenaConversationManager.processMessage>
): SemanticInterpretation {
  let intent = semantic.intent;

  if (parsed.intents.includes("ATHENA_SELF_STATUS")) intent = "ATHENA_SELF_STATUS";
  else if (parsed.intents.includes("ECOSYSTEM_BRIEFING")) intent = "ECOSYSTEM_BRIEFING";
  else if (parsed.intents.includes("ECOSYSTEM_STATUS")) intent = "ECOSYSTEM_STATUS";
  else if (parsed.intents.includes("EXECUTION_REQUEST")) intent = "EXECUTION_REQUEST";
  else if (parsed.intents.includes("SOCIAL_CONVERSATION")) intent = "SOCIAL_CONVERSATION";
  else if (
    parsed.intents.includes("BRAINSTORM") ||
    parsed.intents.includes("RECOMMEND") ||
    parsed.intents.includes("PLAN")
  ) intent = "CREATIVE_INTENT";
  else if (
    parsed.intents.includes("CRITIQUE") ||
    parsed.intents.includes("COMPARE") ||
    parsed.intents.includes("EXPLAIN") ||
    parsed.intents.includes("ANALYZE")
  ) intent = "EPISTEMIC_QUERY";

  if (intent === semantic.intent) return semantic;

  return {
    ...semantic,
    intent,
    confidence: parsed.confidence === "HIGH" ? 0.95 : semantic.confidence,
    confidenceLevel: parsed.confidence,
    ambiguity: "NONE",
    requiresClarification: false,
    clarificationPrompt: undefined,
  };
}

/**
 * High-level async facade for Athena Cognitive Kernel with 3-Path Contextual Execution.
 */
export async function processAthenaQueryAsync(
  rawPrompt: string,
  scope: AthenaScope,
  ctx: AthenaEngineContext,
  targetProjectId?: string,
  sessionId = "default-session"
): Promise<AthenaMessage> {
  const prompt = rawPrompt.trim();

  const projectPlanResponse = athenaProjectPlanManager.tryHandle(prompt, scope, ctx, targetProjectId);
  if (projectPlanResponse) return projectPlanResponse;

  const operationalResponse = athenaProjectOperations.tryHandle(
    prompt,
    scope,
    ctx,
    targetProjectId,
    sessionId
  );
  if (operationalResponse) return operationalResponse;

  const memoryResponse = athenaContextualMemory.tryHandle(prompt, scope, ctx, targetProjectId, sessionId);
  if (memoryResponse) return memoryResponse;

  const intelligenceResponse = athenaGlobalIntelligence.tryHandle(
    prompt,
    scope,
    ctx,
    targetProjectId
  );
  if (intelligenceResponse) return intelligenceResponse;

  // 1. Contextual Perception & Intent Composition
  const parsed = athenaConversationManager.processMessage(
    sessionId,
    prompt,
    ctx.projects,
    targetProjectId
  );

  const resolvedProjectId = parsed.resolvedEntities.targetProjectId || targetProjectId;
  const sessionState = athenaConversationManager.getOrCreateSession(sessionId);
  const semantic: SemanticInterpretation = parsed.semanticInterpretation || {
    intent: (parsed.intents[0] as any) || "SOCIAL_CONVERSATION",
    confidence: parsed.confidence === "HIGH" ? 0.95 : 0.7,
    confidenceLevel: parsed.confidence,
    polarity: "AFFIRMATIVE",
    isNoise: false,
    ambiguity: parsed.isAmbiguous ? "SEMANTIC" : "NONE",
    requiresClarification: Boolean(parsed.isAmbiguous),
    clarificationPrompt: parsed.clarificationPrompt,
    slots: {},
    candidateScores: [],
    margin: 1.0,
    semanticSource: "DETERMINISTIC",
    trace: {
      timestamp: new Date().toISOString(),
      rawPrompt: prompt,
      normalizedText: prompt.toLowerCase(),
      deterministicSignals: [],
      pragmaticFlags: [],
      similarityTopCandidates: [],
      selectedIntent: (parsed.intents[0] as any) || "SOCIAL_CONVERSATION",
      confidenceScore: 0.9,
      confidenceBucket: parsed.confidence,
      semanticSource: "DETERMINISTIC",
      margin: 1.0,
    },
  };

  // 2. Response Strategy Layer (Plans structured response intent grounded in real state)
  const strategySemantic = alignSemanticWithConversationIntent(semantic, parsed);
  const responseIntent = AthenaResponseStrategyEngine.plan(
    strategySemantic,
    sessionState,
    ctx,
    scope,
    resolvedProjectId,
    prompt
  );

  // 3. Ambiguity & Clarification Handling
  if (responseIntent.mode === "CLARIFICATION" || (parsed.isAmbiguous && parsed.clarificationPrompt)) {
    const clarResult = athenaPersonaEngine.generateDialogueResponse(
      prompt,
      parsed,
      undefined,
      ctx,
      responseIntent,
      sessionId
    );
    return {
      id: "ath-" + Date.now(),
      sender: "athena",
      text: clarResult.text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      scope,
    };
  }

  // 4. OPERATIONAL PATH: System Mutation Commands
  if (parsed.interactionType === "OPERATIONAL_REQUEST") {
    return processDeterministicWorkflow(prompt, scope, ctx, resolvedProjectId);
  }

  // 5. COGNITIVE PATH via Local Neural Engine (when Ollama is active on 127.0.0.1:11434)
  const isOllamaOnline = await ollamaAdapter.isAvailable();
  if (isOllamaOnline && ollamaAdapter.activeModel && parsed.interactionType === "COGNITIVE_REQUEST") {
    try {
      const activeProj = resolvedProjectId ? ctx.projects.find((p) => p.id === resolvedProjectId) : undefined;
      const contextData = {
        activeProject: activeProj ? { title: activeProj.title, category: activeProj.category, status: activeProj.status } : null,
        recentTasks: ctx.tasks.slice(0, 5).map((t) => ({ title: t.title, priority: t.priority })),
        upcomingDeadlines: ctx.projects.filter((p) => p.deadline).slice(0, 3).map((p) => ({ title: p.title, deadline: p.deadline })),
        keyFacts: responseIntent.keyFacts,
        responseMode: responseIntent.mode,
        responseTone: responseIntent.tone,
      };

      const systemPrompt = `Você é a Athena, a inteligência artificial cognitiva e copilot digital central do VARYNTH OS.
Você é perspicaz, empática, articulada, dialética e profunda. Responda em português do Brasil com o Princípio de Resposta Direta (responda primeiro ao que foi pedido sem rodeios).
Respeite estritamente os fatos fornecidos em keyFacts. Você está conversando com o Paulo, criador do VARYNTH OS.`;

      const modelResponse = await ollamaAdapter.generate({
        systemPrompt,
        userPrompt: prompt,
        contextData,
        temperature: 0.7,
      });

      if (modelResponse.content && modelResponse.content.trim().length > 0) {
        const candidateReply = modelResponse.content.trim();
        const factLockCheck = FactLockValidator.validate(candidateReply, responseIntent);

        if (factLockCheck.isValid) {
          athenaConversationManager.recordAssistantResponse(sessionId, candidateReply);

          return {
            id: "ath-" + Date.now(),
            sender: "athena",
            text: candidateReply,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            scope,
            metadata: {
              engine: "ollama-local",
              model: ollamaAdapter.activeModel,
              debug: {
                interactionType: parsed.interactionType,
                detectedIntents: parsed.intents,
                resolvedSubject: parsed.subject,
                contextUsed: ["Projects", "Tasks", "Vault", "Chronos"],
                confidence: parsed.confidence,
                selectedPath: "COGNITIVE_PATH",
                ellipsisResolved: parsed.ellipsisResolved?.isEllipsis,
              } as InteractionDebugInfo,
            },
          };
        }
      }
    } catch {
      // Fallback seamlessly to deterministic Persona
    }
  }

  // 6. DETERMINISTIC COGNITIVE / FAST CONVERSATION PATH (0 ms, 100% offline)
  const activeProj = resolvedProjectId ? ctx.projects.find((p) => p.id === resolvedProjectId) : undefined;
  const result = athenaPersonaEngine.generateDialogueResponse(
    prompt,
    parsed,
    activeProj?.title,
    ctx,
    responseIntent,
    sessionId
  );

  // Validate Completeness
  responseCompletenessValidator.validate(parsed, result.text);

  // Record in History for future turns / ellipses
  athenaConversationManager.recordAssistantResponse(
    sessionId,
    result.text,
    result.recommendations,
    result.critiques
  );

  return {
    id: "ath-" + Date.now(),
    sender: "athena",
    text: result.text,
    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    scope,
    metadata: {
      engine: "deterministic-core",
      debug: {
        interactionType: parsed.interactionType,
        detectedIntents: parsed.intents,
        resolvedSubject: parsed.subject,
        contextUsed: parsed.requiresContext ? ["Projects", "Tasks", "Vault", "Codex"] : [],
        confidence: parsed.confidence,
        selectedPath: parsed.interactionType === "CONVERSATION" ? "FAST_CONVERSATION_PATH" : "COGNITIVE_PATH",
        ellipsisResolved: parsed.ellipsisResolved?.isEllipsis,
      } as InteractionDebugInfo,
    },
  };
}

/**
 * Synchronous backward-compatible entry point
 */
export function processAthenaQuery(
  rawPrompt: string,
  scope: AthenaScope,
  ctx: AthenaEngineContext,
  targetProjectId?: string,
  sessionId = "default-session"
): AthenaMessage {
  const prompt = rawPrompt.trim();
  const projectPlanResponse = athenaProjectPlanManager.tryHandle(prompt, scope, ctx, targetProjectId);
  if (projectPlanResponse) return projectPlanResponse;
  const operationalResponse = athenaProjectOperations.tryHandle(
    prompt,
    scope,
    ctx,
    targetProjectId,
    sessionId
  );
  if (operationalResponse) return operationalResponse;
  const memoryResponse = athenaContextualMemory.tryHandle(prompt, scope, ctx, targetProjectId, sessionId);
  if (memoryResponse) return memoryResponse;
  const intelligenceResponse = athenaGlobalIntelligence.tryHandle(
    prompt,
    scope,
    ctx,
    targetProjectId
  );
  if (intelligenceResponse) return intelligenceResponse;
  const parsed = athenaConversationManager.processMessage(
    sessionId,
    prompt,
    ctx.projects,
    targetProjectId
  );

  const resolvedProjectId = parsed.resolvedEntities.targetProjectId || targetProjectId;
  const sessionState = athenaConversationManager.getOrCreateSession(sessionId);
  const semantic: SemanticInterpretation = parsed.semanticInterpretation || {
    intent: (parsed.intents[0] as any) || "SOCIAL_CONVERSATION",
    confidence: parsed.confidence === "HIGH" ? 0.95 : 0.7,
    confidenceLevel: parsed.confidence,
    polarity: "AFFIRMATIVE",
    isNoise: false,
    ambiguity: parsed.isAmbiguous ? "SEMANTIC" : "NONE",
    requiresClarification: Boolean(parsed.isAmbiguous),
    clarificationPrompt: parsed.clarificationPrompt,
    slots: {},
    candidateScores: [],
    margin: 1.0,
    semanticSource: "DETERMINISTIC",
    trace: {
      timestamp: new Date().toISOString(),
      rawPrompt: prompt,
      normalizedText: prompt.toLowerCase(),
      deterministicSignals: [],
      pragmaticFlags: [],
      similarityTopCandidates: [],
      selectedIntent: (parsed.intents[0] as any) || "SOCIAL_CONVERSATION",
      confidenceScore: 0.9,
      confidenceBucket: parsed.confidence,
      semanticSource: "DETERMINISTIC",
      margin: 1.0,
    },
  };

  const strategySemantic = alignSemanticWithConversationIntent(semantic, parsed);
  const responseIntent = AthenaResponseStrategyEngine.plan(
    strategySemantic,
    sessionState,
    ctx,
    scope,
    resolvedProjectId,
    prompt
  );

  if (responseIntent.mode === "CLARIFICATION" || (parsed.isAmbiguous && parsed.clarificationPrompt)) {
    const clarResult = athenaPersonaEngine.generateDialogueResponse(
      prompt,
      parsed,
      undefined,
      ctx,
      responseIntent,
      sessionId
    );
    return {
      id: "ath-" + Date.now(),
      sender: "athena",
      text: clarResult.text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      scope,
    };
  }

  if (parsed.interactionType === "OPERATIONAL_REQUEST") {
    return processDeterministicWorkflow(prompt, scope, ctx, resolvedProjectId);
  }

  const activeProj = resolvedProjectId ? ctx.projects.find((p) => p.id === resolvedProjectId) : undefined;
  const result = athenaPersonaEngine.generateDialogueResponse(
    prompt,
    parsed,
    activeProj?.title,
    ctx,
    responseIntent,
    sessionId
  );

  athenaConversationManager.recordAssistantResponse(
    sessionId,
    result.text,
    result.recommendations,
    result.critiques
  );

  return {
    id: "ath-" + Date.now(),
    sender: "athena",
    text: result.text,
    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    scope,
  };
}

function processDeterministicWorkflow(
  prompt: string,
  scope: AthenaScope,
  ctx: AthenaEngineContext,
  resolvedProjectId?: string
): AthenaMessage {
  const task = athenaPerceptionEngine.perceive(prompt, scope, resolvedProjectId);
  const context = athenaContextBuilder.buildContext(task, scope, ctx, resolvedProjectId);
  const workflow = athenaWorkflowBuilder.build(task);

  let workflowResult: any = undefined;
  try {
    const stepResults: Record<string, unknown> = {};
    const agentResults: any[] = [];
    const toolOutputs: Record<string, unknown> = {};

    for (const step of workflow.steps) {
      if (step.toolCall) {
        const res = athenaToolManager.executeTool(
          step.toolCall.toolName as any,
          step.toolCall.params,
          ctx,
          task.id
        );
        // Handle sync or async tool result
        if (res instanceof Promise) {
          // If sync facade, we await safely when async
          res.then((r) => {
            toolOutputs[step.id] = r;
          });
        } else {
          toolOutputs[step.id] = res;
        }
      }
    }

    workflowResult = {
      workflowId: workflow.id,
      success: true,
      stepResults,
      agentResults,
      toolOutputs,
    };
  } catch {
    // ignore
  }

  let deliberationResult: any = undefined;
  if (task.type === "LEGAL_ANALYSIS") {
    const thesis = ctx.theses[0];
    deliberationResult = {
      participatingAgents: ["justitia", "critias"],
      consensusSummary: thesis
        ? `⚖️ **Deliberação Jurídica do Conselho (Justitia + Critias):**\n\nNa tese **"${thesis.title}"** (Área: ${thesis.area}):\n> Controvérsia: *"${thesis.question}"*\n\n• **Fundamentação Pró:** ${thesis.pros.map((p) => p.statement).join("; ") || "Aguardando cadastro"}\n• **Objeções & Riscos (Critias):** ${thesis.cons.map((c) => c.statement).join("; ") || "Nenhum risco apontado"}\n• **Precedentes STF/STJ:** ${thesis.precedents.join(", ") || "Nenhum precedente vinculado"}`
        : `⚖️ **Conselho Jurídico (Justitia):** Nenhuma tese formal está cadastrada na Argument Arena no momento. Cadastre a controvérsia jurídica para iniciarmos a análise dialética de precedentes.`,
    };
  } else if (task.type === "RESEARCH_SYNTHESIS") {
    const evCount = ctx.evidences.length;
    const strongEvs = ctx.evidences.filter((e) => e.strength === "forte");
    deliberationResult = {
      participatingAgents: ["logos", "critias"],
      consensusSummary:
        evCount > 0
          ? `🔬 **Investigação Científica do Conselho (Logos + Critias):**\n\nLocalizamos **${evCount} evidências empíricas** no Evidence Board (${strongEvs.length} de alta força probatória).\n\n${strongEvs.length > 0 ? `📌 Evidência Principal:\n> *"${strongEvs[0].claim}"*\n> *(Fonte: ${strongEvs[0].source})*\n\n` : ""}• **Diretriz de Validação (Critias):** Fontes primárias verificadas. Recomenda-se triangular os dados com o acervo do Vault.`
          : `🔬 **Conselho Científico (Logos):** Nenhuma evidência bibliográfica cadastrada ainda no Evidence Board. Cadastre fontes no módulo Research para validação empírica.`,
    };
  }

  return athenaResponseBuilder.buildResponse(
    task,
    context,
    workflowResult,
    deliberationResult
  );
}
