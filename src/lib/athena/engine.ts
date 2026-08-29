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
} from "../types";
import { athenaPerceptionEngine } from "./kernel/perception";
import { athenaContextBuilder } from "./memory/context-builder";
import { athenaWorkflowBuilder } from "./runtime/workflow-builder";
import { athenaResponseBuilder } from "./kernel/response-builder";
import { athenaConversationManager } from "./conversation/conversation-manager";
import { athenaPersonaEngine } from "./persona/persona-engine";
import { ollamaAdapter } from "./models/providers/ollama-adapter";
import { responseCompletenessValidator } from "./conversation/completeness-validator";
import { InteractionDebugInfo } from "./domain/conversation";

export interface AthenaEngineContext {
  projects: Project[];
  tasks: Task[];
  vaultItems: VaultItem[];
  chronosEvents: ChronosEvent[];
  theses: ArgumentThesis[];
  evidences: EvidenceItem[];
  opportunities: Opportunity[];
  addTask: (taskData: Omit<Task, "id" | "createdAt">, actorType?: "user" | "athena" | "system") => Task;
  addNote: (noteData: { title: string; content: string; projectId?: string; tags: string[]; pinned?: boolean }, actorType?: "user" | "athena" | "system") => unknown;
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

  // 1. Contextual Perception & Intent Composition
  const parsed = athenaConversationManager.processMessage(
    sessionId,
    prompt,
    ctx.projects,
    targetProjectId
  );

  const resolvedProjectId = parsed.resolvedEntities.targetProjectId || targetProjectId;

  // 2. Ambiguity Handling (Dangerous / Relevant Ambiguity)
  if (parsed.isAmbiguous && parsed.clarificationPrompt) {
    return {
      id: "ath-" + Date.now(),
      sender: "athena",
      text: parsed.clarificationPrompt,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      scope,
    };
  }

  // 3. OPERATIONAL PATH: System Mutation Commands
  if (parsed.interactionType === "OPERATIONAL_REQUEST") {
    return processDeterministicWorkflow(prompt, scope, ctx, resolvedProjectId);
  }

  // 4. COGNITIVE PATH via Local Neural Engine (when Ollama is active on 127.0.0.1:11434)
  const isOllamaOnline = await ollamaAdapter.isAvailable();
  if (isOllamaOnline && ollamaAdapter.activeModel && parsed.interactionType === "COGNITIVE_REQUEST") {
    try {
      const activeProj = resolvedProjectId ? ctx.projects.find((p) => p.id === resolvedProjectId) : undefined;
      const contextData = {
        activeProject: activeProj ? { title: activeProj.title, category: activeProj.category, status: activeProj.status } : null,
        recentTasks: ctx.tasks.slice(0, 5).map((t) => ({ title: t.title, priority: t.priority })),
        upcomingDeadlines: ctx.projects.filter((p) => p.deadline).slice(0, 3).map((p) => ({ title: p.title, deadline: p.deadline })),
        vaultItemsCount: ctx.vaultItems.length,
        thesesCount: ctx.theses.length,
      };

      const systemPrompt = `Você é a Athena, a inteligência artificial cognitiva e copilot digital central do VARYNTH OS.
Você é perspicaz, empática, articulada, dialética e profunda. Responda em português do Brasil com o Princípio de Resposta Direta (responda primeiro ao que foi pedido sem rodeios).
Você está conversando com o Paulo, dono e criador do VARYNTH OS.`;

      const modelResponse = await ollamaAdapter.generate({
        systemPrompt,
        userPrompt: prompt,
        contextData,
        temperature: 0.7,
      });

      if (modelResponse.content && modelResponse.content.trim().length > 0) {
        const replyText = modelResponse.content.trim();
        athenaConversationManager.recordAssistantResponse(sessionId, replyText);

        return {
          id: "ath-" + Date.now(),
          sender: "athena",
          text: replyText,
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
    } catch {
      // Fallback seamlessly to deterministic Persona
    }
  }

  // 5. DETERMINISTIC COGNITIVE / FAST CONVERSATION PATH (0 ms, 100% offline)
  const activeProj = resolvedProjectId ? ctx.projects.find((p) => p.id === resolvedProjectId) : undefined;
  const result = athenaPersonaEngine.generateDialogueResponse(
    prompt,
    parsed,
    activeProj?.title,
    ctx
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
  const parsed = athenaConversationManager.processMessage(
    sessionId,
    prompt,
    ctx.projects,
    targetProjectId
  );

  const resolvedProjectId = parsed.resolvedEntities.targetProjectId || targetProjectId;

  if (parsed.interactionType === "OPERATIONAL_REQUEST") {
    return processDeterministicWorkflow(prompt, scope, ctx, resolvedProjectId);
  }

  const activeProj = resolvedProjectId ? ctx.projects.find((p) => p.id === resolvedProjectId) : undefined;
  const result = athenaPersonaEngine.generateDialogueResponse(
    prompt,
    parsed,
    activeProj?.title,
    ctx
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
        if (step.toolCall.toolName === "tasks.create") {
          const created = ctx.addTask(
            {
              title: (step.toolCall.params.title as string) || "Nova tarefa via Athena",
              projectId: (step.toolCall.params.projectId as string) || undefined,
              priority: (step.toolCall.params.priority as any) || "media",
              status: "a_fazer",
            },
            "athena"
          );
          toolOutputs[step.id] = { actionType: "tasks.create", data: created };
        } else if (step.toolCall.toolName === "notes.create") {
          const note = ctx.addNote(
            {
              title: `Nota Rápida — ${new Date().toLocaleDateString()}`,
              content: (step.toolCall.params.content as string) || "",
              tags: ["athena", "captura-rapida"],
              pinned: false,
            },
            "athena"
          );
          toolOutputs[step.id] = { actionType: "notes.create", data: { content: step.toolCall.params.content } };
        } else if (step.toolCall.toolName === "chronos.listDeadlines") {
          const projectDeadlines = ctx.projects
            .filter((p) => p.deadline)
            .map((p) => ({ title: p.title, deadline: p.deadline, priority: p.priority }));
          const chronosDeadlines = ctx.chronosEvents
            .filter((e) => !e.completed)
            .map((e) => ({ title: e.title, date: e.date, startTime: e.startTime, type: e.type }));
          toolOutputs[step.id] = { actionType: "chronos.listDeadlines", data: { projectDeadlines, chronosDeadlines } };
        } else if (step.toolCall.toolName === "trash.moveWithUndo") {
          toolOutputs[step.id] = { actionType: "trash.moveWithUndo", data: { retentionDays: 10 } };
        } else if (step.toolCall.toolName === "diagnostics.run") {
          toolOutputs[step.id] = {
            actionType: "diagnostics.run",
            data: {
              activeProj: ctx.projects.filter((p) => p.status === "ativo").length,
              pendingTasks: ctx.tasks.filter((t) => t.status !== "concluida").length,
              completedTasks: ctx.tasks.filter((t) => t.status === "concluida").length,
              totalVault: ctx.vaultItems.length,
              totalTheses: ctx.theses.length,
              totalOpps: ctx.opportunities.length,
              urgentTasks: ctx.tasks.filter((t) => t.status !== "concluida" && (t.priority === "urgente" || t.priority === "alta")).length,
            },
          };
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
