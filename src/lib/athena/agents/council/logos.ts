import { AthenaAgent, AgentManifest } from "../base-agent";
import { AthenaTask } from "../../domain/task";
import { AthenaContext } from "../../domain/context";
import { AgentResult } from "../../domain/result";
import { renderAgentPersona, resolveAgentFollowUp, converseAsSpecialist } from "../base-agent";
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

  async converseWithFeedback(task: AthenaTask, context: AthenaContext): Promise<AgentResult> { return converseAsSpecialist(this, task, context); }

  async execute(task: AthenaTask, context: AthenaContext): Promise<AgentResult> {
    const resolved = resolveAgentFollowUp(task.rawPrompt.trim(), context);
    const priorOutcomes = relevantExperienceGuidance(context, this.manifest.id);
    const evidences = context.relevantEvidences;
    const strongEvs = evidences.filter((e) => e.strength === "forte");
    const moderateEvs = evidences.filter((e) => e.strength === "moderada");
    const preliminaryEvs = evidences.filter((e) => e.strength === "preliminar");
    const refutedEvs = evidences.filter((e) => e.strength === "refutada");

    let content = `🔬 **Análise Metodológica & Científica (Logos):**\n\n`;

    if (evidences.length > 0) {
      content += `O pacote recebido contém **${evidences.length} registros**: ${strongEvs.length} classificados como fortes, ${moderateEvs.length} moderados, ${preliminaryEvs.length} preliminares e ${refutedEvs.length} refutados. Essas classes são as registradas no Evidence Board, não uma replicação independente.\n\n`;
      content += `A pertinência de cada registro à pergunta “${resolved.prompt}” e a natureza primária das fontes não foram verificadas nesta execução. Trate os itens abaixo como candidatos a triagem, não como resposta já validada.\n\n`;
      if (strongEvs.length > 0) {
        content += `📌 **Exemplo de registro classificado como forte no acervo** (isso não confirma que seja central ou pertinente à pergunta):\n> *"${strongEvs[0].claim}"*\n> *(Fonte registrada: ${strongEvs[0].source})*\n\n`;
      }
      if (refutedEvs.length) content += `⚠️ **Registros marcados como refutados no acervo** (pertinência à pergunta não verificada): ${refutedEvs.slice(0, 2).map((item) => `“${item.claim}” (${item.source})`).join("; ")}\n\n`;
      content += `• **Leitura:** a classificação do acervo não resolve pertinência temática, validade, viés, desenho ou replicabilidade. Antes de sintetizar, confirme quais registros respondem à pergunta e confira método e fonte original.`;
    } else {
      content += `Ainda não recebi evidências catalogadas para “${resolved.prompt}”; isso não demonstra que não existam estudos. Posso ajudar a formular a pergunta e o protocolo de busca, mas não alegar achados sem fontes.`;
    }
    content += formatExperienceMethodHints(priorOutcomes);

    return {
      agentId: this.manifest.id,
      agentName: this.manifest.name,
      role: this.manifest.role,
      success: true,
      content,
      confidence: evidences.length ? 0.42 : 0.25,
      limitations: evidences.length
        ? ["A pertinência dos registros à pergunta atual não foi verificada.", "A natureza primária das fontes não foi verificada.", "As classes de força são as cadastradas no Evidence Board; não houve replicação independente nem busca externa."]
        : ["Nenhuma evidência foi recebida no contexto desta execução.", "Não houve pesquisa externa nem verificação de fontes primárias."],
      metadata: { evidenceCount: evidences.length, strengthCounts: { strong: strongEvs.length, moderate: moderateEvs.length, preliminary: preliminaryEvs.length, refuted: refutedEvs.length }, queryRelevanceVerified: false, primarySourcesVerified: false, externalSearchPerformed: false, conversationReferenceResolved: resolved.usedHistory, priorOutcomeHints: priorOutcomes.length },
      sources: evidences.map((e) => e.source),
      recommendations: evidences.length
        ? ["Confirme quais registros respondem diretamente à pergunta e confira fonte original, método e contexto antes de sintetizar."]
        : ["Delimite a pergunta e indique fontes ou bases para análise; esta execução não pesquisou a web nem cadastrou evidências."],
    };
  }
}

export const logosAgent = new LogosAgent();

