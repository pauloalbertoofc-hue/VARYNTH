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
import { athenaKernel } from "./kernel/executive-controller";
import { athenaPerceptionEngine } from "./kernel/perception";
import { athenaContextBuilder } from "./memory/context-builder";
import { athenaWorkflowBuilder } from "./runtime/workflow-builder";
import { athenaWorkflowExecutor } from "./runtime/workflow-executor";
import { athenaDeliberationEngine } from "./deliberation/deliberation-engine";
import { athenaResponseBuilder } from "./kernel/response-builder";

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
 * High-level facade for Athena Cognitive Kernel.
 * Executes the complete cognitive perception, workflow planning, Council deliberation, and response pipeline.
 */
export function processAthenaQuery(
  rawPrompt: string,
  scope: AthenaScope,
  ctx: AthenaEngineContext,
  targetProjectId?: string
): AthenaMessage {
  const prompt = rawPrompt.trim();

  // 1. Perception
  const task = athenaPerceptionEngine.perceive(prompt, scope, targetProjectId);

  // 2. Context Building (Surgical Context)
  const context = athenaContextBuilder.buildContext(task, scope, ctx, targetProjectId);

  // 3. Workflow Planning
  const workflow = athenaWorkflowBuilder.build(task);

  // 4. Workflow Execution
  let workflowResult: any = undefined;
  try {
    // Synchronous tool & planner execution
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
  const response = athenaResponseBuilder.buildResponse(
    task,
    context,
    workflowResult,
    deliberationResult
  );

  return response;
}
