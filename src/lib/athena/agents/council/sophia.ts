import { AthenaAgent, AgentManifest } from "../base-agent";
import { AthenaTask } from "../../domain/task";
import { AthenaContext } from "../../domain/context";
import { AgentResult } from "../../domain/result";
import { assessSourceGovernance } from "../../quality/source-governance";

export class SophiaAgent implements AthenaAgent {
  manifest: AgentManifest = {
    id: "sophia",
    name: "Sophia",
    role: "Especialista em Língua Portuguesa, Semântica & Síntese Textual",
    version: "2.1.0",
    description: "Português brasileiro, semântica, coerência, tipologia textual, citações e estruturação de textos verificáveis.",
    skills: ["portugues", "semantica", "tipologia_textual", "redacao", "escrita", "sintese", "revisao_textual", "citacoes", "artigos", "ensaios"],
    priority: 80,
    enabled: true,
  };

  canHandle(task: AthenaTask): boolean {
    const p = task.rawPrompt.toLowerCase();
    return (
      p.includes("escrever") ||
      p.includes("redigir") ||
      p.includes("rascunho") ||
      p.includes("sintese") ||
      p.includes("resumo") ||
      p.includes("texto") ||
      p.includes("portugues") ||
      p.includes("semantica") ||
      p.includes("tipo textual") ||
      p.includes("apresentacao")
    );
  }

  async execute(task: AthenaTask, context: AthenaContext): Promise<AgentResult> {
    const project = context.activeProject;
    let content = `🖋️ **Estruturação Textual & Síntese (Sophia):**\n\n`;

    if (project) {
      content += `Com base no contexto do projeto **"${project.title}"**:\n\n`;
      content += `**1. Introdução / Contextualização:**\nApresentar o problema central delimitando os objetivos da entrega.\n\n`;
      content += `**2. Desenvolvimento Argumentativo:**\nOrganizar as seções lógicas conectando as evidências catalogadas com a tese proposta.\n\n`;
      content += `**3. Conclusão & Próximos Passos:**\nSintetizar as deliberações e indicar o impacto prático do trabalho.`;
    } else {
      content += `Proposta de estrutura de redação focada em clareza, concisão e densidade de conteúdo:\n\n• **Tese Central:** Enunciado direto sem ambiguidades.\n• **Fundamentação:** Parágrafos coesos com citações precisas.\n• **Fechamento:** Síntese propositiva.`;
    }

    const references = [...context.relevantVaultItems.map((item) => `${item.title}${item.chapters?.[0] ? ` — ${item.chapters[0]}` : ""}`), ...context.relevantEvidences.map((item) => item.source)].slice(0, 8);
    if (references.length) content += `\n\n**Referências consultáveis:**\n${references.map((reference) => `- ${reference}`).join("\n")}`;
    else content += "\n\n**Referências:** antes de afirmar fatos, registre fontes no Research ou no Vault; sem fonte, o texto deve ser tratado como rascunho interpretativo.";
    const governance = assessSourceGovernance(content, references);
    return {
      agentId: this.manifest.id,
      agentName: this.manifest.name,
      role: this.manifest.role,
      success: true,
      content,
      confidence: 0.9,
      sources: references,
      metadata: { sourceGovernance: governance },
      recommendations: ["Eliminar redundâncias e prolixidade", "Usar conectivos lógicos explícitos", "Distinguir fato citado de interpretação e manter referência acessível"],
    };
  }
}

export const sophiaAgent = new SophiaAgent();
