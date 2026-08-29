import { AthenaTask } from "../../domain/task";
import { AthenaWorkflow, WorkflowStep } from "../../domain/workflow";
import { ActionType } from "../../domain/action";

export class SimpleActionPlanner {
  id = "action-planner";

  plan(task: AthenaTask): AthenaWorkflow {
    const p = task.rawPrompt.toLowerCase();
    const steps: WorkflowStep[] = [];

    // 1. Task Creation
    if (
      p.startsWith("crie uma tarefa") ||
      p.startsWith("criar tarefa") ||
      p.startsWith("nova tarefa") ||
      p.startsWith("adicione uma tarefa") ||
      p.startsWith("adicionar tarefa")
    ) {
      let cleanTitle = task.rawPrompt
        .replace(/^(crie uma tarefa|criar tarefa|nova tarefa|adicione uma tarefa|adicionar tarefa)[:\s]*/i, "")
        .trim();

      if (p.includes("urgente") || p.includes("alta prioridade")) {
        cleanTitle = cleanTitle.replace(/\burgente\b/gi, "").replace(/\balta prioridade\b/gi, "").trim();
      }

      steps.push({
        id: "step-1",
        name: "Criar Tarefa no VARYNTH",
        toolCall: {
          toolName: "tasks.create",
          params: {
            title: cleanTitle || "Nova tarefa via Athena",
            projectId: task.targetProjectId,
            priority: task.priority,
          },
        },
        status: "PENDING",
      });
    }

    // 2. Note Creation
    else if (
      p.startsWith("crie uma nota") ||
      p.startsWith("criar nota") ||
      p.startsWith("anote isso") ||
      p.startsWith("anotar")
    ) {
      const cleanContent = task.rawPrompt
        .replace(/^(crie uma nota|criar nota|anote isso|anotar)[:\s]*/i, "")
        .trim();

      steps.push({
        id: "step-1",
        name: "Capturar Nota no VARYNTH",
        toolCall: {
          toolName: "notes.create",
          params: {
            content: cleanContent,
            projectId: task.targetProjectId,
          },
        },
        status: "PENDING",
      });
    }

    // 3. Chronos Deadlines
    else if (
      p.includes("prazo") ||
      p.includes("deadline") ||
      p.includes("quando vence") ||
      p.includes("cronograma")
    ) {
      steps.push({
        id: "step-1",
        name: "Consultar Prazos no Chronos",
        toolCall: {
          toolName: "chronos.listDeadlines",
          params: {},
        },
        status: "PENDING",
      });
    }

    // 4. Safe Trash Protocol
    else if (
      p.startsWith("excluir") ||
      p.startsWith("apagar") ||
      p.startsWith("remover") ||
      p.startsWith("deletar") ||
      p.includes("lixeira")
    ) {
      steps.push({
        id: "step-1",
        name: "Protocolo de Exclusão Segura (Lixeira 10d)",
        toolCall: {
          toolName: "trash.moveWithUndo",
          params: {
            title: task.title,
            entityType: "tarefa",
          },
        },
        status: "PENDING",
      });
    }

    // 5. Diagnostics
    else if (
      p.includes("diagnostico") ||
      p.includes("status") ||
      p.includes("visao geral")
    ) {
      steps.push({
        id: "step-1",
        name: "Executar Diagnóstico Operacional",
        toolCall: {
          toolName: "diagnostics.run",
          params: {},
        },
        status: "PENDING",
      });
    }

    // Fallback simple step
    if (steps.length === 0) {
      steps.push({
        id: "step-1",
        name: "Processar Ação Imediata",
        status: "PENDING",
      });
    }

    return {
      id: "wf-" + Date.now(),
      taskId: task.id,
      name: "Fast Action Workflow",
      plannerId: this.id,
      steps,
      status: "PENDING",
      currentStepIndex: 0,
      createdAt: new Date().toISOString(),
    };
  }
}

export const simpleActionPlanner = new SimpleActionPlanner();

