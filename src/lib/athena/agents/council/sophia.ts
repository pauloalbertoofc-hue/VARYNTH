import { AthenaAgent, AgentManifest } from "../base-agent";
import { AthenaTask } from "../../domain/task";
import { AthenaContext } from "../../domain/context";
import { AgentResult } from "../../domain/result";
import { assessSourceGovernance } from "../../quality/source-governance";
import { renderAgentPersona, resolveAgentFollowUp } from "../base-agent";
import { agentGuidanceInstruction, confirmedAgentGuidance } from "../experience-guidance";

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
    const resolved = resolveAgentFollowUp(task.rawPrompt.trim(), context);
    const prompt = resolved.prompt;
    const requestedText = prompt.match(/[“"]([^”"]{12,})[”"]/)?.[1];
    const topic = extractTopic(prompt, requestedText, project?.title);
    const format = inferFormat(prompt);
    const audience = inferAudience(prompt);
    const userThesis = extractThesis(prompt);
    const guidance = agentGuidanceInstruction(context, this.manifest.id, prompt);
    const verbosity = confirmedAgentGuidance(context, this.manifest.id, "verbosity", prompt);
    const formality = confirmedAgentGuidance(context, this.manifest.id, "formality", prompt);
    let content = `🖋️ **Sophia — ${requestedText ? "revisão textual" : "rascunho inicial"}**\n\n`;

    if (requestedText) {
      content += `Trecho fornecido para revisão:\n> ${requestedText}\n\n`;
      const sentences = requestedText.split(/(?<=[.!?])\s+/).filter(Boolean);
      content += `O trecho tem ${sentences.length} frase(s). ${sentences.length > 1 ? "Vale explicitar a relação lógica entre as frases e verificar se cada afirmação serve à ideia central." : "Como há apenas uma frase, esta leitura se limita à clareza e à formulação; não avalia coesão entre parágrafos."}`;
      if (topic) content += `\n\nTema indicado no pedido: **${topic}**.`;
    } else if (topic) {
      const subject = userThesis ?? `a discussão exige considerar o contexto, os impactos e as diferentes perspectivas relevantes`;
      const projectNote = project ? `O projeto ativo, **“${project.title}”**, foi considerado apenas como contexto${project.description ? ` (${project.description})` : ""}.` : "";
      content += `${projectNote ? `${projectNote}\n\n` : ""}**${format} — ${topic}**${audience ? `\n*Público: ${audience}*` : ""}\n\n`;
      content += draftForTopic(topic, subject, format, audience);
      if (guidance.length) content += `\n\n*${guidance.join(" ")}*`;
      if (verbosity === "detailed") content += `\n\nPara aprofundar, posso organizar a próxima versão em contexto, argumento central, objeções e conclusão — sem acrescentar fatos ou fontes ausentes.`;
      if (formality === "informal") content = content.replace(/\*Texto-base —/g, "*Rascunho —");
      content += `\n\n*Este é um ponto de partida editável. Não acrescentei citações nem tratei afirmações externas como verificadas; se o texto for factual ou acadêmico, as fontes precisam ser fornecidas ou pesquisadas antes da versão final.*`;
    } else {
      content += `Consigo redigir ou revisar, mas ainda falta o assunto do texto. Qual tema ou trecho você quer trabalhar? Se tiver preferência, diga também o formato e para quem será escrito.`;
    }

    const references = [...context.relevantVaultItems.map((item) => `${item.title}${item.chapters?.[0] ? ` — ${item.chapters[0]}` : ""}`), ...context.relevantEvidences.map((item) => item.source)].slice(0, 8);
    if (references.length) content += `\n\n**Referências consultáveis:**\n${references.map((reference) => `- ${reference}`).join("\n")}`;
    else if (topic && !requestedText) content += "\n\n**Fontes:** nenhuma fonte foi consultada. Afirmações factuais, dados e citações devem ser verificados antes do uso.";
    const governance = assessSourceGovernance(content, references);
    return {
      agentId: this.manifest.id,
      agentName: this.manifest.name,
      role: this.manifest.role,
      success: true,
      content,
      confidence: requestedText ? 0.62 : topic ? 0.58 : 0.3,
      sources: references,
      recommendations: topic ? ["Ajustar o tom à sua voz e ao público", "Acrescentar exemplos ou posições que queira defender", "Verificar fontes para afirmações factuais antes de publicar"] : ["Indicar o tema ou enviar o trecho a revisar"],
      limitations: topic ? ["Rascunho sem verificação externa de fatos ou fontes"] : ["Tema ausente; é necessária uma informação para redigir"],
      metadata: { ...(references.length ? { sourceGovernance: governance } : {}), draftGenerated: Boolean(topic && !requestedText), topic, requestedFormat: format, audience, citedExternalSources: false, conversationReferenceResolved: resolved.usedHistory, appliedExperienceGuidance: guidance.length > 0 ? { verbosity, formality } : undefined },
    };
  }
}

function extractTopic(prompt: string, quotedText?: string, projectTitle?: string): string | undefined {
  if (quotedText) return cleanTopic(quotedText);
  const patterns = [
    /(?:escreva|redija|crie|faça|produza|prepare)\s+(?:um[ae]?\s+)?(?:texto|redação|artigo|ensaio|resumo|síntese|apresentação|rascunho)\s+(?:sobre|a respeito de|acerca de)\s+(.+?)(?=\s+para\s+(?:o\s+)?(?:p[uú]blico\s+)?(?:de\s+)?[^.!?]+|[.!?]|$)/i,
    /(?:texto|redação|artigo|ensaio|resumo|síntese|apresentação|rascunho)\s+(?:sobre|a respeito de|acerca de)\s+(.+?)(?=\s+para\s+(?:o\s+)?(?:p[uú]blico\s+)?(?:de\s+)?[^.!?]+|[.!?]|$)/i,
    /(?:sobre|a respeito de|acerca de)\s+(.+?)(?=\s+para\s+(?:o\s+)?(?:p[uú]blico\s+)?(?:de\s+)?[^.!?]+|[.!?]|$)/i,
  ];
  for (const pattern of patterns) {
    const match = prompt.match(pattern);
    if (match?.[1]) return cleanTopic(match[1]);
  }
  if (projectTitle && /projeto|apresenta[cç][aã]o|texto/i.test(prompt)) return cleanTopic(projectTitle);
  return undefined;
}

function cleanTopic(value: string): string {
  return value.trim().replace(/[“”"']/g, "").replace(/\s+/g, " ").replace(/[,:;]+$/, "");
}

function inferFormat(prompt: string): string {
  const formats: Array<[RegExp, string]> = [[/e-?mail/i, "E-mail"], [/discurso|fala/i, "Discurso"], [/post|redes sociais/i, "Publicação para redes sociais"], [/ensaio/i, "Ensaio"], [/artigo/i, "Artigo"], [/resumo|síntese/i, "Resumo"], [/apresenta[cç][aã]o/i, "Apresentação"], [/redação/i, "Redação"]];
  return formats.find(([pattern]) => pattern.test(prompt))?.[1] ?? "Texto-base";
}

function inferAudience(prompt: string): string | undefined {
  return prompt.match(/(?:para|ao p[uú]blico)\s+(?:o\s+)?(?:p[uú]blico\s+)?(?:de\s+)?([^,.;!?]+?)(?:[,.;!?]|$)/i)?.[1]?.trim();
}

function extractThesis(prompt: string): string | undefined {
  return prompt.match(/(?:defenda|argumente|tese(?:\s+de\s+que)?|ideia\s+central(?:\s+de\s+que)?)\s*[:,-]?\s*(.+?)(?:[.!?]|$)/i)?.[1]?.trim();
}

function draftForTopic(topic: string, subject: string, format: string, audience?: string): string {
  const normalizedTopic = topic.charAt(0).toLowerCase() + topic.slice(1);
  const framing = audience ? `Para ${audience},` : "Em uma primeira aproximação,";
  if (format === "E-mail") return `Olá,\n\nEscrevo para tratar de ${normalizedTopic}. ${subject.charAt(0).toUpperCase() + subject.slice(1)}. A proposta é abrir espaço para uma conversa mais detalhada e definir os próximos passos com clareza.\n\nFico à disposição.\n\nAtenciosamente,`;
  if (format === "Publicação para redes sociais") return `O que vale considerar sobre ${normalizedTopic}? ${subject.charAt(0).toUpperCase() + subject.slice(1)}.\n\nUma conversa melhor começa quando fazemos boas perguntas e ouvimos perspectivas diferentes. Qual é a sua?`;
  return `${framing} ${normalizedTopic} pode ser compreendido a partir da ideia de que ${subject}. Essa perspectiva ajuda a organizar a discussão sem reduzir o tema a uma única explicação.\n\nUm primeiro passo é identificar quais aspectos do assunto são mais relevantes para o contexto e quais experiências ou evidências podem esclarecê-los. A partir daí, torna-se possível apresentar os pontos principais, reconhecer limites e construir uma conclusão proporcional ao que se sabe.\n\nAssim, falar sobre ${normalizedTopic} não exige encerrar a discussão: exige formular com clareza a questão, sustentar cada afirmação com razões ou fontes adequadas e manter abertas as perguntas que ainda não têm resposta.`;
}

export const sophiaAgent = new SophiaAgent();
