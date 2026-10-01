import { AthenaAgent, AgentManifest } from "../base-agent";
import { AthenaTask } from "../../domain/task";
import { AthenaContext } from "../../domain/context";
import { AgentResult } from "../../domain/result";
import { renderAgentPersona } from "../base-agent";
import { formatExperienceMethodHints, relevantExperienceGuidance } from "../experience-guidance";

export class LogosAgent implements AthenaAgent {
  get personalityPrompt(): string { return renderAgentPersona(this.manifest); }
  manifest: AgentManifest = {
    id: "logos",
    name: "Logos",
    role: "Especialista em Metodologia Científica & Análise de Evidências",
    version: "2.0.0",
    description: "Validação de hipóteses, estruturação empírica, análise de dados e cruzamento de evidências científicas.",
    skills: ["ciencia", "pesquisa", "evidencias", "metodologia", "estatistica", "artigo_cientifico", "abnt"],
    priority: 85,
    enabled: true,
    persona: { identity: "Sou Logos; avalio como uma afirmação é sustentada e onde a evidência ainda é fraca.", home: "Research, Evidence Board, Vault e metodologia científica", voice: "analítica, transparente e cautelosa", approach: "distingo afirmação, fonte, força da evidência e inferência", evidenceBoundary: "só trato como achados as evidências recebidas; ausência de evidência catalogada não prova ausência de estudos", authorityBoundary: "não conduzo busca externa nem cadastro fontes nesta execução; recomendações não são ações realizadas" },
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
    const priorOutcomes = relevantExperienceGuidance(context, this.manifest.id);
    const evidences = context.relevantEvidences;
    const strongEvs = evidences.filter((e) => e.strength === "forte");
    const moderateEvs = evidences.filter((e) => e.strength === "moderada");
    const preliminaryEvs = evidences.filter((e) => e.strength === "preliminar");
    const refutedEvs = evidences.filter((e) => e.strength === "refutada");

    let content = `🔬 **Análise Metodológica & Científica (Logos):**\n\n`;

    if (evidences.length > 0) {
      content += `Para “${task.title}”, o contexto contém **${evidences.length} registros**: ${strongEvs.length} fortes, ${moderateEvs.length} moderados, ${preliminaryEvs.length} preliminares e ${refutedEvs.length} refutados. A classificação é a registrada no Evidence Board, não uma replicação independente.\n\n`;
      if (strongEvs.length > 0) {
        content += `📌 **Evidência Central em Destaque:**\n> *"${strongEvs[0].claim}"*\n> *(Fonte: ${strongEvs[0].source})*\n\n`;
      }
      if (refutedEvs.length) content += `⚠️ **Contraponto registrado:** ${refutedEvs.slice(0, 2).map((item) => `“${item.claim}” (${item.source})`).join("; ")}\n\n`;
      content += `• **Leitura:** a força registrada indica o suporte atribuído, mas não resolve validade, viés, desenho ou replicabilidade. Para uma conclusão causal, faltam desenho e método de análise explícitos.`;
    } else {
      content += `Ainda não recebi evidências catalogadas para este pedido; isso não demonstra que não existam estudos. Posso ajudar a formular a pergunta e o protocolo de busca, mas não alegar achados sem fontes.`;
    }
    content += formatExperienceMethodHints(priorOutcomes);

    return {
      agentId: this.manifest.id,
      agentName: this.manifest.name,
      role: this.manifest.role,
      success: true,
      content,
      confidence: evidences.length ? 0.68 : 0.25,
      metadata: { evidenceCount: evidences.length, strengthCounts: { strong: strongEvs.length, moderate: moderateEvs.length, preliminary: preliminaryEvs.length, refuted: refutedEvs.length }, externalSearchPerformed: false, priorOutcomeHints: priorOutcomes.length },
      sources: evidences.map((e) => e.source),
      recommendations: [
        "Indexar novas referências no Vault",
        "Confrontar hipótese nula antes da conclusão",
      ],
    };
  }
}

export const logosAgent = new LogosAgent();

