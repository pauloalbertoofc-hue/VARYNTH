import { AthenaAgent, AgentManifest } from "../base-agent";
import { AthenaTask } from "../../domain/task";
import { AthenaContext } from "../../domain/context";
import { AgentResult } from "../../domain/result";

const tokens = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 3);

export class BibliotecarioAgent implements AthenaAgent {
  manifest: AgentManifest = {
    id: "bibliotecario",
    name: "Alexandria",
    role: "Especialista da Biblioteca Viva, Leitura e Consulta de Acervo",
    version: "1.0.0",
    description: "Localiza trechos, capítulos e relações entre todos os livros indexados no Vault.",
    skills: ["livros", "vault", "leitura", "fichamento", "citacoes", "biblioteca", "consulta"],
    priority: 92,
    enabled: true,
  };

  canHandle(task: AthenaTask): boolean {
    return /\b(livro|livros|vault|biblioteca|capitulo|capítulo|fichamento|cite|citacao|citação|obra)\b/i.test(task.rawPrompt);
  }

  async execute(task: AthenaTask, context: AthenaContext): Promise<AgentResult> {
    if (typeof window !== "undefined") {
      try {
        const response = await fetch("/api/vault/library/search", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: task.rawPrompt }) });
        if (response.ok) {
          const { results } = await response.json() as { results: Array<{ name: string; excerpt: string; chapters: string[]; wordCount: number; page?: number }> };
          if (results.length) return { agentId: this.manifest.id, agentName: this.manifest.name, role: this.manifest.role, success: true, confidence: 0.9, content: `📚 **Consulta à Biblioteca Viva**\n\n${results.map((result) => `**${result.name}**${result.page ? ` · p. ${result.page}` : ""} · ${result.wordCount.toLocaleString("pt-BR")} palavras\n${result.excerpt}${result.chapters.length ? `\nCapítulos: ${result.chapters.join(", ")}` : ""}`).join("\n\n")}`, sources: results.map((result) => result.name), recommendations: ["Peça uma síntese, comparação ou fichamento usando as obras encontradas."] };
        }
      } catch { /* Usa o contexto local como contingência. */ }
    }
    const query = tokens(task.rawPrompt);
    const matches = context.relevantVaultItems
      .map((item) => {
        const corpus = `${item.title} ${item.author || ""} ${item.literaryCategory || ""} ${item.workType || ""} ${item.format || ""} ${item.primarySubject || ""} ${item.tags.join(" ")} ${item.summary || ""} ${item.content || ""}`.toLowerCase();
        const score = query.filter((term) => corpus.includes(term)).length;
        const firstTerm = query.find((term) => (item.content || "").toLowerCase().includes(term));
        const position = firstTerm ? (item.content || "").toLowerCase().indexOf(firstTerm) : 0;
        const excerpt = item.content ? item.content.slice(Math.max(0, position - 180), position + 480).replace(/\s+/g, " ") : item.notes || "Sem texto indexado.";
        return { item, score, excerpt };
      })
      .filter((match) => match.score > 0 || query.length === 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
    if (matches.length === 0) return { agentId: this.manifest.id, agentName: this.manifest.name, role: this.manifest.role, success: true, confidence: 0.4, content: "Não encontrei uma obra indexada que corresponda à consulta. No Vault, envie ou selecione o livro e confirme que ele aparece como ‘Conteúdo indexado para busca’." };
    const content = matches.map(({ item, excerpt }) => `**${item.title}**${item.author ? ` — ${item.author}` : ""}\n${excerpt}${item.chapters?.length ? `\nCapítulos identificados: ${item.chapters.slice(0, 4).join(", ")}` : ""}`).join("\n\n");
    return { agentId: this.manifest.id, agentName: this.manifest.name, role: this.manifest.role, success: true, confidence: 0.82, content: `📚 **Consulta à Biblioteca Viva**\n\n${content}`, sources: matches.map(({ item }) => item.title), recommendations: ["Peça um fichamento, comparação entre obras ou uma síntese com as fontes encontradas."] };
  }
}

export const bibliotecarioAgent = new BibliotecarioAgent();
