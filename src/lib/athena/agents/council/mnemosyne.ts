import { AthenaAgent, AgentManifest } from "../base-agent";
import { AthenaTask } from "../../domain/task";
import { AthenaContext } from "../../domain/context";
import { AgentResult } from "../../domain/result";

export class MnemosyneAgent implements AthenaAgent {
  manifest: AgentManifest = {
    id: "mnemosyne",
    name: "Mnemosyne",
    role: "Especialista em Memória Epistêmica, Histórico & Conexões",
    version: "2.0.0",
    description: "Recuperação contextual, cruzamento de histórico, conexões do Graph e aprendizados do Graveyard.",
    skills: ["memoria", "historico", "recuperacao", "grafo", "graveyard", "aprendizados"],
    priority: 82,
    enabled: true,
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
    const evidence = [
      ...context.relevantProjects.slice(0, 5).map((project) => `Projeto disponível: ${project.title} (${project.status}).`),
      ...context.relevantVaultItems.slice(0, 5).map((item) => `Referência no Vault: ${item.title}${item.author ? ` — ${item.author}` : ""}.`),
      ...context.relevantTasks.slice(0, 5).map((item) => `Tarefa disponível: ${item.title} (${item.status}).`),
    ];
    const content = evidence.length
      ? `🧠 **Recuperação Contextual & Memória (Mnemosyne):**\n\nEncontrei estes itens no contexto fornecido para “${task.title}”:\n${evidence.map((item) => `• ${item}`).join("\n")}\n\nIsto é uma lista de contexto disponível; não consultei o Graph Epistêmico nem inferi relações que não estejam explicitamente presentes.`
      : `🧠 **Recuperação Contextual & Memória (Mnemosyne):**\n\nNão recebi itens de projeto, Vault ou tarefas relevantes para “${task.title}”. Não consultei o Graph Epistêmico nesta execução, então não afirmarei conexões ou aprendizados históricos sem evidência.`;

    return {
      agentId: this.manifest.id,
      agentName: this.manifest.name,
      role: this.manifest.role,
      success: true,
      content,
      confidence: evidence.length ? 0.65 : 0.25,
      sources: evidence.length ? ["Contexto da tarefa: projetos, Vault e tarefas"] : [],
      recommendations: ["Se quiser uma conexão histórica, especifique os projetos ou itens a comparar."],
      metadata: { queriedGraph: false, evidenceCount: evidence.length },
    };
  }
}

export const mnemosyneAgent = new MnemosyneAgent();
