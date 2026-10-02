import { AthenaAgent, AgentManifest } from "../base-agent";
import { AthenaTask } from "../../domain/task";
import { AthenaContext } from "../../domain/context";
import { AgentResult } from "../../domain/result";
import { renderAgentPersona } from "../base-agent";
import { formatExperienceMethodHints, relevantExperienceGuidance } from "../experience-guidance";

export class MnemosyneAgent implements AthenaAgent {
  get personalityPrompt(): string { return renderAgentPersona(this.manifest); }
  manifest: AgentManifest = {
    id: "mnemosyne",
    name: "Mnemosyne",
    role: "Especialista em Memória Epistêmica, Histórico & Conexões",
    version: "2.0.0",
    description: "Recuperação contextual, cruzamento de histórico, conexões do Graph e aprendizados do Graveyard.",
    skills: ["memoria", "historico", "recuperacao", "grafo", "graveyard", "aprendizados"],
    priority: 82,
    enabled: true,
    persona: { identity: "Sou Mnemosyne; recupero contexto disponível e separo lembrança registrada de conexão inferida.", home: "Memória contextual, projetos, tarefas, Vault e relações explicitamente fornecidas", voice: "reflexiva, acolhedora e cuidadosa com a procedência", approach: "mostro de onde veio cada lembrança e marco relações como hipótese quando não são explícitas", evidenceBoundary: "não alego consultar Graph, histórico ou Graveyard sem acesso real a esses dados", authorityBoundary: "recuperação é leitura consultiva; não escrevo memória nem altero registros" },
  };

  canHandle(task: AthenaTask): boolean {
    const p = task.rawPrompt.toLowerCase();
    return (
      p.includes("historico") ||
      p.includes("lembrar") ||
      p.includes("passado") ||
      p.includes("graveyard") ||
      p.includes("aprendizado") ||
      p.includes("conexao") ||
      p.includes("memoria")
    );
  }

  async execute(task: AthenaTask, context: AthenaContext): Promise<AgentResult> {
    const priorOutcomes = relevantExperienceGuidance(context, this.manifest.id);
    const queryTokens = task.rawPrompt.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length > 3);
    const evidence = [
      ...context.relevantProjects.filter((item) => queryTokens.some((token) => `${item.title} ${item.description} ${item.tags.join(" ")}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes(token))).slice(0, 5).map((project) => `Projeto encontrado no contexto: ${project.title} (${project.status}).`),
      ...context.relevantVaultItems.filter((item) => queryTokens.some((token) => `${item.title} ${item.author || ""} ${item.summary || ""} ${item.tags.join(" ")}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes(token))).slice(0, 5).map((item) => `Referência relacionada no Vault: ${item.title}${item.author ? ` — ${item.author}` : ""}.`),
      ...context.relevantTasks.filter((item) => queryTokens.some((token) => `${item.title} ${item.description || ""} ${(item.tags || []).join(" ")}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes(token))).slice(0, 5).map((item) => `Tarefa relacionada no contexto: ${item.title} (${item.status}).`),
    ];
    const content = evidence.length
      ? `🧠 **Recuperação Contextual & Memória (Mnemosyne):**\n\nEncontrei estes itens no contexto fornecido para “${task.title}”:\n${evidence.map((item) => `• ${item}`).join("\n")}\n\nIsto é uma lista de contexto disponível; não consultei o Graph Epistêmico nem inferi relações que não estejam explicitamente presentes.`
      : `🧠 **Recuperação Contextual & Memória (Mnemosyne):**\n\nNão recebi itens de projeto, Vault ou tarefas relevantes para “${task.title}”. Não consultei o Graph Epistêmico nesta execução, então não afirmarei conexões ou aprendizados históricos sem evidência.`;
    const groundedContent = content + formatExperienceMethodHints(priorOutcomes);

    return {
      agentId: this.manifest.id,
      agentName: this.manifest.name,
      role: this.manifest.role,
      success: true,
      content: groundedContent,
      confidence: evidence.length ? 0.48 : 0.2,
      sources: evidence.length ? ["Contexto da tarefa: projetos, Vault e tarefas"] : [],
      recommendations: ["Se quiser uma conexão histórica, especifique os projetos ou itens a comparar."],
      metadata: { queriedGraph: false, queryMatchedProvidedContext: evidence.length > 0, evidenceCount: evidence.length, priorOutcomeHints: priorOutcomes.length },
    };
  }
}

export const mnemosyneAgent = new MnemosyneAgent();
