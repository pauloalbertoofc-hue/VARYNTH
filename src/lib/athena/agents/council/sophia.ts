import { AthenaAgent, AgentManifest } from "../base-agent";
import { AthenaTask } from "../../domain/task";
import { AthenaContext } from "../../domain/context";
import { AgentResult } from "../../domain/result";

export class SophiaAgent implements AthenaAgent {
  manifest: AgentManifest = {
    id: "sophia",
    name: "Sophia",
    role: "Especialista em Redação, Comunicação & Síntese Textual",
    version: "2.0.0",
    description: "Clareza expositiva, fluidez argumentativa, redação acadêmica/institucional e estruturação de narrativas.",
    skills: ["redacao", "escrita", "sintese", "revisao_textual", "comunicacao", "artigos", "ensaios"],
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

    return {
      agentId: this.manifest.id,
      agentName: this.manifest.name,
      role: this.manifest.role,
      success: true,
      content,
      confidence: 0.9,
      recommendations: ["Eliminar redundâncias e prolixidade", "Usar conectivos lógicos explícitos"],
    };
  }
}

export const sophiaAgent = new SophiaAgent();

