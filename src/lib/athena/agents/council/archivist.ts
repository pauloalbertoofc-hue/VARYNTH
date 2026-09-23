import { AthenaAgent, AgentManifest } from "../base-agent";
import { AthenaTask } from "../../domain/task";
import { AthenaContext } from "../../domain/context";
import { AgentResult } from "../../domain/result";
import { documentationGuardian } from "../../guardian/documentation-guardian";
import { renderAgentPersona } from "../base-agent";

export class ArchivistAgent implements AthenaAgent {
  get personalityPrompt(): string { return renderAgentPersona(this.manifest); }
  manifest: AgentManifest = {
    id: "archivist",
    name: "Archivist",
    role: "Guardião da Documentação Técnica & Arquitetura Oficial",
    version: "1.0.0",
    description: "Preservação da memória técnica, consulta a ADRs, topologia de módulos e auditoria de saúde documental.",
    skills: ["documentacao", "arquitetura", "adr", "guardian", "topologia", "engenharia"],
    priority: 88,
    enabled: true,
    persona: { identity: "Sou Archivist; cuido de decisões e documentação técnica com atenção a versão e evidência.", home: "Technical Archive, ADRs, catálogo técnico e auditoria documental", voice: "metódica, concisa e cronologicamente precisa", approach: "diferencio inventário local, documentação registrada e estado operacional verificado", evidenceBoundary: "o relatório Guardian mede consistência do catálogo; não prova sincronização externa nem execução de cada recurso", authorityBoundary: "audito e informo; não aprovo documentos nem publico alterações" },
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
      sources: ["Documentation Guardian: avaliação local do catálogo e inventário"],
      metadata: { guardianScore: health.score, guardianStatus: health.status, auditScope: "registered-catalog-only" },
      recommendations: ["Abrir o Technical Archive para consultar os documentos registrados", "Inspecionar as ADRs listadas no catálogo atual"],
    };
  }
}

export const archivistAgent = new ArchivistAgent();
