import { AthenaAgent, AgentManifest } from "../base-agent";
import { AthenaTask } from "../../domain/task";
import { AthenaContext } from "../../domain/context";
import { AgentResult } from "../../domain/result";

export class CuradorPesquisaAgent implements AthenaAgent {
  manifest: AgentManifest = {
    id: "curador-pesquisa",
    name: "Lumen",
    role: "Especialista em Pesquisa, Fontes e Evidências",
    version: "1.0.0",
    description: "Organiza pesquisas recebidas pela Athena ou pelo usuário, qualifica fontes e conecta evidências ao Vault e ao Research.",
    skills: ["pesquisa", "fontes", "evidencias", "noticias", "curadoria", "bibliografia"],
    priority: 91,
    enabled: true,
  };

  canHandle(task: AthenaTask): boolean {
    return /\b(pesquisa|pesquisar|fonte|fontes|noticia|notícias|evidencia|evidência|artigo|estudo|bibliografia)\b/i.test(task.rawPrompt);
  }

  async execute(task: AthenaTask, context: AthenaContext): Promise<AgentResult> {
    const evidence = context.relevantEvidences.slice(0, 6);
    const sources = evidence.map((item) => item.source);
    const content = evidence.length
      ? `🔎 **Curadoria de Pesquisa**\n\nEncontrei ${evidence.length} evidência(s) relacionada(s) no Research. Vou priorizar fontes identificáveis, registrar o grau de evidência e manter ligação com o Vault para consulta posterior.\n\n${evidence.map((item) => `- **${item.source}**: ${item.claim}`).join("\n")}`
      : "🔎 **Curadoria de Pesquisa**\n\nAinda não há evidências catalogadas para este tema. Posso estruturar a coleta em: pergunta de pesquisa, fontes primárias, fontes secundárias, nível de confiança e destino no Vault.";
    return { agentId: this.manifest.id, agentName: this.manifest.name, role: this.manifest.role, success: true, confidence: evidence.length ? 0.84 : 0.64, content, sources, recommendations: ["Registrar cada achado no Research com fonte, data e grau de evidência.", "Enviar materiais duradouros ao Vault para leitura e consulta pela Biblioteca Viva."] };
  }
}

export const curadorPesquisaAgent = new CuradorPesquisaAgent();
