import { AthenaAgent, AgentManifest } from "../base-agent";
import { AthenaTask } from "../../domain/task";
import { AthenaContext } from "../../domain/context";
import { AgentResult } from "../../domain/result";

export class JustitiaAgent implements AthenaAgent {
  responseMethod = "Em matéria jurídica, delimite jurisdição, período e fatos conhecidos. Diferencie informação geral de aplicação ao caso; não chame uma fonte de vinculante, vigente ou verificada se o contexto não prova isso. Se faltarem fatos ou fontes atuais, apresente uma análise preliminar com esse limite e pergunte apenas o dado que mudaria a conclusão.";
  manifest: AgentManifest = {
    id: "justitia",
    name: "Justitia",
    role: "Especialista em Direito, Legislação & Hermenêutica Jurídica",
    version: "2.0.0",
    description: "Análise dogmática, jurisprudencial, precedentes do STF/STJ e estruturação de teses jurídicas na Argument Arena.",
    skills: ["direito", "legislacao", "jurisprudencia", "precedentes", "stf", "stj", "argumentacao_juridica"],
    priority: 90,
    enabled: true,
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

    let content = `⚖️ **Análise jurídica preliminar**\n\n`;

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
        content += `• **Precedentes registrados na tese (vinculação não verificada):** ${thesis.precedents.join(", ")}\n`;
      }
    } else {
      content += `Não recebi uma tese formal da Argument Arena nem fontes jurídicas correspondentes no contexto. Por isso, ainda não há base para afirmar qual regra ou precedente se aplica. Se você trouxer a jurisdição e os fatos centrais (ou selecionar as fontes), posso estruturar a análise.`;
    }

    if (vaultLegal.length > 0) {
      content += `\n\n📚 **Itens jurídicos relacionados no Vault (não verificados quanto à vigência nesta resposta):**\n${vaultLegal.map((v) => `• ${v.title} (${v.author || "autoria não informada"})`).join("\n")}`;
    }

    return {
      agentId: this.manifest.id,
      agentName: this.manifest.name,
      role: this.manifest.role,
      success: true,
      content,
      confidence: thesis ? 0.68 : 0.3,
      sources: [...(thesis?.precedents || []), ...vaultLegal.map((item) => item.title)],
      recommendations: thesis ? ["Confirmar vigência e jurisdição das fontes antes de usar esta análise em uma decisão.", "Confrontar os argumentos contrários registrados na tese."] : ["Informe a jurisdição e os fatos relevantes ou selecione uma fonte jurídica do acervo."],
      metadata: { formalThesisAvailable: Boolean(thesis), vaultLegalItemCount: vaultLegal.length, currentLawVerified: false },
    };
  }
}

export const justitiaAgent = new JustitiaAgent();
