import type { AthenaAgent, AgentManifest } from "../base-agent";
import type { AthenaTask } from "../../domain/task";
import type { AthenaContext } from "../../domain/context";
import type { AgentResult } from "../../domain/result";

/** Explicit low-priority owner for cognitive requests outside specialist domains. */
export class AthenaGeneralistAgent implements AthenaAgent {
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

  canHandle(task: AthenaTask): boolean {
    return task.type === "GENERAL_DELIBERATION";
  }

  async execute(task: AthenaTask, _context: AthenaContext): Promise<AgentResult> {
    return {
      agentId: this.manifest.id,
      agentName: this.manifest.name,
      role: this.manifest.role,
      success: true,
      content: `Análise cognitiva geral preparada para: ${task.title}`,
      confidence: 0.75,
    };
  }
}

export const athenaGeneralistAgent = new AthenaGeneralistAgent();

