import type { AthenaAgent, AgentManifest } from "../base-agent";
import type { AthenaTask } from "../../domain/task";
import type { AthenaContext } from "../../domain/context";
import type { AgentResult } from "../../domain/result";
import { agentRegistry } from "../registry";

/** Explicit low-priority owner for cognitive requests outside specialist domains. */
export class AthenaGeneralistAgent implements AthenaAgent {
  responseMethod = "Como agente geral, responda a perguntas cognitivas com explicação direta e substancial, mas não finja ter conhecimento ou contexto que o executor não recebeu. Se não houver conteúdo suficiente para responder, declare o limite e peça o elemento necessário em vez de encaminhar genericamente para a Athena.";
  manifest: AgentManifest = {
    id: "athena-generalist",
    name: "Athena Generalist",
    role: "Agente cognitivo geral e explicativo",
    version: "1.0.0",
    description: "Responde questões gerais quando nenhum domínio especialista é necessário.",
    skills: ["explicacao", "analise_geral", "conversa_cognitiva"],
    priority: 10,
    enabled: true,
  };

  canHandle(task: AthenaTask, context: AthenaContext): boolean {
    const prompt = task.rawPrompt.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const isReadOnlyDiagnostic = task.type === "ACTION_FAST" && /\bdiagnostico\b/.test(prompt);
    if (task.type !== "GENERAL_DELIBERATION" && !isReadOnlyDiagnostic) return false;
    // The generalist is eligible only when no domain agent declares competence.
    const isGeneralQuestion = /\b(o que|quem|quando|onde|por que|como|quantos|quantas|projetos ativos|tarefas pendentes|diagnostico|explique|defina|significa|conceito|conhecimento geral|compare|comparando|diferen[cç]a|vs|versus|qual a melhor|ideia|ideias|recomende|recomenda|planeje|planejar|critique|revise|analise|resuma|sintetize|decida|decidir|priorize|continue|explore)\b/.test(prompt);
    return (isGeneralQuestion || isReadOnlyDiagnostic) && !agentRegistry.listAgents().some((agent) => agent.manifest.id !== this.manifest.id && agent.manifest.id !== "euterpe" && agent.canHandle(task, context));
  }

  async execute(task: AthenaTask, _context: AthenaContext): Promise<AgentResult> {
    return {
      agentId: this.manifest.id,
      agentName: this.manifest.name,
      role: this.manifest.role,
      success: false,
      content: `Não há uma análise substantiva para “${task.title}” neste executor. Encaminhe a pergunta à Athena para uma resposta contextual ou esclareça o domínio necessário.`,
      confidence: 0.1,
      sources: [],
      metadata: { reason: "NO_SUBSTANTIVE_GENERAL_EXECUTOR", generatedAnalysis: false },
    };
  }
}

export const athenaGeneralistAgent = new AthenaGeneralistAgent();
