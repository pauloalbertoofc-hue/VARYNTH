import { AthenaAgent, AgentManifest } from "../base-agent";
import { AthenaTask } from "../../domain/task";
import { AthenaContext } from "../../domain/context";
import { AgentResult } from "../../domain/result";
import { renderAgentPersona } from "../base-agent";
import { agentGuidanceInstruction, confirmedAgentGuidance } from "../experience-guidance";

export class StrategosAgent implements AthenaAgent {
  get personalityPrompt(): string { return renderAgentPersona(this.manifest); }
  manifest: AgentManifest = {
    id: "strategos",
    name: "Strategos",
    role: "Especialista em Estratégia, Planejamento & Produtividade",
    version: "2.0.0",
    description: "Gestão temporal, priorização de tarefas urgentes, cronogramas no Chronos e alocação estratégica de energia.",
    skills: ["planejamento", "estrategia", "produtividade", "prazos", "chronos", "priorizacao", "gestao_tarefas"],
    priority: 88,
    enabled: true,
    persona: { identity: "Sou Strategos; ajudo a ordenar prioridades com base na carga e nos compromissos que recebi.", home: "Produtividade, tarefas, prioridades e calendário Chronos", voice: "pragmática, serena e orientada a decisões", approach: "considero prioridade, prazo e agenda disponível; explicito quando faltam capacidade ou estimativas", evidenceBoundary: "uso tarefas e eventos recebidos; não assumo que listas vazias representam o sistema inteiro", authorityBoundary: "meu plano é consultivo; não reorganizo tarefas nem altero prazos sem fluxo autorizado" },
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
    const openTasks = context.relevantTasks.filter((task) => task.status !== "concluida");
    const urgentTasks = openTasks.filter((t) => t.priority === "urgente" || t.priority === "alta");
    const upcomingEvents = context.relevantChronosEvents.filter((event) => !event.completed && event.date >= context.systemTime.slice(0, 10)).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3);
    const planningDetail = confirmedAgentGuidance(context, this.manifest.id, "planningDetail", task.rawPrompt);

    let content = `⚡ **Diretriz Estratégica & Otimização (Strategos):**\n\n`;

    if (urgentTasks.length > 0) {
      content += `🔥 **Foco Imediato (${urgentTasks.length} tarefas de alta prioridade):**\n${urgentTasks.map((t) => `• [${t.priority.toUpperCase()}] ${t.title}`).join("\n")}\n\n`;
    } else {
      content += `${context.relevantTasks.length ? "Entre as tarefas recebidas, não há itens abertos com prioridade alta ou urgente." : "Não recebi tarefas neste contexto; não posso concluir que sua lista esteja vazia."}\n\n`;
    }

    if (upcomingEvents.length > 0) {
      content += `⏳ **Próximos Compromissos no Chronos:**\n${upcomingEvents.map((e) => `• ${e.date}${e.startTime ? ` às ${e.startTime}` : ""}: ${e.title}`).join("\n")}\n\n`;
    }

    if (!upcomingEvents.length) content += `Não recebi compromissos futuros no recorte do Chronos.\n\n`;
    content += urgentTasks.length
      ? `• **Próximo passo sugerido:** escolha uma tarefa prioritária acima; antes de estimar duração, preciso do esforço previsto e de eventuais dependências.${planningDetail === "stepwise" ? "\n1. Confirme qual tarefa vem primeiro.\n2. Informe esforço e dependências.\n3. Só então distribuirei etapas em horários disponíveis." : ""}`
      : `• **Próximo passo sugerido:** informe seu objetivo e disponibilidade para eu montar uma sequência realista, sem inventar blocos ou prazos.${planningDetail === "stepwise" ? "\n1. Defina o resultado desejado.\n2. Informe a janela de tempo disponível.\n3. Indique restrições ou compromissos fixos." : ""}`;

    return {
      agentId: this.manifest.id,
      agentName: this.manifest.name,
      role: this.manifest.role,
      success: true,
      content,
      confidence: context.relevantTasks.length || upcomingEvents.length ? 0.68 : 0.3,
      metadata: { receivedTaskCount: context.relevantTasks.length, openTaskCount: openTasks.length, upcomingEventCount: upcomingEvents.length, scheduleMutated: false, appliedExperienceGuidance: agentGuidanceInstruction(context, this.manifest.id, task.rawPrompt), planningDetail },
      recommendations: ["Priorizar tarefas urgentes primeiro", "Sincronizar prazos no Chronos"],
    };
  }
}

export const strategosAgent = new StrategosAgent();

