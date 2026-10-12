import type { AthenaAgent, AgentManifest } from "../base-agent";
import type { AthenaContext } from "../../domain/context";
import type { AgentResult } from "../../domain/result";
import type { AthenaTask } from "../../domain/task";

type QualityReport = { sharpness?: number; exposure?: number; warnings?: string[] };

function suppliedQuality(task: AthenaTask): QualityReport | undefined {
  const value = task.metadata?.visualQuality;
  if (!value || typeof value !== "object") return undefined;
  const report = value as QualityReport;
  return typeof report.sharpness === "number" || typeof report.exposure === "number" || Array.isArray(report.warnings) ? report : undefined;
}

export class PictorAgent implements AthenaAgent {
  manifest: AgentManifest = { id: "pictor", name: "Pictor", role: "Agente visual consultivo subordinado à Athena", version: "0.1.0", description: "Analisa contexto visual fornecido e formula recomendações sem acessar arquivos ou executar operações.", skills: ["visual-analysis", "capture-quality", "provenance"], priority: 65, enabled: true };
  canHandle(task: AthenaTask): boolean { return /\b(imagem|visual|foto|fotografia|captura|canvas|cor|nitidez|exposição|exposicao|proveniência|proveniencia)\b/i.test(task.rawPrompt); }
  async execute(task: AthenaTask, _context: AthenaContext): Promise<AgentResult> {
    const quality = suppliedQuality(task);
    const recommendations = quality?.warnings?.length ? quality.warnings.map((warning) => `Revisar: ${warning}`) : ["Forneça um relatório de qualidade ou proveniência para uma análise mais específica."];
    const metrics = quality ? ` Nitidez: ${quality.sharpness ?? "não informada"}; exposição: ${quality.exposure ?? "não informada"}.` : "";
    return { agentId: this.manifest.id, agentName: this.manifest.name, role: this.manifest.role, success: true, content: `Pictor recebeu apenas o contexto visual fornecido e não acessou a mídia original.${metrics}`, confidence: quality ? 0.75 : 0.35, sources: [quality ? "Relatório visual fornecido na tarefa" : "Prompt fornecido na tarefa"], recommendations, metadata: { authority: "advisory-only", capabilities: this.manifest.skills, toolAccess: false, localFileAccess: false, visualContextProvided: Boolean(quality) } };
  }
}

export const pictorAgent = new PictorAgent();
