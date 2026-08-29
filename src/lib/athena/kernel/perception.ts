import { AthenaTask, TaskType, TaskPriority } from "../domain/task";
import { AthenaScope } from "../domain/context";
import { athenaEventBus } from "../events/event-bus";

export class PerceptionEngine {
  perceive(rawPrompt: string, scope: AthenaScope, targetProjectId?: string): AthenaTask {
    const prompt = rawPrompt.trim();
    const lower = prompt.toLowerCase();

    let type: TaskType = "ACTION_FAST";
    let priority: TaskPriority = "media";

    // 1. Detect Priority
    if (lower.includes("urgente") || lower.includes("alta prioridade") || lower.includes("emergencia")) {
      priority = "urgente";
    } else if (lower.includes("prioridade alta")) {
      priority = "alta";
    }

    // 2. Classify Task Type
    if (
      lower.startsWith("crie uma tarefa") ||
      lower.startsWith("criar tarefa") ||
      lower.startsWith("nova tarefa") ||
      lower.startsWith("adicione uma tarefa") ||
      lower.startsWith("crie uma nota") ||
      lower.startsWith("anote isso") ||
      lower.startsWith("excluir") ||
      lower.startsWith("apagar") ||
      lower.includes("lixeira") ||
      lower.includes("diagnostico")
    ) {
      type = "ACTION_FAST";
    } else if (scope === "juridico" || lower.includes("tese") || lower.includes("direito") || lower.includes("stf") || lower.includes("jurisprudencia")) {
      type = "LEGAL_ANALYSIS";
    } else if (scope === "pesquisa" || lower.includes("pesquisa") || lower.includes("evidencia") || lower.includes("artigo cientifico") || lower.includes("metodologia")) {
      type = "RESEARCH_SYNTHESIS";
    } else if (scope === "produtividade" || lower.includes("prazo") || lower.includes("cronograma") || lower.includes("planejamento")) {
      type = "PRODUCTIVITY_OPTIMIZATION";
    }

    const task: AthenaTask = {
      id: "task-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
      title: prompt.slice(0, 60),
      rawPrompt: prompt,
      type,
      priority,
      status: "CREATED",
      scope,
      targetProjectId,
      entities: {
        keywords: lower.split(/\s+/).filter((w) => w.length > 3),
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    athenaEventBus.emit("TASK_CREATED", task, task.id);
    return task;
  }
}

export const athenaPerceptionEngine = new PerceptionEngine();

