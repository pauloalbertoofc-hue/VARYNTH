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
import { athenaInteractionContractRouter } from "./kernel/interaction-contract-router";
import { decisionForContract, InteractionContractDecision } from "./domain/interaction-contract";
import { athenaInteractionContractGateway } from "./runtime/interaction-contract-gateway";
import { athenaCapabilitySelector } from "./kernel/capability-selector";
import type { CapabilitySelectionResult } from "./domain/capability-selection";
import { capabilityPlanBuilder } from "./runtime/capability-plan-builder";
import { capabilityPlanRuntime } from "./runtime/capability-plan-runtime";
import { athenaObservabilityJournal } from "./observability/local-observability-journal";

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
  deleteNote?: (id: string, actorType?: "user" | "athena" | "system") => unknown;
}

function withContractMetadata(
  response: AthenaMessage,
  decision: InteractionContractDecision
): AthenaMessage {
  return {
    ...response,
    metadata: {
      ...response.metadata,
      interactionContract: decision.contract,
      contractReason: decision.reason,
    },
  };
}

function tryLegacyGateway(
  prompt: string,
  scope: AthenaScope,
  ctx: AthenaEngineContext,
  targetProjectId: string | undefined,
  sessionId: string
): AthenaMessage | undefined {
  const handlers: Array<{
    decision: InteractionContractDecision;
    handle: () => AthenaMessage | undefined;
  }> = [
    {
      decision: decisionForContract("USE_TOOL", "legacy.project-plan-manager"),
      handle: () => athenaProjectPlanManager.tryHandle(prompt, scope, ctx, targetProjectId),
    },
    {
      decision: decisionForContract("USE_TOOL", "legacy.project-operations"),
      handle: () => athenaProjectOperations.tryHandle(prompt, scope, ctx, targetProjectId, sessionId),
    },
    {
      decision: decisionForContract("USE_TOOL", "legacy.contextual-memory"),
      handle: () => athenaContextualMemory.tryHandle(prompt, scope, ctx, targetProjectId, sessionId),
    },
    {
      decision: decisionForContract("ANSWER_SELF", "legacy.global-intelligence"),
      handle: () => athenaGlobalIntelligence.tryHandle(prompt, scope, ctx, targetProjectId),
    },
  ];

  for (const handler of handlers) {
    const response = athenaInteractionContractGateway.execute(handler.decision, handler.handle);
    if (response) return withContractMetadata(response, handler.decision);
  }
  return undefined;
}

function hasCanonicalCapabilityPath(prompt: string): boolean {
  const normalized = prompt.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  return /^(crie|criar|adicione|adicionar|nova)\s+(uma\s+)?tarefa\b/.test(normalized) ||
    /^(crie|criar|adicione|adicionar)\s+(uma\s+)?nota\b/.test(normalized) ||
    /^(anote|anotar)(\s+isso)?\b/.test(normalized);
}

function selectAgentCapability(
  prompt: string,
  scope: AthenaScope,
  ctx: AthenaEngineContext,
  targetProjectId?: string
): CapabilitySelectionResult {
  const task = athenaPerceptionEngine.perceive(prompt, scope, targetProjectId);
  const context = athenaContextBuilder.buildContext(task, scope, ctx, targetProjectId);
  return athenaCapabilitySelector.select({ kind: "AGENT", task, context });
}

function capabilityClarification(
  selection: CapabilitySelectionResult,
  scope: AthenaScope,
  decision: InteractionContractDecision
): AthenaMessage {
  return {
    id: `ath-capability-${Date.now()}`,
    sender: "athena",
    text: selection.clarificationPrompt || "Não encontrei uma capacidade segura e inequívoca para este pedido. Especifique o domínio ou o resultado esperado.",
    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    scope,
    metadata: {
      interactionContract: decision.contract,
      capabilitySelectionStatus: selection.status,
      capabilitySelectionReason: selection.reason,
      capabilityCandidates: selection.candidates,
    },
  };
}

function resolveExecutionProjectId(
  prompt: string,
  parsedProjectId: string | undefined,
  explicitProjectId: string | undefined
): string | undefined {
  if (explicitProjectId) return parsedProjectId || explicitProjectId;
  const normalized = prompt.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const explicitlyGlobal =
    /\b(quantos|quais|todos|todas)\s+(os\s+|as\s+)?projetos\b/.test(normalized) ||
    normalized.includes("projetos ativos") ||
    normalized.includes("meus projetos");
  return explicitlyGlobal ? undefined : parsedProjectId;
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
  const legacyResponse = hasCanonicalCapabilityPath(prompt)
    ? undefined
    : tryLegacyGateway(prompt, scope, ctx, targetProjectId, sessionId);
  if (legacyResponse) return legacyResponse;

  // 1. Contextual Perception & Intent Composition
  const parsed = athenaConversationManager.processMessage(
    sessionId,
    prompt,
    ctx.projects,
    targetProjectId
  );
  const contractDecision = athenaInteractionContractRouter.route(parsed);

  const resolvedProjectId = resolveExecutionProjectId(
    prompt,
    parsed.resolvedEntities.targetProjectId,
    targetProjectId
  );
  athenaObservabilityJournal.record({ category: "CONTRACT", type: "REQUEST_CONTEXT", status: "ROUTED", contract: contractDecision.contract, message: contractDecision.reason, sessionId, projectId: resolvedProjectId, details: { sourceInteractionType: contractDecision.sourceInteractionType, confidence: contractDecision.confidence } });
  const capabilitySelection = contractDecision.contract === "USE_AGENT"
    ? selectAgentCapability(prompt, scope, ctx, resolvedProjectId)
    : undefined;
  if (capabilitySelection && capabilitySelection.status !== "SELECTED") {
    return capabilityClarification(capabilitySelection, scope, contractDecision);
  }
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
  if (contractDecision.contract === "USE_TOOL") {
    athenaInteractionContractRouter.require(contractDecision, "USE_TOOL");
    return athenaInteractionContractGateway.executeAsync(
      contractDecision,
      async () => withContractMetadata(
        await processCapabilityPlanAsync(prompt, scope, ctx, resolvedProjectId),
        contractDecision
      )
    );
  }

  // 5. COGNITIVE PATH via Local Neural Engine (when Ollama is active on 127.0.0.1:11434)
  const isOllamaOnline = await ollamaAdapter.isAvailable();
  if (isOllamaOnline && ollamaAdapter.activeModel && contractDecision.contract === "USE_AGENT") {
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

      const modelResponse = await athenaInteractionContractGateway.executeAsync(
        contractDecision,
        () => ollamaAdapter.generate({ systemPrompt, userPrompt: prompt, contextData, temperature: 0.7 })
      );

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
                interactionContract: contractDecision.contract,
                selectedCapability: capabilitySelection?.selected?.id,
                capabilitySelectionReason: capabilitySelection?.reason,
                capabilityCandidates: capabilitySelection?.candidates,
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
  const result = athenaInteractionContractGateway.execute(
    contractDecision,
    () => athenaPersonaEngine.generateDialogueResponse(
      prompt, parsed, activeProj?.title, ctx, responseIntent, sessionId
    )
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
        interactionContract: contractDecision.contract,
        selectedCapability: capabilitySelection?.selected?.id,
        capabilitySelectionReason: capabilitySelection?.reason,
        capabilityCandidates: capabilitySelection?.candidates,
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
  const legacyResponse = hasCanonicalCapabilityPath(prompt)
    ? undefined
    : tryLegacyGateway(prompt, scope, ctx, targetProjectId, sessionId);
  if (legacyResponse) return legacyResponse;
  const parsed = athenaConversationManager.processMessage(
    sessionId,
    prompt,
    ctx.projects,
    targetProjectId
  );
  const contractDecision = athenaInteractionContractRouter.route(parsed);

  const resolvedProjectId = resolveExecutionProjectId(
    prompt,
    parsed.resolvedEntities.targetProjectId,
    targetProjectId
  );
  athenaObservabilityJournal.record({ category: "CONTRACT", type: "REQUEST_CONTEXT", status: "ROUTED", contract: contractDecision.contract, message: contractDecision.reason, sessionId, projectId: resolvedProjectId, details: { sourceInteractionType: contractDecision.sourceInteractionType, confidence: contractDecision.confidence } });
  const capabilitySelection = contractDecision.contract === "USE_AGENT"
    ? selectAgentCapability(prompt, scope, ctx, resolvedProjectId)
    : undefined;
  if (capabilitySelection && capabilitySelection.status !== "SELECTED") {
    return capabilityClarification(capabilitySelection, scope, contractDecision);
  }
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

  if (contractDecision.contract === "USE_TOOL") {
    athenaInteractionContractRouter.require(contractDecision, "USE_TOOL");
    return athenaInteractionContractGateway.execute(
      contractDecision,
      () => withContractMetadata(processDeterministicWorkflow(prompt, scope, ctx, resolvedProjectId), contractDecision)
    );
  }

  const activeProj = resolvedProjectId ? ctx.projects.find((p) => p.id === resolvedProjectId) : undefined;
  const result = athenaInteractionContractGateway.execute(
    contractDecision,
    () => athenaPersonaEngine.generateDialogueResponse(
      prompt, parsed, activeProj?.title, ctx, responseIntent, sessionId
    )
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
    metadata: {
      interactionContract: contractDecision.contract,
      interactionType: parsed.interactionType,
      selectedCapability: capabilitySelection?.selected?.id,
      capabilitySelectionReason: capabilitySelection?.reason,
      capabilityCandidates: capabilitySelection?.candidates,
    },
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
  const capabilityPlan = capabilityPlanBuilder.approve(
    capabilityPlanBuilder.build(task, workflow, context),
    "POLICY"
  );

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

  const response = athenaResponseBuilder.buildResponse(
    task,
    context,
    workflowResult,
    deliberationResult
  );
  response.metadata = {
    ...response.metadata,
    capabilityPlanId: capabilityPlan.id,
    capabilityPlanHash: capabilityPlan.planHash,
    capabilityPlanStatus: capabilityPlan.status,
    capabilityPlanSteps: capabilityPlan.steps,
  };
  return response;
}

async function processCapabilityPlanAsync(
  prompt: string,
  scope: AthenaScope,
  ctx: AthenaEngineContext,
  resolvedProjectId?: string
): Promise<AthenaMessage> {
  const task = athenaPerceptionEngine.perceive(prompt, scope, resolvedProjectId);
  const context = athenaContextBuilder.buildContext(task, scope, ctx, resolvedProjectId);
  const workflow = athenaWorkflowBuilder.build(task);
  const planned = capabilityPlanBuilder.build(task, workflow, context);
  const approved = capabilityPlanBuilder.approve(planned, "POLICY");
  capabilityPlanRuntime.register(approved);
  const execution = await capabilityPlanRuntime.execute(approved.id, context, ctx);
  const response = athenaResponseBuilder.buildResponse(
    task,
    context,
    execution.workflowResult,
    undefined
  );
  response.metadata = {
    ...response.metadata,
    capabilityPlanId: execution.plan.id,
    capabilityPlanHash: execution.plan.planHash,
    capabilityPlanStatus: execution.plan.status,
    capabilityPlanSummary: execution.summary,
    capabilityPlanSteps: execution.plan.steps,
  };
  return response;
}
