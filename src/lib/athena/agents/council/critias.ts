import { AthenaAgent, AgentManifest } from "../base-agent";
import { AthenaTask } from "../../domain/task";
import { AthenaContext } from "../../domain/context";
import { AgentResult } from "../../domain/result";
import { renderAgentPersona, resolveAgentFollowUp } from "../base-agent";
import { agentGuidanceInstruction, confirmedAgentGuidance } from "../experience-guidance";

export class CritiasAgent implements AthenaAgent {
  get personalityPrompt(): string { return renderAgentPersona(this.manifest); }
  manifest: AgentManifest = {
    id: "critias",
    name: "Critias",
    role: "Especialista em Crítica, Revisão Rigorosa & Contra-argumentação",
    version: "2.0.0",
    description: "Identificação de falhas lógicas, viés de confirmação, riscos ocultos e validação pré-entrega no Reflection Engine.",
    skills: ["critica", "revisao", "validacao", "contra_argumento", "riscos", "consistencia_logica"],
    priority: 95,
    enabled: true,
    persona: { identity: "Sou Critias; testo a proposta contra objeções reais, sem fabricar defeitos só para parecer rigoroso.", home: "Revisão crítica, riscos, consistência lógica e Reflection Engine", voice: "franca, respeitosa e exigente", approach: "aponto trecho ou premissa, explico o risco e proponho uma forma verificável de resolver", evidenceBoundary: "limito a crítica ao material recebido; quando o argumento não foi fornecido, peço-o em vez de simular uma revisão", authorityBoundary: "a revisão é consultiva; não altero nem rejeito artefatos em nome da pessoa" },
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
    const resolved = resolveAgentFollowUp(task.rawPrompt.trim(), context);
    const quoted = resolved.prompt.match(/[“"]([^”"]{12,})[”"]/)?.[1];
    const statedObject = resolved.prompt.match(/(?:minha|esta|a)\s+(?:ideia|proposta|tese|hip[oó]tese|plano|argumento)\s*(?:é|:|sobre)\s*(.+?)(?:[.!?]|$)/i)?.[1];
    const candidate = quoted || statedObject || (context.activeProject?.description ? `${context.activeProject.title}: ${context.activeProject.description}` : undefined);
    const lens = confirmedAgentGuidance(context, this.manifest.id, "critiqueLens", resolved.prompt);
    const lensQuestion = lens === "logic" ? "A conclusão decorre das premissas ou há um salto inferencial?" : lens === "usability" ? "A proposta é compreensível e utilizável pelas pessoas a quem se destina?" : lens === "risk" ? "Que dano plausível, reversibilidade ou contingência precisa ser examinada?" : "Que evidência sustentaria a afirmação e que observação poderia refutá-la?";
    const content = candidate
      ? `🔍 **Revisão crítica do material recebido**\n\nObjeto: “${candidate}”\n\nNão recebi critérios ou evidências específicas além desse enunciado. Portanto, não afirmo que encontrei uma falha. Para testar a proposta, precisamos perguntar: ${lensQuestion} Também é necessário identificar se a conclusão depende de uma premissa ainda não verificada. A vulnerabilidade atual é **lacuna de evidência no contexto recebido**, não prova de que a tese esteja errada.`
      : `🔍 **Posso fazer uma revisão rigorosa, mas falta o objeto.** Não recebi texto, hipótese ou plano concreto para testar. Envie a afirmação e, se houver, as fontes e os critérios de sucesso; sem isso, apontar “falhas” seria inventar crítica.`;

    return {
      agentId: this.manifest.id,
      agentName: this.manifest.name,
      role: this.manifest.role,
      success: true,
      content,
      confidence: candidate ? 0.52 : 0.2,
      recommendations: candidate ? ["Fornecer evidências e critério de refutação para avaliar a proposta"] : ["Enviar a proposta ou texto que deseja revisar"],
      metadata: { reviewedProvidedMaterial: Boolean(candidate), verifiedDefect: false, conversationReferenceResolved: resolved.usedHistory, critiqueLens: lens, appliedExperienceGuidance: agentGuidanceInstruction(context, this.manifest.id, resolved.prompt) },
    };
  }

  async review(result: AgentResult, context: AthenaContext): Promise<AgentResult> {
    const flaws: string[] = [];
    if (!result.content || result.content.length < 20) {
      flaws.push("Conteúdo superficial ou excessivamente conciso");
    }
    if (result.success && result.confidence > 0.8 && (!result.sources?.length || /não recebi|falta o objeto|não posso/i.test(result.content))) {
      flaws.push("Confiança desproporcional ou afirmação não sustentada pelo contexto");
    }

    return {
      ...result,
      criticism: flaws.length > 0 ? flaws : ["Esta verificação superficial não detectou problemas estruturais óbvios; não equivale a validação factual ou jurídica."],
      confidence: flaws.length > 0 ? result.confidence * 0.9 : result.confidence,
    };
  }
}

export const critiasAgent = new CritiasAgent();

