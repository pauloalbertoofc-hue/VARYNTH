import type { AthenaAgent, AgentManifest } from "../base-agent";
import type { AthenaContext } from "../../domain/context";
import type { AgentResult } from "../../domain/result";
import type { AthenaTask } from "../../domain/task";

type QualityReport = {
  sharpness?: number;
  exposure?: number;
  warnings?: string[];
};
type VisualContext = { captureId?: string; mode?: string; capturedAt?: string; source?: string; generated?: boolean; originalAssetId?: string; imageArtifactId?: string };

function suppliedQuality(task: AthenaTask): QualityReport | undefined {
  const value = task.metadata?.visualQuality;
  if (!value || typeof value !== "object") return undefined;
  const report = value as QualityReport;
  const sharpness =
    typeof report.sharpness === "number" && Number.isFinite(report.sharpness)
      ? report.sharpness
      : undefined;
  const exposure =
    typeof report.exposure === "number" && Number.isFinite(report.exposure)
      ? report.exposure
      : undefined;
  const warnings = Array.isArray(report.warnings)
    ? report.warnings
        .filter(
          (warning): warning is string =>
            typeof warning === "string" && Boolean(warning.trim()),
        )
        .map((warning) => warning.trim().slice(0, 240))
        .slice(0, 8)
    : undefined;
  return sharpness !== undefined || exposure !== undefined || warnings?.length
    ? { sharpness, exposure, warnings }
    : undefined;
}

function suppliedVisualContext(task: AthenaTask): VisualContext | undefined {
  const value = task.metadata?.visualContext;
  if (!value || typeof value !== "object") return undefined;
  const input = value as Record<string, unknown>;
  const context: VisualContext = {};
  for (const key of ["captureId", "mode", "capturedAt", "source", "originalAssetId", "imageArtifactId"] as const)
    if (typeof input[key] === "string") context[key] = input[key].slice(0, 160);
  if (typeof input.generated === "boolean") context.generated = input.generated;
  return Object.keys(context).length ? context : undefined;
}

export class PictorAgent implements AthenaAgent {
  manifest: AgentManifest = {
    id: "pictor",
    name: "Pictor",
    role: "Agente visual consultivo subordinado à Athena",
    version: "0.1.0",
    description:
      "Analisa contexto visual fornecido e formula recomendações sem acessar arquivos ou executar operações.",
    skills: ["visual-analysis", "capture-quality", "provenance"],
    priority: 65,
    enabled: true,
  };
  canHandle(task: AthenaTask): boolean {
    return /\b(imagem|visual|foto|fotografia|captura|canvas|cor|nitidez|exposição|exposicao|proveniência|proveniencia)\b/i.test(
      task.rawPrompt,
    );
  }
  async execute(
    task: AthenaTask,
    _context: AthenaContext,
  ): Promise<AgentResult> {
    const quality = suppliedQuality(task);
    const visualContext = suppliedVisualContext(task);
    const recommendations = quality?.warnings?.length
      ? quality.warnings.map((warning) => `Revisar: ${warning}`)
      : [
          "Forneça um relatório de qualidade ou proveniência para uma análise mais específica.",
        ];
    const metrics = quality
      ? ` Nitidez: ${quality.sharpness ?? "não informada"}; exposição: ${quality.exposure ?? "não informada"}.`
      : "";
    const contextSummary = visualContext
      ? ` Contexto recebido: modo ${visualContext.mode ?? "não informado"}, origem ${visualContext.source ?? "não informada"}, captura ${visualContext.capturedAt ?? "não datada"}; apenas metadados e identificadores foram compartilhados.`
      : "";
    return {
      agentId: this.manifest.id,
      agentName: this.manifest.name,
      role: this.manifest.role,
      success: true,
      content: `Pictor recebeu apenas o contexto visual fornecido e não acessou a mídia original.${metrics}${contextSummary}`,
      confidence: quality || visualContext ? 0.75 : 0.35,
      sources: [
        quality
          ? "Relatório visual fornecido na tarefa"
          : visualContext
            ? "Metadados de captura fornecidos na tarefa"
            : "Prompt fornecido na tarefa",
      ],
      recommendations,
      metadata: {
        authority: "advisory-only",
        capabilities: this.manifest.skills,
        toolAccess: false,
        localFileAccess: false,
        visualContextProvided: Boolean(quality || visualContext),
        mediaAccess: "none",
      },
    };
  }
}

export const pictorAgent = new PictorAgent();
