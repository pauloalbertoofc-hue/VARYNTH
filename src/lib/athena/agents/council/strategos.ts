import { AthenaAgent, AgentManifest } from "../base-agent";
import { AthenaTask } from "../../domain/task";
import { AthenaContext } from "../../domain/context";
import { AgentResult } from "../../domain/result";

export class StrategosAgent implements AthenaAgent {
  manifest: AgentManifest = {
    id: "strategos",
    name: "Strategos",
    role: "Especialista em Estratégia, Planejamento & Produtividade",
    version: "2.0.0",
    description: "Gestão temporal, priorização de tarefas urgentes, cronogramas no Chronos e alocação estratégica de energia.",
    skills: ["planejamento", "estrategia", "produtividade", "prazos", "chronos", "priorizacao", "gestao_tarefas"],
    priority: 88,
    enabled: true,
  };

  canHandle(task: AthenaTask, context: AthenaContext): boolean {
    if (context.scope === "produtividade") return true;
    const p = task.rawPrompt.toLowerCase();
    return (
      p.includes("prazo") ||
      p.includes("planejamento") ||
      p.includes("produtividade") ||
      p.includes("cronograma") ||
      p.includes("prioridade") ||
      p.includes("urgente") ||
      p.includes("foco") ||
      p.includes("tarefa")
    );
  }

  async execute(task: AthenaTask, context: AthenaContext): Promise<AgentResult> {
    const urgentTasks = context.relevantTasks.filter((t) => t.priority === "urgente" || t.priority === "alta");
    const upcomingEvents = context.relevantChronosEvents.slice(0, 3);

    let content = `⚡ **Diretriz Estratégica & Otimização (Strategos):**\n\n`;

    if (urgentTasks.length > 0) {
      content += `🔥 **Foco Imediato (${urgentTasks.length} tarefas de alta prioridade):**\n${urgentTasks.map((t) => `• [${t.priority.toUpperCase()}] ${t.title}`).join("\n")}\n\n`;
    } else {
      content += `Nenhuma tarefa urgente pendente no momento. Fluxo de execução estabilizado.\n\n`;
    }

    if (upcomingEvents.length > 0) {
      content += `⏳ **Próximos Compromissos no Chronos:**\n${upcomingEvents.map((e) => `• ${e.date}${e.startTime ? ` às ${e.startTime}` : ""}: ${e.title}`).join("\n")}\n\n`;
    }

    content += `• **Plano de Ação Recomendado:** Bloquear blocos de foco de 45 minutos para zerar as pendências prioritárias antes de abrir novos experimentos.`;

    return {
      agentId: this.manifest.id,
      agentName: this.manifest.name,
      role: this.manifest.role,
      success: true,
      content,
      confidence: 0.94,
      recommendations: ["Priorizar tarefas urgentes primeiro", "Sincronizar prazos no Chronos"],
    };
  }
}

export const strategosAgent = new StrategosAgent();

