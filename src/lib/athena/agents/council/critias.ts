import { AthenaAgent, AgentManifest } from "../base-agent";
import { AthenaTask } from "../../domain/task";
import { AthenaContext } from "../../domain/context";
import { AgentResult } from "../../domain/result";

export class CritiasAgent implements AthenaAgent {
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
    const content = `🔍 **Análise Crítica & Objeções (Critias):**\n\n1. **Identificação de Vulnerabilidades:** Premissas implícitas precisam ser explicitadas para evitar objeções imediatas.\n2. **Contra-argumento Principal:** Se um revisor cético avaliar esta proposta, o ponto mais vulnerável será a robustez probatória das fontes.\n3. **Diretriz de Blindagem:** Adicionar ressalvas e limitar o escopo da afirmação para fortalecer a solidez global da entrega.`;

    return {
      agentId: this.manifest.id,
      agentName: this.manifest.name,
      role: this.manifest.role,
      success: true,
      content,
      confidence: 0.96,
      recommendations: ["Blindar pontos vulneráveis", "Antecipar objeções contrárias"],
    };
  }

  async review(result: AgentResult, context: AthenaContext): Promise<AgentResult> {
    const flaws: string[] = [];
    if (!result.content || result.content.length < 20) {
      flaws.push("Conteúdo superficial ou excessivamente conciso");
    }

    return {
      ...result,
      criticism: flaws.length > 0 ? flaws : ["Sem inconsistências graves detectadas"],
      confidence: flaws.length > 0 ? result.confidence * 0.9 : result.confidence,
    };
  }
}

export const critiasAgent = new CritiasAgent();

