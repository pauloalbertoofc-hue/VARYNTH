import { AthenaAgent, AgentManifest } from "../base-agent";
import { AthenaTask } from "../../domain/task";
import { AthenaContext } from "../../domain/context";
import { AgentResult } from "../../domain/result";

export class LogosAgent implements AthenaAgent {
  manifest: AgentManifest = {
    id: "logos",
    name: "Logos",
    role: "Especialista em Metodologia Científica & Análise de Evidências",
    version: "2.0.0",
    description: "Validação de hipóteses, estruturação empírica, análise de dados e cruzamento de evidências científicas.",
    skills: ["ciencia", "pesquisa", "evidencias", "metodologia", "estatistica", "artigo_cientifico", "abnt"],
    priority: 85,
    enabled: true,
  };

  canHandle(task: AthenaTask, context: AthenaContext): boolean {
    if (context.scope === "pesquisa") return true;
    const p = task.rawPrompt.toLowerCase();
    return (
      p.includes("pesquisa") ||
      p.includes("evidencia") ||
      p.includes("artigo") ||
      p.includes("metodologia") ||
      p.includes("hipotese") ||
      p.includes("dados") ||
      p.includes("abnt") ||
      p.includes("qualis")
    );
  }

  async execute(task: AthenaTask, context: AthenaContext): Promise<AgentResult> {
    const evidences = context.relevantEvidences;
    const strongEvs = evidences.filter((e) => e.strength === "forte");

    let content = `🔬 **Análise Metodológica & Científica (Logos):**\n\n`;

    if (evidences.length > 0) {
      content += `Localizei **${evidences.length} evidências catalogadas** no Evidence Board (${strongEvs.length} de alta robustez probatória).\n\n`;
      if (strongEvs.length > 0) {
        content += `📌 **Evidência Central em Destaque:**\n> *"${strongEvs[0].claim}"*\n> *(Fonte: ${strongEvs[0].source})*\n\n`;
      }
      content += `• **Recomendação Epistêmica:** Garanta a replicabilidade das fontes e estruture a discussão confrontando variáveis intervenientes.`;
    } else {
      content += `Para estruturar uma investigação rigorosa, recomendo cadastrar as fontes primárias e secundárias no Evidence Board, classificando a força do suporte (Forte, Média ou Preliminar).`;
    }

    return {
      agentId: this.manifest.id,
      agentName: this.manifest.name,
      role: this.manifest.role,
      success: true,
      content,
      confidence: 0.92,
      sources: evidences.map((e) => e.source),
      recommendations: [
        "Indexar novas referências no Vault",
        "Confrontar hipótese nula antes da conclusão",
      ],
    };
  }
}

export const logosAgent = new LogosAgent();

