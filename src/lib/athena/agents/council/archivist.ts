import { AthenaAgent, AgentManifest } from "../base-agent";
import { AthenaTask } from "../../domain/task";
import { AthenaContext } from "../../domain/context";
import { AgentResult } from "../../domain/result";
import { documentationGuardian } from "../../guardian/documentation-guardian";

export class ArchivistAgent implements AthenaAgent {
  manifest: AgentManifest = {
    id: "archivist",
    name: "Archivist",
    role: "Guardião da Documentação Técnica & Arquitetura Oficial",
    version: "1.0.0",
    description: "Preservação da memória técnica, consulta a ADRs, topologia de módulos e auditoria de saúde documental.",
    skills: ["documentacao", "arquitetura", "adr", "guardian", "topologia", "engenharia"],
    priority: 88,
    enabled: true,
  };

  canHandle(task: AthenaTask): boolean {
    const p = task.rawPrompt.toLowerCase();
    return (
      p.includes("documentacao") ||
      p.includes("arquitetura") ||
      p.includes("adr") ||
      p.includes("como funciona") ||
      p.includes("guardian") ||
      p.includes("por que criamos") ||
      p.includes("technical archive") ||
      p.includes("handbook")
    );
  }

  async execute(task: AthenaTask, context: AthenaContext): Promise<AgentResult> {
    const health = documentationGuardian.assessHealth();
    const content = `🏛️ **Síntese Técnica da Arquitetura (Archivist & Documentation Guardian):**\n\n• **Saúde documental:** ${health.score}% (${health.status}), conforme avaliação local atual do Documentation Guardian.\n• **Inventário observado:** ${health.runtimeAudits.totalRoutes} rotas, ${health.runtimeAudits.totalTools} ferramentas registradas, ${health.runtimeAudits.totalAgents} agentes, ${health.runtimeAudits.totalModules} módulos, ${health.runtimeAudits.totalADRs} ADRs e ${health.runtimeAudits.totalRegressionTests} casos de regressão.\n• **Limite desta resposta:** a avaliação verifica consistência do catálogo registrado; não prova, por si só, que cada documento foi sincronizado externamente ou que cada funcionalidade está operacional.`;

    return {
      agentId: this.manifest.id,
      agentName: this.manifest.name,
      role: this.manifest.role,
      success: true,
      content,
      confidence: 0.95,
      recommendations: [
        "Acessar o Technical Archive no menu lateral para leitura dos 20 capítulos do Handbook",
        "Inspecionar os ADR-001 a ADR-006 para detalhes das decisões de engenharia",
      ],
    };
  }
}

export const archivistAgent = new ArchivistAgent();
