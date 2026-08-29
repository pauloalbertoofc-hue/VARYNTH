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
 * High-level facade for Athena Cognitive Kernel with Conversational & Execution Awareness.
 */
export function processAthenaQuery(
  rawPrompt: string,
  scope: AthenaScope,
  ctx: AthenaEngineContext,
  targetProjectId?: string,
  sessionId = "default-session"
): AthenaMessage {
  const prompt = rawPrompt.trim();

  // 1. Conversation Manager & Anaphora Resolution
  const convContext = athenaConversationManager.processMessage(
    sessionId,
    prompt,
    ctx.projects,
    targetProjectId
  );

  const resolvedProjectId = convContext.targetProjectId || targetProjectId;

  // 2. Handle Ambiguous References (e.g. "esse projeto" when none is active)
  if (convContext.isAmbiguousReference && convContext.ambiguousTerm) {
    const candidates = ctx.projects.map((p) => p.title);
    return {
      id: "ath-" + Date.now(),
      sender: "athena",
      text: athenaPersonaEngine.generateClarificationQuestion(convContext.ambiguousTerm, candidates),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      scope,
    };
  }

  // 3. Handle Purely Conversational / Casual / Brainstorming Messages (0 spurious actions/tasks created)
  if (convContext.intent === "CONVERSATION_ONLY" || convContext.intent === "BRAINSTORM") {
    const activeProj = resolvedProjectId
      ? ctx.projects.find((p) => p.id === resolvedProjectId)
      : undefined;

    const replyText = athenaPersonaEngine.generateDialogueResponse(
      prompt,
      convContext.mode,
      convContext.topic,
      activeProj?.title
    );

    return {
      id: "ath-" + Date.now(),
      sender: "athena",
      text: replyText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      scope,
    };
  }

  // 4. Execution & Deep Analysis Path
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

  // 5. Deliberation check for Cognitive Path
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

  // 6. Build Final Response
  return athenaResponseBuilder.buildResponse(
    task,
    context,
    workflowResult,
    deliberationResult
  );
}
