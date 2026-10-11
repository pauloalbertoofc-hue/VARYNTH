import { AthenaAgent, AgentManifest } from "../base-agent";
import { AthenaTask } from "../../domain/task";
import { AthenaContext } from "../../domain/context";
import { AgentResult } from "../../domain/result";

export class CritiasAgent implements AthenaAgent {
  responseMethod = "Na crítica, avalie o material concreto apresentado e aponte trechos ou premissas que sustentam cada objeção. Se só houver um pedido sem proposta, texto ou evidência para revisar, não fabrique falhas: diga exatamente o que precisa receber. Diferencie risco possível de erro demonstrado.";
  manifest: AgentManifest = {
    id: "critias",
    name: "Critias",
    role: "Especialista em Crítica, Revisão Rigorosa & Contra-argumentação",
    version: "2.0.0",
    description: "Identificação de falhas lógicas, viés de confirmação, riscos ocultos e validação pré-entrega no Reflection Engine.",
    skills: ["critica", "revisao", "validacao", "contra_argumento", "riscos", "consistencia_logica"],
    priority: 95,
    enabled: true,
  };

  canHandle(task: AthenaTask): boolean {
    const p = task.rawPrompt.toLowerCase();
    return (
      p.includes("critica") ||
      p.includes("revisar") ||
      p.includes("validar") ||
      p.includes("risco") ||
      p.includes("ponto fraco") ||
      p.includes("contra")
    );
  }

  async execute(task: AthenaTask, context: AthenaContext): Promise<AgentResult> {
    const hasReviewMaterial = context.relevantEvidences.length > 0 || context.relevantTheses.length > 0 || context.relevantVaultItems.some((item) => Boolean(item.content || item.summary));
    const content = hasReviewMaterial
      ? `🔍 **Escopo da revisão**\n\nRecebi ${context.relevantTheses.length} tese(s), ${context.relevantEvidences.length} registro(s) de evidência e ${context.relevantVaultItems.filter((item) => Boolean(item.content || item.summary)).length} item(ns) do Vault com conteúdo ou resumo. Posso apontar riscos a partir desses registros, mas preciso delimitar qual deles você quer revisar; a lista disponível, por si só, não prova uma falha específica.`
      : `🔍 **Ainda não tenho material concreto para criticar.** Pelo pedido “${task.rawPrompt}”, entendo que você quer uma revisão rigorosa, mas não recebi aqui o texto, argumento ou proposta a avaliar. Envie o material (ou indique a tese específica) e eu separo problemas demonstráveis de riscos hipotéticos.`;

    return {
      agentId: this.manifest.id,
      agentName: this.manifest.name,
      role: this.manifest.role,
      success: true,
      content,
      confidence: hasReviewMaterial ? 0.45 : 0.2,
      recommendations: hasReviewMaterial ? ["Indique qual tese, evidência ou item deve ser o objeto da revisão."] : ["Envie ou selecione o texto, argumento ou proposta que deseja revisar."],
      metadata: { reviewMaterialAvailable: hasReviewMaterial, substantiveReviewPerformed: false },
    };
  }

  async review(result: AgentResult, context: AthenaContext): Promise<AgentResult> {
    const flaws: string[] = [];
    if (!result.content || result.content.length < 20) {
      flaws.push("Conteúdo superficial ou excessivamente conciso");
    }

    return {
      ...result,
      criticism: flaws.length > 0 ? flaws : ["Revisão limitada a uma checagem de presença e extensão; coerência factual e substantiva não foram avaliadas."],
      confidence: flaws.length > 0 ? result.confidence * 0.9 : result.confidence,
    };
  }
}

export const critiasAgent = new CritiasAgent();

