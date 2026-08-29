import { AthenaAgent, AgentManifest } from "../base-agent";
import { AthenaTask } from "../../domain/task";
import { AthenaContext } from "../../domain/context";
import { AgentResult } from "../../domain/result";

export class JustitiaAgent implements AthenaAgent {
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
      content += `Analisei a consulta sob a ótica jurídica. Nenhuma tese formal está aberta na Argument Arena no momento. Recomendo cadastrar a controvérsia para estruturar o quadro dialético com base no acervo de legislação e precedentes do Vault.`;
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
      confidence: 0.95,
      sources: thesis?.precedents || [],
      recommendations: [
        "Verificar conformidade com súmulas vinculantes",
        "Confrontar argumentos contrários no Codex",
      ],
    };
  }
}

export const justitiaAgent = new JustitiaAgent();

