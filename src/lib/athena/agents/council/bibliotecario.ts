import { AthenaAgent, AgentManifest } from "../base-agent";
import { AthenaTask } from "../../domain/task";
import { AthenaContext } from "../../domain/context";
import { AgentResult } from "../../domain/result";
import { renderAgentPersona } from "../base-agent";

const tokens = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 3);

export class BibliotecarioAgent implements AthenaAgent {
  get personalityPrompt(): string { return renderAgentPersona(this.manifest); }
  manifest: AgentManifest = {
    id: "bibliotecario",
    name: "Alexandria",
    role: "Especialista da Biblioteca Viva, Leitura e Consulta de Acervo",
    version: "1.0.0",
    description: "Localiza trechos, capítulos e relações entre todos os livros indexados no Vault.",
    skills: ["livros", "vault", "leitura", "fichamento", "citacoes", "biblioteca", "consulta"],
    priority: 92,
    enabled: true,
    persona: { identity: "Sou Alexandria; procuro passagens no acervo realmente indexado e mostro a obra de onde vieram.", home: "Biblioteca Viva, Vault, livros, capítulos e citações", voice: "atenta, erudita sem pedantismo e fiel ao texto", approach: "localizo correspondências e separo excerto literal de síntese", evidenceBoundary: "só cito resultados devolvidos pela busca ou itens presentes no contexto; falha de busca não significa que a obra não existe", authorityBoundary: "consulta somente leitura; não importo, modifico ou compartilho obras" },
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
    if (matches.length === 0) return { agentId: this.manifest.id, agentName: this.manifest.name, role: this.manifest.role, success: true, confidence: 0.25, sources: [], metadata: { matchedVaultItems: 0, externalSearchPerformed: false }, content: "Não encontrei correspondência nos itens do Vault que recebi nesta chamada. Isso não confirma que a obra esteja ausente da biblioteca completa; informe título/autor ou confirme que o conteúdo foi indexado para busca." };
    const content = matches.map(({ item, excerpt }) => `**${item.title}**${item.author ? ` — ${item.author}` : ""}\n${excerpt}${item.chapters?.length ? `\nCapítulos identificados: ${item.chapters.slice(0, 4).join(", ")}` : ""}`).join("\n\n");
    return { agentId: this.manifest.id, agentName: this.manifest.name, role: this.manifest.role, success: true, confidence: 0.72, content: `📚 **Trechos correspondentes no contexto local do Vault**\n\n${content}\n\nOs trechos acima são excertos do conteúdo recebido; ainda não fiz uma síntese interpretativa da obra inteira.`, sources: matches.map(({ item }) => item.title), metadata: { matchedVaultItems: matches.length, externalSearchPerformed: false }, recommendations: ["Peça uma síntese desses trechos, uma comparação entre obras ou forneça um capítulo específico."] };
  }
}

export const bibliotecarioAgent = new BibliotecarioAgent();
