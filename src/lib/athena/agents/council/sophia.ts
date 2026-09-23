import { AthenaAgent, AgentManifest } from "../base-agent";
import { AthenaTask } from "../../domain/task";
import { AthenaContext } from "../../domain/context";
import { AgentResult } from "../../domain/result";
import { assessSourceGovernance } from "../../quality/source-governance";
import { renderAgentPersona } from "../base-agent";

export class SophiaAgent implements AthenaAgent {
  get personalityPrompt(): string { return renderAgentPersona(this.manifest); }
  manifest: AgentManifest = {
    id: "sophia",
    name: "Sophia",
    role: "Especialista em Língua Portuguesa, Semântica & Síntese Textual",
    version: "2.1.0",
    description: "Português brasileiro, semântica, coerência, tipologia textual, citações e estruturação de textos verificáveis.",
    skills: ["portugues", "semantica", "tipologia_textual", "redacao", "escrita", "sintese", "revisao_textual", "citacoes", "artigos", "ensaios"],
    priority: 80,
    enabled: true,
    persona: { identity: "Sou Sophia; ajudo a expressar com clareza a ideia que você quer comunicar, sem trocar sua tese pela minha.", home: "Redação, revisão, síntese e estruturação de textos", voice: "clara, elegante e adaptável ao público", approach: "preservo intenção, organizo argumento e sinalizo lacunas de fonte", evidenceBoundary: "referências listadas são apenas materiais recebidos, não validação automática das afirmações", authorityBoundary: "rascunhos são propostas editáveis; não publico nem altero documentos" },
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

    const prompt = task.rawPrompt.trim();
    const requestedText = prompt.match(/[“"]([^”"]{12,})[”"]/)?.[1];
    if (requestedText) {
      content += `Trecho fornecido para revisão:\n> ${requestedText}\n\n`;
      const sentences = requestedText.split(/(?<=[.!?])\s+/).filter(Boolean);
      content += `Encontrei ${sentences.length} frase(s) no trecho. ${sentences.length > 1 ? "Revise a transição entre as frases para explicitar a relação lógica." : "Com apenas uma frase, não avalio coesão entre parágrafos."}`;
    } else if (project) {
      content += `O projeto ativo é **“${project.title}”**. ${project.description ? `A descrição disponível é: ${project.description}` : "Não recebi uma descrição do projeto."}\n\nPara redigir o texto solicitado, diga o formato e o público-alvo; não vou preencher conteúdo substantivo nem fontes que você não forneceu.`;
    } else {
      content += `Ainda não recebi um trecho, tese ou tema suficientemente delimitado para escrever o material pedido. Envie o texto a revisar ou indique tema, formato e público; posso então produzir um rascunho identificando interpretações e lacunas.`;
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
      confidence: requestedText ? 0.62 : project ? 0.4 : 0.25,
      sources: references,
      metadata: { sourceGovernance: governance },
      recommendations: ["Eliminar redundâncias e prolixidade", "Usar conectivos lógicos explícitos", "Distinguir fato citado de interpretação e manter referência acessível"],
    };
  }
}

export const sophiaAgent = new SophiaAgent();
