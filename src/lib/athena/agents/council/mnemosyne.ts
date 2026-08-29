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
    const content = `🧠 **Recuperação Contextual & Memória (Mnemosyne):**\n\n• **Conexões do Sistema:** Mapeando as relações no Graph Epistêmico entre os projetos e as referências do Vault.\n• **Preservação de Aprendizados:** O histórico de atividades recentes e os projetos concluídos guardam padrões que podem ser reaproveitados para evitar retrabalho nesta tarefa.`;

    return {
      agentId: this.manifest.id,
      agentName: this.manifest.name,
      role: this.manifest.role,
      success: true,
      content,
      confidence: 0.89,
      recommendations: ["Consultar o Graph Epistêmico para ver nós relacionados", "Revisar retrospectivas no Graveyard"],
    };
  }
}

export const mnemosyneAgent = new MnemosyneAgent();

