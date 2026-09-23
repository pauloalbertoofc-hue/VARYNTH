import { AthenaAgent, AgentManifest } from "../base-agent";
import { AthenaTask } from "../../domain/task";
import { AthenaContext } from "../../domain/context";
import { AgentResult } from "../../domain/result";
import { renderAgentPersona } from "../base-agent";

export class JustitiaAgent implements AthenaAgent {
  get personalityPrompt(): string { return renderAgentPersona(this.manifest); }
  manifest: AgentManifest = {
    id: "justitia",
    name: "Justitia",
    role: "Especialista em Direito, Legislação & Hermenêutica Jurídica",
    version: "2.0.0",
    description: "Análise dogmática, jurisprudencial, precedentes do STF/STJ e estruturação de teses jurídicas na Argument Arena.",
    skills: ["direito", "legislacao", "jurisprudencia", "precedentes", "stf", "stj", "argumentacao_juridica"],
    priority: 90,
    enabled: true,
    persona: { identity: "Sou Justitia; ajudo a organizar questões jurídicas sem substituir aconselhamento profissional.", home: "Argument Arena, teses jurídicas, precedentes e acervo legal do Vault", voice: "precisa, sóbria e dialética", approach: "separo controvérsia, argumentos favoráveis, objeções e estado das fontes", evidenceBoundary: "uso somente teses, precedentes e itens legais presentes no contexto; não invento lei ou jurisprudência", authorityBoundary: "minha análise é informativa e não constitui parecer profissional nem executa alterações" },
  };

  canHandle(task: AthenaTask, context: AthenaContext): boolean {
    if (context.scope === "juridico") return true;
    const p = task.rawPrompt.toLowerCase();
    return (
      p.includes("direito") ||
      p.includes("tese") ||
      p.includes("lei") ||
      p.includes("stf") ||
      p.includes("stj") ||
      p.includes("jurisprudencia") ||
      p.includes("hermeneutica") ||
      p.includes("hermenêutica") ||
      p.includes("processo") ||
      p.includes("constitucional")
    );
  }

  async execute(task: AthenaTask, context: AthenaContext): Promise<AgentResult> {
    const thesis = context.relevantTheses[0];
    const vaultLegal = context.relevantVaultItems.filter((v) => v.type === "jurisprudencia" || v.type === "lei");

    let content = `⚖️ **Parecer Jurídico (Justitia):**\n\n`;

    if (thesis) {
      content += `Com base na tese ativa **"${thesis.title}"** (Área: ${thesis.area}):\n`;
      content += `• **Controvérsia:** *"${thesis.question}"*\n`;
      if (thesis.pros.length > 0) {
        content += `• **Fundamentação Favorável:** ${thesis.pros.map((p) => p.statement).join("; ")}\n`;
      }
      if (thesis.cons.length > 0) {
        content += `• **Objeções & Riscos:** ${thesis.cons.map((c) => c.statement).join("; ")}\n`;
      }
      if (thesis.precedents.length > 0) {
        content += `• **Precedentes Vinculantes:** ${thesis.precedents.join(", ")}\n`;
      }
    } else {
      content += `Não recebi uma tese formal relevante na Argument Arena. Portanto, ainda não posso avaliar os argumentos concretos do caso. `;
      content += vaultLegal.length
        ? `Há ${vaultLegal.length} item(ns) jurídicos no contexto, listados abaixo; sua pertinência precisa ser conferida em relação à pergunta.`
        : `Também não recebi legislação ou jurisprudência relevante no contexto; não vou inventar normas ou precedentes. Informe a questão jurídica concreta ou selecione fontes do Vault.`;
    }

    if (vaultLegal.length > 0) {
      content += `\n\n📚 **Obras e Precedentes Relacionados no Vault:**\n${vaultLegal.map((v) => `• ${v.title} (${v.author || "Acervo"})`).join("\n")}`;
    }

    return {
      agentId: this.manifest.id,
      agentName: this.manifest.name,
      role: this.manifest.role,
      success: true,
      content,
      confidence: thesis ? 0.82 : vaultLegal.length ? 0.48 : 0.2,
      sources: [...(thesis?.precedents || []), ...vaultLegal.map((item) => item.title)],
      metadata: { analyzedThesisId: thesis?.id, vaultLegalItems: vaultLegal.length, legalAdvice: false },
      recommendations: [
        "Verificar conformidade com súmulas vinculantes",
        "Confrontar argumentos contrários no Codex",
      ],
    };
  }
}

export const justitiaAgent = new JustitiaAgent();
