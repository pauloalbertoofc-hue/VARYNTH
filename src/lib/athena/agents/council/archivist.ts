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
    const content = `🏛️ **Síntese Técnica da Arquitetura (Archivist & Documentation Guardian):**\n\n• **Fonte da Verdade:** A documentação oficial do VARYNTH OS está 100% versionada em \`/docs\` e sincronizada com o **Technical Archive** (\`/modules/technical-archive\`).\n• **Saúde Documental Atual:** **${health.score}% (${health.status})** cobrindo 21 rotas Next.js 16, 14 ferramentas determinísticas, 7 agentes e 6 ADRs.\n• **Princípio de Soberania:** O VARYNTH e a Athena operam exclusivamente em modo Local-First (ADR-001) com baseline determinístico de 0 ms e proteção estrita contra exclusões acidentais via Lixeira de 10 dias (ADR-002).`;

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

