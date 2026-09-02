import { AthenaTask, TaskType, TaskPriority } from "../domain/task";
import { AthenaScope } from "../domain/context";
import { athenaEventBus } from "../events/event-bus";
import { ollamaAdapter } from "../models/providers/ollama-adapter";
import { structuredOutputValidator } from "./structured-output";

export class HybridPerceptionEngine {
  /**
   * Hybrid Perception Layer:
   * Layer 1: Instant Deterministic Parser (0 ms, 0 inference cost)
   * Layer 2: Local Model Classifier (only if complex, ambiguous, and local model is active)
   */
  perceive(rawPrompt: string, scope: AthenaScope, targetProjectId?: string): AthenaTask {
    const prompt = rawPrompt.trim();
    const lower = prompt.toLowerCase();

    let type: TaskType = "ACTION_FAST";
    let priority: TaskPriority = "media";

    // 1. Detect Priority Deterministically
    if (lower.includes("urgente") || lower.includes("alta prioridade") || lower.includes("emergencia")) {
      priority = "urgente";
    } else if (lower.includes("prioridade alta")) {
      priority = "alta";
    }

    // 2. Classify Task Type Deterministically (Layer 1)
    if (
      lower.startsWith("crie uma tarefa") ||
      lower.startsWith("criar tarefa") ||
      lower.startsWith("nova tarefa") ||
      lower.startsWith("adicione uma tarefa") ||
      lower.startsWith("crie uma nota") ||
      lower.startsWith("anote isso") ||
      lower.startsWith("anotar") ||
      lower.startsWith("excluir") ||
      lower.startsWith("apagar") ||
      lower.includes("lixeira") ||
      lower.includes("diagnostico") ||
      lower.includes("resumo do sistema")
    ) {
      type = "ACTION_FAST";
    } else if (
      scope === "juridico" ||
      lower.includes("tese") ||
      lower.includes("direito") ||
      lower.includes("stf") ||
      lower.includes("stj") ||
      lower.includes("jurisprudencia") ||
      lower.includes("hermeneutica") ||
      lower.includes("hermenêutica") ||
      lower.includes("constitucional")
    ) {
      type = "LEGAL_ANALYSIS";
    } else if (
      scope === "pesquisa" ||
      lower.includes("pesquisa") ||
      lower.includes("evidencia") ||
      lower.includes("artigo cientifico") ||
      lower.includes("metodologia") ||
      lower.includes("qualis")
    ) {
      type = "RESEARCH_SYNTHESIS";
    } else if (
      scope === "produtividade" ||
      lower.includes("prazo") ||
      lower.includes("cronograma") ||
      lower.includes("planejamento") ||
      lower.includes("foco")
    ) {
      type = "PRODUCTIVITY_OPTIMIZATION";
    } else if (
      lower.includes("ideia") ||
      lower.includes("brainstorm") ||
      lower.includes("criativo") ||
      lower.includes("labs")
    ) {
      type = "CREATIVE_IDEATION";
    } else if (
      lower.includes("critica") ||
      lower.includes("revisar") ||
      lower.includes("validar") ||
      lower.includes("risco")
    ) {
      type = "CRITICAL_REVIEW";
    } else {
      type = "GENERAL_DELIBERATION";
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

export const athenaPerceptionEngine = new HybridPerceptionEngine();
