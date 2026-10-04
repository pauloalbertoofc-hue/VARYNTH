import { AthenaAgent, AgentManifest } from "../base-agent";
import { AthenaTask } from "../../domain/task";
import { AthenaContext } from "../../domain/context";
import { AgentResult } from "../../domain/result";
import { renderAgentPersona, resolveAgentFollowUp, converseAsSpecialist } from "../base-agent";
import { formatExperienceMethodHints, relevantExperienceGuidance } from "../experience-guidance";

export class CuradorPesquisaAgent implements AthenaAgent {
  get personalityPrompt(): string { return renderAgentPersona(this.manifest); }
  manifest: AgentManifest = {
    id: "curador-pesquisa",
    name: "Lumen",
    role: "Especialista em Pesquisa, Fontes e Evidências",
    version: "1.0.0",
    description: "Organiza pesquisas recebidas pela Athena ou pelo usuário, qualifica fontes e conecta evidências ao Vault e ao Research.",
    skills: ["pesquisa", "fontes", "evidencias", "noticias", "curadoria", "bibliografia"],
    priority: 91,
    enabled: true,
    persona: { identity: "Sou Lumen; organizo trilhas de pesquisa e qualifico evidências sem me apresentar como busca externa quando não pesquisei.", home: "Research, fontes, Evidence Board e ligação de pesquisa ao Vault", voice: "investigativa, didática e explícita sobre incerteza", approach: "organizo pergunta, tipo de fonte, força do suporte e próximo passo", evidenceBoundary: "afirmações factuais vêm das evidências recebidas; sem achados, entrego método de busca, não resultados", authorityBoundary: "não consulto a web nem cadastro evidências neste agente; qualquer coleta ou gravação requer fluxo próprio" },
  };

  canHandle(task: AthenaTask): boolean {
    return /\b(pesquisa|pesquisar|fonte|fontes|noticia|notícias|evidencia|evidência|artigo|estudo|bibliografia)\b/i.test(task.rawPrompt);
  }

  async converseWithFeedback(task: AthenaTask, context: AthenaContext): Promise<AgentResult> { return converseAsSpecialist(this, task, context); }

  async execute(task: AthenaTask, context: AthenaContext): Promise<AgentResult> {
    const resolved = resolveAgentFollowUp(task.rawPrompt.trim(), context);
    const priorOutcomes = relevantExperienceGuidance(context, this.manifest.id);
    const evidence = context.relevantEvidences.slice(0, 6);
    const sources = evidence.map((item) => item.source);
    const strengths = evidence.reduce<Record<string, number>>((counts, item) => { counts[item.strength] = (counts[item.strength] || 0) + 1; return counts; }, {});
    const content = evidence.length
      ? `🔎 **Evidências recebidas para “${resolved.prompt}”**\n\nEncontrei ${evidence.length} registro(s) no contexto do Research. A classificação de força é a já atribuída no acervo e não foi reavaliada independentemente.\n\n${evidence.map((item) => `- **${item.source}** (${item.strength}${item.page ? `, p. ${item.page}` : ""}): ${item.claim}\n  Trecho: “${item.quote}”`).join("\n")}\n\nNão realizei pesquisa externa nem registrei novos achados.`
      : `🔎 **A pergunta ainda precisa de fontes**\n\nNão recebi evidências catalogadas para “${resolved.prompt}”. Isso não significa que não existam estudos: esta execução não pesquisou a web. Posso ajudar a definir uma busca com bases, termos, recorte temporal e critérios de inclusão.`;
    const groundedContent = content + formatExperienceMethodHints(priorOutcomes);
    return { agentId: this.manifest.id, agentName: this.manifest.name, role: this.manifest.role, success: true, confidence: evidence.length ? 0.62 : 0.28, content: groundedContent, sources, metadata: { evidenceCount: evidence.length, recordedStrengths: strengths, externalSearchPerformed: false, writesPerformed: false, conversationReferenceResolved: resolved.usedHistory, priorOutcomeHints: priorOutcomes.length }, recommendations: evidence.length ? ["Conferir método e contexto de cada fonte antes de sintetizar resultados"] : ["Delimitar bases, termos e período de busca"] };
  }
}

export const curadorPesquisaAgent = new CuradorPesquisaAgent();
