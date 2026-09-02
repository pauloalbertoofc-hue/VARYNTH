import { AthenaTask } from "../../domain/task";
import { AthenaWorkflow, WorkflowStep } from "../../domain/workflow";
import { ActionType } from "../../domain/action";

export class SimpleActionPlanner {
  id = "action-planner";

  plan(task: AthenaTask): AthenaWorkflow {
    const p = task.rawPrompt.toLowerCase();
    const normalized = p.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const projectId = task.targetProjectId;
    const targetTaskId = task.metadata?.targetTaskId as string | undefined;
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

    // 3. Governed project and task mutations migrated from the legacy adapter
    else if (projectId && normalized.includes("arquiv") && normalized.includes("projeto")) {
      steps.push({ id: "step-1", name: "Arquivar Projeto", toolCall: { toolName: "projects.update", params: { projectId, status: "arquivado" } }, status: "PENDING" });
    }
    else if (projectId && /^(excluir|apagar|remover|deletar).+projeto/.test(normalized)) {
      steps.push({ id: "step-1", name: "Mover Projeto para a Lixeira", toolCall: { toolName: "projects.trash", params: { projectId } }, status: "PENDING" });
    }
    else if (targetTaskId && /^(excluir|apagar|remover|deletar).+tarefa/.test(normalized)) {
      steps.push({ id: "step-1", name: "Mover Tarefa para a Lixeira", toolCall: { toolName: "tasks.trash", params: { taskId: targetTaskId } }, status: "PENDING" });
    }
    else if (targetTaskId && /\b(conclua|concluir|marque como concluida|reabra|reabrir)\b/.test(normalized) && normalized.includes("tarefa")) {
      const reopening = normalized.includes("reabr");
      steps.push({ id: "step-1", name: reopening ? "Reabrir Tarefa" : "Concluir Tarefa", toolCall: { toolName: "tasks.update", params: { taskId: targetTaskId, status: reopening ? "a_fazer" : "concluida", completedAt: reopening ? undefined : new Date().toISOString() } }, status: "PENDING" });
    }
    else if (projectId && (normalized.includes("prazo") || normalized.includes("data"))) {
      const iso = task.rawPrompt.match(/\b20\d{2}-\d{2}-\d{2}\b/)?.[0];
      const br = task.rawPrompt.match(/\b(\d{1,2})\/(\d{1,2})\/(20\d{2})\b/);
      const deadline = iso || (br ? `${br[3]}-${br[2].padStart(2, "0")}-${br[1].padStart(2, "0")}` : undefined);
      if (deadline) steps.push({ id: "step-1", name: "Atualizar Prazo do Projeto", toolCall: { toolName: "projects.update", params: { projectId, deadline } }, status: "PENDING" });
    }
    else if (projectId && normalized.includes("prioridade") && normalized.includes("projeto")) {
      const priority = normalized.includes("urgente") ? "urgente" : normalized.includes("alta") ? "alta" : normalized.includes("baixa") ? "baixa" : "media";
      steps.push({ id: "step-1", name: "Atualizar Prioridade do Projeto", toolCall: { toolName: "projects.update", params: { projectId, priority } }, status: "PENDING" });
    }
    else if (projectId && normalized.includes("projeto") && (normalized.includes("como ativo") || normalized.includes("em espera") || normalized.includes("como concluido") || normalized.includes("conclua o projeto"))) {
      const status = normalized.includes("ativo") ? "ativo" : normalized.includes("espera") ? "em_espera" : "concluido";
      steps.push({ id: "step-1", name: "Atualizar Status do Projeto", toolCall: { toolName: "projects.update", params: { projectId, status } }, status: "PENDING" });
    }

    // 4. Chronos Deadlines
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

    // 5. Safe Trash Protocol
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

    // 6. Diagnostics
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
