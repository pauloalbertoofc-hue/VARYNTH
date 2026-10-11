import { AthenaAgent, AgentManifest } from "../base-agent";
import { AthenaTask } from "../../domain/task";
import { AthenaContext } from "../../domain/context";
import { AgentResult } from "../../domain/result";

export class CuradorPesquisaAgent implements AthenaAgent {
  responseMethod = "Na curadoria, identifique o que veio de evidência catalogada e o que é apenas orientação de método. Cite a fonte junto à afirmação, sem atribuir qualidade, atualidade ou verificação que os metadados não sustentem. Se não houver resultados, diga isso diretamente e proponha uma pergunta de pesquisa ou coleta, sem sugerir que a coleta já ocorreu.";
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
      ? `🔎 **O que encontrei**\n\nNo contexto desta consulta há ${evidence.length} evidência(s) catalogada(s):\n\n${evidence.map((item) => `- **${item.source}** — ${item.claim}`).join("\n")}\n\nIsso é uma leitura do material disponível no Research; não fiz uma busca externa nem verifiquei aqui a atualidade das fontes.`
      : "🔎 **Ainda não há evidências catalogadas** para esta consulta no contexto recebido. Não fiz busca externa nesta execução. Posso ajudar a transformar o tema em uma pergunta pesquisável e indicar quais fontes primárias procurar.";
    return { agentId: this.manifest.id, agentName: this.manifest.name, role: this.manifest.role, success: true, confidence: evidence.length ? 0.72 : 0.35, content, sources, recommendations: evidence.length ? ["Se a decisão depender disso, confira a fonte original e a data de publicação."] : ["Defina a pergunta de pesquisa e os critérios de inclusão antes de coletar fontes."], metadata: { evidenceCount: evidence.length, externalSearchPerformed: false } };
  }
}

export const curadorPesquisaAgent = new CuradorPesquisaAgent();
