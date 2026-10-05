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
import { athenaInteractionContractRouter } from "./kernel/interaction-contract-router";
import { decisionForContract, InteractionContractDecision } from "./domain/interaction-contract";
import { athenaInteractionContractGateway } from "./runtime/interaction-contract-gateway";
import { athenaCapabilitySelector } from "./kernel/capability-selector";
import type { CapabilitySelectionResult } from "./domain/capability-selection";
import { capabilityPlanBuilder } from "./runtime/capability-plan-builder";
import { capabilityPlanRuntime } from "./runtime/capability-plan-runtime";
import { capabilityPlanStore } from "./runtime/capability-plan-store";
import { athenaObservabilityJournal } from "./observability/local-observability-journal";
import { processStudioConversation } from "./conversation/studio-continuity";
import { athenaConversationFeedback } from "./conversation/quality-feedback";
import { buildExperienceContext } from "@/lib/experience/context-builder";
import { applyConfirmedCommunicationStyle } from "@/lib/experience/communication-style";

export interface AthenaEngineContext {
  experienceOwnerId?: string;
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
  deleteTask?: (id: string, actorType?: "user" | "athena" | "system") => { id: string } | void;
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

function operationalMessage(text: string, scope: AthenaScope, plan?: import("./domain/capability-plan").CapabilityExecutionPlan): AthenaMessage {
  return {
    id: `ath-plan-control-${Date.now()}`,
    sender: "athena",
    text,
    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    scope,
    metadata: plan ? { capabilityPlanId: plan.id, capabilityPlanHash: plan.planHash, capabilityPlanStatus: plan.status } : undefined,
  };
}

function enforceResponseQuality(
  prompt: string,
  parsed: import("./domain/conversation").ParsedCognitiveContext,
  candidate: string,
  sessionId: string,
  projectId?: string
): string {
  const validation = responseCompletenessValidator.validate(parsed, candidate);
  if (validation.isComplete) return candidate;

  athenaObservabilityJournal.record({
    category: "SYSTEM",
    type: "CONVERSATION_RESPONSE_REPAIRED",
    status: "INFO",
    message: "Uma resposta incompleta ou genérica foi bloqueada antes do envio.",
    sessionId,
    projectId,
    details: {
      prompt,
      comprehensionStatus: parsed.comprehensionStatus,
      missingAspects: validation.missingAspects,
    },
  });

  if (parsed.clarificationPrompt) return parsed.clarificationPrompt;
  if ((parsed.missingInformation ?? []).length > 0) {
    return `Entendi a direção do pedido, mas ainda falta **${(parsed.missingInformation ?? []).join(", ")}**. Pode informar esse dado para eu continuar sem adivinhar?`;
  }
  return "Não consegui montar uma resposta suficientemente confiável para esse pedido. Diga em uma frase qual resultado você espera; vou responder diretamente a partir disso.";
}

async function tryCanonicalPlanControl(
  prompt: string,
  scope: AthenaScope,
  ctx: AthenaEngineContext,
  sessionId: string,
  projectId?: string
): Promise<AthenaMessage | undefined> {
  const clean = prompt.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const isConfirm = /^(confirmo|confirmar|pode executar|pode fazer|sim,? execute|sim,? pode)$/.test(clean);
  const isCancel = /^(cancelar|cancele|nao execute|nao,? cancela)$/.test(clean);
  const isUndo = /^(desfazer|desfaca|desfaz|undo)( a ultima acao| ultima acao)?$/.test(clean);
  if (!isConfirm && !isCancel && !isUndo) return undefined;

  const plans = capabilityPlanStore.list().filter((plan) => plan.sessionId === sessionId && (!projectId || !plan.projectId || plan.projectId === projectId));
  if (isConfirm) {
    let plan = plans.find((candidate) => ["PLANNED", "APPROVED", "BLOCKED", "PAUSED", "INTERRUPTED"].includes(candidate.status));
    if (!plan) return operationalMessage("Não há nenhum plano persistido aguardando confirmação nesta conversa.", scope);
    if (["BLOCKED", "PAUSED", "INTERRUPTED"].includes(plan.status)) plan = capabilityPlanRuntime.resume(plan.id);
    if (plan.status === "PLANNED") {
      plan = capabilityPlanBuilder.approve(plan, "HUMAN");
      capabilityPlanRuntime.register(plan);
    }
    for (const step of plan.steps.filter((candidate) => candidate.requiresConfirmation && candidate.status !== "COMPLETED")) {
      plan = capabilityPlanRuntime.confirmStep(plan.id, step.id);
    }
    const context = athenaContextBuilder.buildContext(plan.sourceTask, scope, ctx, plan.projectId);
    const result = await capabilityPlanRuntime.execute(plan.id, context, ctx);
    return operationalMessage(result.summary.message, scope, result.plan);
  }

  if (isCancel) {
    const plan = plans.find((candidate) => ["PLANNED", "APPROVED", "BLOCKED", "PAUSED", "INTERRUPTED", "PARTIAL", "FAILED"].includes(candidate.status));
    if (!plan) return operationalMessage("Não há nenhum plano persistido que possa ser cancelado nesta conversa.", scope);
    const cancelled = capabilityPlanRuntime.cancel(plan.id);
    return operationalMessage("Plano cancelado. Nenhuma nova etapa será executada; resultados já concluídos foram preservados.", scope, cancelled);
  }

  const plan = plans.find((candidate) => ["COMPLETED", "PARTIAL", "FAILED", "CANCELLED"].includes(candidate.status) && candidate.steps.some((step) => step.status === "COMPLETED" && step.authority === "MUTATE_GOVERNED"));
  if (!plan) return operationalMessage("Não há uma alteração reversível persistida nesta conversa.", scope);
  try {
    const reverted = await capabilityPlanRuntime.revertWithRegisteredUndo(plan.id, ctx);
    return operationalMessage("A última alteração reversível desta conversa foi desfeita com segurança.", scope, reverted);
  } catch (error) {
    return operationalMessage(`Não foi possível desfazer com segurança: ${error instanceof Error ? error.message : "undo indisponível"}.`, scope, plan);
  }
}

function resolveTargetTaskId(prompt: string, ctx: AthenaEngineContext, projectId?: string): string | undefined {
  const normalized = prompt.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const candidates = projectId ? ctx.tasks.filter((task) => task.projectId === projectId) : ctx.tasks;
  return candidates.find((task) => normalized.includes(task.title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()))?.id || (candidates.length === 1 ? candidates[0].id : undefined);
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
    comprehensionStatus: "UNDERSTOOD",
    missingInformation: [],
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
  sessionId = "default-session",
  externalConversationContext?: readonly { role: "user" | "athena"; text: string }[]
): Promise<AthenaMessage> {
  let prompt = rawPrompt.trim();
  if (/^(corrija a resposta|corrija|tente novamente|nao foi isso)[.!?]*$/i.test(prompt.normalize("NFD").replace(/[\u0300-\u036f]/g, ""))) {
    const feedback = athenaConversationFeedback.latest(sessionId);
    if (feedback) {
      if (feedback.category === "WRONG_ACTION") return operationalMessage("Registrei que a ação foi incorreta. Não vou repeti-la automaticamente. Informe qual resultado ou item precisa ser ajustado; o histórico da ação permanece disponível.", scope);
      if (feedback.correction) prompt = feedback.correction;
      else return operationalMessage(`Você marcou a resposta ao pedido “${feedback.prompt || "anterior"}” como inadequada. ${feedback.category === "LOST_CONTEXT" ? "Qual escolha ou trecho devo retomar?" : "Diga o que faltou no resultado para eu corrigir sem repetir a mesma resposta."}`, scope);
    }
  }
  const studioResponse = await processStudioConversation(prompt, scope, ctx, sessionId);
  if (studioResponse) return studioResponse;
  const canonicalControl = await tryCanonicalPlanControl(prompt, scope, ctx, sessionId, targetProjectId);
  if (canonicalControl) return withContractMetadata(canonicalControl, decisionForContract("USE_TOOL", "canonical.persisted-plan-control"));
  // 1. Contextual Perception & Intent Composition
  const parsed = athenaConversationManager.processMessage(
    sessionId,
    prompt,
    ctx.projects,
    targetProjectId,
    externalConversationContext
  );
  const contractDecision = athenaInteractionContractRouter.route(parsed);

  const resolvedProjectId = resolveExecutionProjectId(
    prompt,
    parsed.resolvedEntities.targetProjectId,
    targetProjectId
  );
  athenaObservabilityJournal.record({ category: "CONTRACT", type: "REQUEST_CONTEXT", status: "ROUTED", contract: contractDecision.contract, message: contractDecision.reason, sessionId, projectId: resolvedProjectId, details: { sourceInteractionType: contractDecision.sourceInteractionType, confidence: contractDecision.confidence, comprehensionStatus: parsed.comprehensionStatus, missingInformation: parsed.missingInformation, intents: parsed.intents, subject: parsed.subject, candidates: parsed.semanticInterpretation?.candidateScores.slice(0, 3) } });
  const capabilitySelection = contractDecision.contract === "USE_AGENT" && !parsed.intents.includes("CLARIFICATION_RESPONSE")
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
    comprehensionStatus: parsed.comprehensionStatus ?? "PARTIALLY_UNDERSTOOD",
    missingInformation: parsed.missingInformation ?? [],
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
  const plannedResponseIntent = AthenaResponseStrategyEngine.plan(
    strategySemantic,
    sessionState,
    ctx,
    scope,
    resolvedProjectId,
    prompt
  );

  // Personalization is restricted to manually confirmed, allowlisted style enums.
  // Fetch separately from cognitive recall so the deterministic path stays offline-safe.
  let responseIntent = plannedResponseIntent;
  try {
    const communicationContext = await buildExperienceContext({
      requester: ctx.experienceOwnerId ? `user:${ctx.experienceOwnerId}` : "local-owner",
      ownerId: ctx.experienceOwnerId,
      agentId: "athena",
      moduleId: "athena",
      projectId: resolvedProjectId,
      sessionId,
      currentInstruction: prompt,
      budget: 12,
    });
    responseIntent = applyConfirmedCommunicationStyle(plannedResponseIntent, communicationContext.preferences, prompt);
  } catch {
    // Personalization is optional; retain the deterministic baseline on storage errors.
  }

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
    athenaConversationManager.recordAssistantResponse(sessionId, clarResult.text);
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
        await processCapabilityPlanAsync(prompt, scope, ctx, resolvedProjectId, sessionId),
        contractDecision
      )
    );
  }

  // 5. COGNITIVE PATH via Local Neural Engine (when Ollama is active on 127.0.0.1:11434)
  const isOllamaOnline = contractDecision.contract === "USE_AGENT" && await ollamaAdapter.isAvailable();
  if (isOllamaOnline && ollamaAdapter.activeModel && contractDecision.contract === "USE_AGENT") {
    try {
      const activeProj = resolvedProjectId ? ctx.projects.find((p) => p.id === resolvedProjectId) : undefined;
      const experienceDomain = scope === "juridico" ? "legal" : scope === "pesquisa" ? "research" : scope === "produtividade" ? "productivity" : undefined;
      const experienceContext = await buildExperienceContext({
        requester: ctx.experienceOwnerId ? `user:${ctx.experienceOwnerId}` : "local-owner",
        ownerId: ctx.experienceOwnerId,
        domain: experienceDomain,
        agentId: capabilitySelection?.selected?.id || "athena",
        moduleId: "athena",
        projectId: resolvedProjectId,
        sessionId,
        currentInstruction: prompt,
        budget: 8,
      });
      const contextData = {
        activeProject: activeProj ? { title: activeProj.title, category: activeProj.category, status: activeProj.status } : null,
        recentTasks: ctx.tasks.slice(0, 5).map((t) => ({ title: t.title, priority: t.priority })),
        upcomingDeadlines: ctx.projects.filter((p) => p.deadline).slice(0, 3).map((p) => ({ title: p.title, deadline: p.deadline })),
        keyFacts: responseIntent.keyFacts,
        responseMode: responseIntent.mode,
        responseTone: responseIntent.tone,
        recentConversation: athenaConversationManager.getRecentTurns(sessionId, 8).map((turn) => ({ role: turn.role, text: turn.text })),
        specialist: capabilitySelection?.selected ? {
          id: capabilitySelection.selected.id,
          name: capabilitySelection.selected.name,
          description: capabilitySelection.selected.description,
          skills: capabilitySelection.selected.skills,
        } : null,
        experience: {
          preferences: experienceContext.preferences,
          priorExperiences: experienceContext.experiences,
          instructionPrecedence: experienceContext.instructionPrecedence,
        },
      };

      const systemPrompt = `Você é a Athena, a inteligência artificial cognitiva e copilot digital central do VARYNTH OS.
Você é perspicaz, empática, articulada, dialética e profunda. Responda em português do Brasil com o Princípio de Resposta Direta (responda primeiro ao que foi pedido sem rodeios).
Respeite estritamente os fatos fornecidos em keyFacts e no contexto vivo. O bloco recentConversation contém apenas turnos anteriores desta sessão: use-o para resolver referências e continuidade, nunca para inventar fatos ausentes. O especialista indicado contribui apenas com o recorte de domínio; você continua sendo a interlocutora e não afirme que ele executou análise, consulta ou ação sem resultado explícito.
O bloco experience contém preferências e experiências anteriores da conta autenticada, não fatos universais. Trate inferências como incertas, use apenas o que for pertinente e nunca as aplique quando conflitarem com a instrução atual; instrução atual, política do projeto e permissões têm precedência. Adapte formalidade e vocabulário ao usuário e ao pedido. Se a evidência não bastar, diga o que falta e faça uma pergunta objetiva. Não presuma nome, identidade ou relação do usuário.`;

      const modelResponse = await athenaInteractionContractGateway.executeAsync(
        contractDecision,
        () => ollamaAdapter.generate({ systemPrompt, userPrompt: prompt, contextData, temperature: 0.35 })
      );

      if (modelResponse.content && modelResponse.content.trim().length > 0) {
        const candidateReply = modelResponse.content.trim();
        const factLockCheck = FactLockValidator.validate(candidateReply, responseIntent);

        if (factLockCheck.isValid) {
          const finalReply = enforceResponseQuality(prompt, parsed, candidateReply, sessionId, resolvedProjectId);
          athenaConversationManager.recordAssistantResponse(sessionId, finalReply);

          return {
            id: "ath-" + Date.now(),
            sender: "athena",
              text: finalReply,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            scope,
            metadata: {
              engine: "ollama-local",
              model: ollamaAdapter.activeModel,
              experienceContext: {
                preferenceIds: experienceContext.preferences.map((preference) => preference.id),
                experienceIds: experienceContext.experiences.map((experience) => experience.id),
                instructionPrecedence: experienceContext.instructionPrecedence,
              },
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

  const finalText = enforceResponseQuality(prompt, parsed, result.text, sessionId, resolvedProjectId);

  // Record in History for future turns / ellipses
  athenaConversationManager.recordAssistantResponse(
    sessionId,
    finalText,
    result.recommendations,
    result.critiques
  );

  return {
    id: "ath-" + Date.now(),
    sender: "athena",
    text: finalText,
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
  athenaObservabilityJournal.record({ category: "CONTRACT", type: "REQUEST_CONTEXT", status: "ROUTED", contract: contractDecision.contract, message: contractDecision.reason, sessionId, projectId: resolvedProjectId, details: { sourceInteractionType: contractDecision.sourceInteractionType, confidence: contractDecision.confidence, comprehensionStatus: parsed.comprehensionStatus, missingInformation: parsed.missingInformation, intents: parsed.intents, subject: parsed.subject, candidates: parsed.semanticInterpretation?.candidateScores.slice(0, 3) } });
  const capabilitySelection = contractDecision.contract === "USE_AGENT" && !parsed.intents.includes("CLARIFICATION_RESPONSE")
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
    comprehensionStatus: parsed.comprehensionStatus ?? "PARTIALLY_UNDERSTOOD",
    missingInformation: parsed.missingInformation ?? [],
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
    athenaConversationManager.recordAssistantResponse(sessionId, clarResult.text);
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
      () => withContractMetadata(processDeterministicWorkflow(prompt, scope, ctx, resolvedProjectId, sessionId), contractDecision)
    );
  }

  const activeProj = resolvedProjectId ? ctx.projects.find((p) => p.id === resolvedProjectId) : undefined;
  const result = athenaInteractionContractGateway.execute(
    contractDecision,
    () => athenaPersonaEngine.generateDialogueResponse(
      prompt, parsed, activeProj?.title, ctx, responseIntent, sessionId
    )
  );

  const finalText = enforceResponseQuality(prompt, parsed, result.text, sessionId, resolvedProjectId);

  athenaConversationManager.recordAssistantResponse(
    sessionId,
    finalText,
    result.recommendations,
    result.critiques
  );

  return {
    id: "ath-" + Date.now(),
    sender: "athena",
    text: finalText,
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
  resolvedProjectId?: string,
  sessionId?: string
): AthenaMessage {
  const task = athenaPerceptionEngine.perceive(prompt, scope, resolvedProjectId);
  task.metadata = { ...task.metadata, targetTaskId: resolveTargetTaskId(prompt, ctx, resolvedProjectId), sessionId };
  const context = athenaContextBuilder.buildContext(task, scope, ctx, resolvedProjectId);
  const workflow = athenaWorkflowBuilder.build({ ...task, type: "ACTION_FAST" });
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
  resolvedProjectId?: string,
  sessionId?: string
): Promise<AthenaMessage> {
  const task = athenaPerceptionEngine.perceive(prompt, scope, resolvedProjectId);
  task.metadata = { ...task.metadata, targetTaskId: resolveTargetTaskId(prompt, ctx, resolvedProjectId), sessionId };
  const context = athenaContextBuilder.buildContext(task, scope, ctx, resolvedProjectId);
  const workflow = athenaWorkflowBuilder.build({ ...task, type: "ACTION_FAST" });
  const planned = capabilityPlanBuilder.build(task, workflow, context);
  const approved = capabilityPlanBuilder.approve(planned, "POLICY");
  capabilityPlanRuntime.register(approved);
  if (approved.steps.some((step) => step.requiresConfirmation)) {
    const response = athenaResponseBuilder.buildResponse(task, context, undefined, undefined);
    response.text = `Preparei o plano **${approved.objective}** com ${approved.steps.length} etapa(s). Nenhuma alteração foi executada: revise e confirme as mutações sensíveis no painel de planos.`;
    response.metadata = {
      ...response.metadata,
      capabilityPlanId: approved.id,
      capabilityPlanHash: approved.planHash,
      capabilityPlanStatus: approved.status,
      capabilityPlanSummary: {
        status: "BLOCKED",
        completedStepIds: [],
        failedStepIds: [],
        blockedStepIds: approved.steps.filter((step) => step.requiresConfirmation).map((step) => step.id),
        skippedStepIds: [],
        message: "Plano persistido aguardando confirmação humana das mutações sensíveis.",
      },
      capabilityPlanSteps: approved.steps,
    };
    return response;
  }
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
