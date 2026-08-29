import { AthenaPersonaConfig, DEFAULT_ATHENA_PERSONA } from "../domain/persona";
import { ConversationMode, ConversationIntent } from "../domain/conversation";

export class AthenaPersonaEngine {
  private config: AthenaPersonaConfig = { ...DEFAULT_ATHENA_PERSONA };

  getConfig(): AthenaPersonaConfig {
    return this.config;
  }

  updateConfig(updates: Partial<AthenaPersonaConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Generates a natural conversational response for non-command dialogical interactions.
   */
  generateDialogueResponse(
    prompt: string,
    mode: ConversationMode,
    currentTopic?: string,
    activeProjectTitle?: string
  ): string {
    const lower = prompt.toLowerCase();

    // 1. Casual humor or remark (e.g., "kkk", "rsrs", "projeto tá enorme", "e aí")
    if (lower.includes("kkk") || lower.includes("rsrs") || lower.includes("haha") || lower.includes("enorme") || lower.includes("loucura")) {
      if (activeProjectTitle) {
        return `Kkkk realmente! O projeto **"${activeProjectTitle}"** está ganhando uma densidade incrível. Mas com o ecossistema organizado no VARYNTH, a gente consegue manter o controle de cada ponta solta.\n\nQuer que a gente faça uma rodada rápida para enxugar as prioridades ou prefere focar em algum ponto específico agora?`;
      }
      return `Kkkk faz parte da jornada! Quando a gente começa a aprofundar as ideias, elas realmente ganham vida própria.\n\nEstou por aqui para te ajudar a estruturar o que precisar. O que está na sua cabeça agora?`;
    }

    // 2. Greetings / Check-ins ("oi", "olá", "e aí", "tudo bem", "como você está")
    if (
      lower === "oi" ||
      lower === "ola" ||
      lower === "olá" ||
      lower.startsWith("e ai") ||
      lower.startsWith("e aí") ||
      lower.includes("tudo bem") ||
      lower.includes("como vai")
    ) {
      if (activeProjectTitle) {
        return `Tudo ótimo por aqui, Paulo! Estou focada na workspace de **"${activeProjectTitle}"** com você. Como estão as coisas por aí? Em que podemos avançar hoje?`;
      }
      return `Tudo excelente por aqui, Paulo! Conectada ao núcleo do seu VARYNTH OS e pronta para acompanhar suas pesquisas, ideias e projetos. Como posso te ajudar hoje?`;
    }

    // 3. Brainstorming / Ideation mode
    if (mode === "brainstorm" || lower.includes("pensando em") || lower.includes("ideia") || lower.includes("o que acha")) {
      return `Adorei essa linha de pensamento. Explorando esse ângulo:\n\n1. **Perspectiva Principal:** Isso abre espaço para conectarmos com os fichamentos e referências que você já tem no Vault.\n2. **Ponto Cego em Potencial:** Como isso impacta os prazos e entregas que já estão rodando no Chronos?\n3. **Próximo Passo Natural:** Podemos rascunhar um esboço preliminar no Labs ou transformar isso em uma tese na Argument Arena.\n\nPor onde você quer puxar esse fio?`;
    }

    // 4. Analysis / Reflection mode
    if (mode === "analysis" || lower.includes("refletindo") || lower.includes("analisando")) {
      return `Entendo perfeitamente. Esse tipo de reflexão exige rigor para não cairmos em premissas automáticas.\n\nAnalisando o histórico e o contexto disponível, o ponto chave parece ser o equilíbrio entre profundidade metodológica e viabilidade prática.\n\nQuer que o Conselho (Justitia, Logos e Critias) elabore um parecer mais estruturado sobre isso?`;
    }

    // 5. Default natural conversational fallback
    if (activeProjectTitle) {
      return `Compreendi seu ponto sobre **"${activeProjectTitle}"**. Estou acompanhando o raciocínio com você. Quer que a gente aprofunde essa reflexão ou prefere estruturar uma ação prática para avançar?`;
    }

    return `Entendi perfeitamente o que você trouxe. Estou conectada ao contexto e acompanhando sua linha de raciocínio. Como você gostaria de encaminhar essa discussão?`;
  }

  /**
   * Generates a polite, natural clarification when a reference is genuinely ambiguous.
   */
  generateClarificationQuestion(term: string, candidates: string[]): string {
    if (candidates.length > 0) {
      return `Você está se referindo a **"${candidates[0]}"** ou a outra iniciativa? Me dá um toque para eu puxar o contexto exato para a nossa conversa.`;
    }
    return `Fiquei em dúvida sobre a qual item específico você está se referindo com *"__${term}__"*. Poderia me dar uma pista rápida (como o nome do projeto, tese ou tarefa)?`;
  }
}

export const athenaPersonaEngine = new AthenaPersonaEngine();

