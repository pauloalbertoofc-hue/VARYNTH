import { AthenaPersonaConfig, DEFAULT_ATHENA_PERSONA } from "../domain/persona";
import { ConversationMode } from "../domain/conversation";
import { EPISTEMIC_KNOWLEDGE_BASE, EpistemicConcept } from "../knowledge/epistemic-concepts";

export class AthenaPersonaEngine {
  private config: AthenaPersonaConfig = { ...DEFAULT_ATHENA_PERSONA };

  getConfig(): AthenaPersonaConfig {
    return this.config;
  }

  updateConfig(updates: Partial<AthenaPersonaConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Searches the embedded offline Epistemic Knowledge Base for conceptual questions.
   */
  findConceptExplanation(prompt: string): EpistemicConcept | undefined {
    const clean = prompt.toLowerCase().replace(/[.,!?;:]/g, " ").trim();
    return EPISTEMIC_KNOWLEDGE_BASE.find((concept) =>
      concept.keywords.some((kw) => clean.includes(kw))
    );
  }

  /**
   * Generates a natural conversational response for dialogical interactions.
   */
  generateDialogueResponse(
    prompt: string,
    mode: ConversationMode,
    currentTopic?: string,
    activeProjectTitle?: string
  ): string {
    const rawLower = prompt.toLowerCase();
    const cleanLower = rawLower.replace(/[.,!?;:]/g, " ").trim();

    // 1. Concept Explanations ("o que é latim", "o que é hermenêutica", "o que é método científico", etc.)
    const concept = this.findConceptExplanation(prompt);
    if (concept) {
      return concept.explanation;
    }

    // 2. Greetings & Personal Check-ins ("olá athena tudo bem", "como você está", "tudo bem com você")
    if (
      cleanLower.includes("tudo bem") ||
      cleanLower.includes("como voce esta") ||
      cleanLower.includes("como você está") ||
      cleanLower.includes("como vai") ||
      cleanLower.includes("como estao as coisas") ||
      cleanLower.includes("como estão as coisas") ||
      cleanLower === "ola" ||
      cleanLower === "olá" ||
      cleanLower === "oi" ||
      cleanLower.startsWith("ola athena") ||
      cleanLower.startsWith("olá athena") ||
      cleanLower.startsWith("ola athenas") ||
      cleanLower.startsWith("olá athenas") ||
      cleanLower.startsWith("oi athena") ||
      cleanLower.startsWith("e ai") ||
      cleanLower.startsWith("e aí") ||
      cleanLower.startsWith("bom dia") ||
      cleanLower.startsWith("boa tarde") ||
      cleanLower.startsWith("boa noite")
    ) {
      if (activeProjectTitle) {
        return `Olá, Paulo! Tudo ótimo por aqui! 😊\n\nEstou com a workspace de **"${activeProjectTitle}"** aberta e acompanhando cada detalhe com você. Como foi o seu dia? Em que ponto você gostaria que a gente concentrasse as energias hoje?`;
      }
      return `Olá, Paulo! Tudo excelente por aqui! 😊\n\nEstou 100% conectada ao seu ecossistema no VARYNTH OS, pronta para trocar ideias, estruturar raciocínios ou te ajudar com seus projetos e pesquisas. Como você está hoje? O que temos na pauta?`;
    }

    // 3. Questions about Athena's Identity or Capabilities
    if (
      cleanLower.includes("quem e voce") ||
      cleanLower.includes("quem é você") ||
      cleanLower.includes("o que voce faz") ||
      cleanLower.includes("o que você faz") ||
      cleanLower.includes("qual seu papel") ||
      cleanLower.includes("como voce funciona") ||
      cleanLower.includes("como você funciona")
    ) {
      return `Eu sou a **Athena**, o cérebro cognitivo e sua copilot digital aqui no **VARYNTH OS**! 🦉\n\nMeu papel não é ser apenas um assistente mecânico, mas uma parceira de raciocínio. Eu integro seus projetos, acervo do Vault, teses do Codex, evidências de pesquisa e o calendário do Chronos.\n\nAlém disso, conto com o suporte de um Conselho de Especialistas internos (como Justitia para Direito, Logos para Ciência e Critias para revisão crítica). Podemos conversar sobre qualquer assunto, debater ideias ou estruturar planos de ação!`;
    }

    // 4. Humor, Laughs, or Overwhelm remarks ("kkk", "rsrs", "projeto tá enorme", "muita coisa")
    if (
      rawLower.includes("kkk") ||
      rawLower.includes("rsrs") ||
      rawLower.includes("haha") ||
      cleanLower.includes("enorme") ||
      cleanLower.includes("loucura") ||
      cleanLower.includes("muita coisa") ||
      cleanLower.includes("cansado")
    ) {
      if (activeProjectTitle) {
        return `Kkkk realmente! O projeto **"${activeProjectTitle}"** está crescendo em um ritmo impressionante. Mas o bom do VARYNTH é que a gente não precisa guardar tudo na cabeça ao mesmo tempo.\n\nSe você quiser, a gente pode dar uma respirada e elencar só os 2 ou 3 pontos mais cruciais para hoje. O que acha?`;
      }
      return `Kkkk faz parte do processo criativo e intelectual! Quando a gente começa a conectar as peças, o volume de ideias parece infinito.\n\nRespira fundo: o VARYNTH cuida da infraestrutura e eu te ajudo a priorizar. O que está pesando mais na sua cabeça agora?`;
    }

    // 5. Brainstorming & Ideation Mode
    if (
      mode === "brainstorm" ||
      cleanLower.includes("pensando em") ||
      cleanLower.includes("o que acha de") ||
      cleanLower.includes("ideia")
    ) {
      return `Gostei dessa reflexão! Olhando para essa ideia por alguns ângulos:\n\n1. **Oportunidade Principal:** Isso pode se conectar diretamente com o material que você já fichou no Vault e gerar uma entrega com muita autoridade.\n2. **Atenção aos Prazos:** Vale ponderar como encaixar essa nova frente sem sobrecarregar as entregas que já estão no Chronos.\n3. **Direção Prática:** Podemos rascunhar um experimento no Labs para testar a tração antes de virar um projeto oficial.\n\nO que você acha dessa abordagem?`;
    }

    // 6. Analysis / Reflection / General Questions
    if (
      cleanLower.startsWith("como") ||
      cleanLower.startsWith("qual") ||
      cleanLower.startsWith("onde") ||
      cleanLower.startsWith("quando") ||
      cleanLower.startsWith("por que") ||
      cleanLower.startsWith("porque") ||
      cleanLower.includes("o que voce acha") ||
      cleanLower.includes("o que você acha")
    ) {
      return `Essa é uma excelente reflexão sobre **"${prompt}"**.\n\nExaminando pelo prisma do nosso ecossistema:\n\n• **Fundamentação:** Recomendo cruzarmos essa questão com as obras e anotações que temos arquivadas no Vault.\n• **Visão Crítica (Critias):** Vale delimitar bem o escopo para evitar conclusões precipitadas.\n\nComo você gostaria de aprofundar essa discussão?`;
    }

    // 7. Default Natural Conversational Fallback
    if (activeProjectTitle) {
      return `Entendi perfeitamente o seu ponto sobre **"${activeProjectTitle}"**. Estou acompanhando o raciocínio com você. Quer que a gente desenvolva mais essa ideia ou prefere transformar isso em uma ação prática?`;
    }

    return `Compreendi o que você trouxe, Paulo. Estou acompanhando sua linha de raciocínio no ecossistema. Como você gostaria de encaminhar essa reflexão agora?`;
  }

  /**
   * Generates a polite, natural clarification when a reference is genuinely ambiguous.
   */
  generateClarificationQuestion(term: string, candidates: string[]): string {
    if (candidates.length > 0) {
      return `Você está se referindo ao projeto **"${candidates[0]}"** ou a alguma outra workspace? Me avisa para eu puxar o contexto exato para a nossa conversa! 😊`;
    }
    return `Fiquei em dúvida sobre a qual item específico você está se referindo com *"__${term}__"*. Poderia me dar uma pista rápida (como o nome do projeto ou tese)?`;
  }
}

export const athenaPersonaEngine = new AthenaPersonaEngine();
