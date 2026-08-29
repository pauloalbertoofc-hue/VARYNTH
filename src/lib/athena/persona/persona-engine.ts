import { AthenaPersonaConfig, DEFAULT_ATHENA_PERSONA } from "../domain/persona";
import { ConversationMode } from "../domain/conversation";
import { EPISTEMIC_KNOWLEDGE_BASE, EpistemicConcept } from "../knowledge/epistemic-concepts";
import { AthenaEngineContext } from "../engine";

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
    const clean = prompt
      .toLowerCase()
      .replace(/[.,!?;:]/g, " ")
      .replace(/\bathena\b/g, "")
      .replace(/\bathenas\b/g, "")
      .trim();

    return EPISTEMIC_KNOWLEDGE_BASE.find((concept) =>
      concept.keywords.some((kw) => {
        const regex = new RegExp(`\\b${kw}\\b`, "i");
        return regex.test(clean) || clean.includes(kw);
      })
    );
  }

  /**
   * Generates a natural, tactful, intelligent conversational response respecting social context.
   */
  generateDialogueResponse(
    prompt: string,
    mode: ConversationMode,
    currentTopic?: string,
    activeProjectTitle?: string,
    ctx?: AthenaEngineContext
  ): string {
    const rawLower = prompt.toLowerCase();
    const cleanLower = rawLower
      .replace(/[.,!?;:]/g, " ")
      .replace(/\bathena\b/g, "")
      .replace(/\bathenas\b/g, "")
      .trim();

    // 1. Explicit System Situation & Dashboard Queries (ONLY when explicitly requested by user)
    const isExplicitSystemQuery =
      cleanLower.includes("situacao no sistema") ||
      cleanLower.includes("situação no sistema") ||
      cleanLower.includes("minha situacao") ||
      cleanLower.includes("minha situação") ||
      cleanLower.includes("resumo do meu sistema") ||
      cleanLower.includes("status do meu sistema") ||
      cleanLower.includes("relatorio do sistema") ||
      cleanLower.includes("relatório do sistema") ||
      cleanLower.includes("visao geral das minhas pendencias") ||
      cleanLower.includes("visão geral das minhas pendências");

    if (isExplicitSystemQuery && ctx) {
      const activeProjs = ctx.projects.filter((p) => p.status === "ativo");
      const pendingTasks = ctx.tasks.filter((t) => t.status !== "concluida");
      const urgentTasks = pendingTasks.filter((t) => t.priority === "urgente" || t.priority === "alta");
      const upcomingDeadlines = ctx.projects
        .filter((p) => p.deadline)
        .sort((a, b) => (a.deadline || "").localeCompare(b.deadline || ""));
      const totalVault = ctx.vaultItems.length;
      const totalTheses = ctx.theses.length;

      let report = `Aqui está o panorama detalhado da sua situação no **VARYNTH OS**:\n\n`;
      report += `📁 **Workspaces**: Você tem **${activeProjs.length} projetos ativos**`;
      if (activeProjs.length > 0) {
        report += ` (com destaque para **"${activeProjs[0].title}"**)`;
      }
      report += `.\n`;

      report += `⚡ **Tarefas**: **${pendingTasks.length} pendências** mapeadas`;
      if (urgentTasks.length > 0) {
        report += `, sendo **${urgentTasks.length} prioritárias** (ex: *"__${urgentTasks[0].title}__"*)\n`;
      } else {
        report += ` (todas em dia, sem tarefas urgentes acumuladas!)\n`;
      }

      if (upcomingDeadlines.length > 0) {
        report += `⏳ **Próximo Prazo**: **"${upcomingDeadlines[0].title}"** previsto para **${upcomingDeadlines[0].deadline}**.\n`;
      }

      report += `📚 **Conhecimento**: **${totalVault} obras no Vault** e **${totalTheses} teses na Argument Arena**.\n\n`;
      report += `💡 **Sugestão de Foco**: ${urgentTasks.length > 0 ? `Podemos avançar na tarefa prioritária *"__${urgentTasks[0].title}__"*?` : "Seu ecossistema está equilibrado. O que gostaria de desenvolver agora?"}`;

      return report;
    }

    // 2. Casual Social Questions ("que novidade você tem?", "o que tem de bom?", "como vai você?")
    if (
      cleanLower.includes("que novidade voce tem") ||
      cleanLower.includes("que novidade você tem") ||
      cleanLower.includes("que novidades voce tem") ||
      cleanLower.includes("que novidades você tem") ||
      cleanLower.includes("o que tem de bom") ||
      cleanLower.includes("o que me conta") ||
      cleanLower.includes("o que me diz")
    ) {
      if (activeProjectTitle) {
        return `Por aqui tudo ótimo e em ordem, Paulo! 😊\n\nEstava aqui acompanhando a evolução do projeto **"${activeProjectTitle}"** e pronta para a gente continuar refinando as ideias. Por enquanto, nenhuma surpresa — tudo rodando redondo e no controle!\n\nE por aí, como estão as coisas? O que você anda aprontando de novo?`;
      }
      return `Por aqui tudo ótimo e em ordem, Paulo! 😊\n\nEstava aqui conectada ao sistema, refinando o raciocínio e pronta para o que der e vier. Por enquanto, nenhuma grande reviravolta — tudo rodando redondo, estável e pronto para a gente construir o que você quiser hoje!\n\nE com você, como foi o dia? Alguma ideia nova na mente ou quer só trocar uma ideia leve?`;
    }

    // 3. Action / Focus Recommendations ("o que eu devo fazer hoje", "me dê uma sugestão de foco")
    if (
      cleanLower.includes("o que devo fazer") ||
      cleanLower.includes("o que eu devo fazer") ||
      cleanLower.includes("me de uma sugestao de foco") ||
      cleanLower.includes("me dê uma sugestão de foco") ||
      cleanLower.includes("por onde comecar hoje") ||
      cleanLower.includes("por onde começar hoje")
    ) {
      if (ctx) {
        const urgent = ctx.tasks.filter((t) => t.status !== "concluida" && (t.priority === "urgente" || t.priority === "alta"));
        if (urgent.length > 0) {
          return `Se você quiser um foco prático para hoje, estas frentes são as mais estratégicas:\n\n${urgent.slice(0, 3).map((t, i) => `${i + 1}. **${t.title}** (Prioridade: ${t.priority.toUpperCase()})`).join("\n")}\n\nPodemos pegar a primeira e destrinchar juntos?`;
        }
      }
      return `Seu fluxo de tarefas está bem equilibrado hoje! Se quiser uma sugestão, vale a pena dar uma olhada nas teses do Codex ou arquivar referências novas no Vault.`;
    }

    // 4. Concept Explanations ("o que é latim", "você sabe o que é um jogo", "o que é hermenêutica", etc.)
    const concept = this.findConceptExplanation(prompt);
    if (concept) {
      return concept.explanation;
    }

    // 5. Questions about Athena's Identity or Capabilities
    if (
      cleanLower.includes("quem e voce") ||
      cleanLower.includes("quem é você") ||
      cleanLower.includes("o que voce faz") ||
      cleanLower.includes("o que você faz") ||
      cleanLower.includes("qual seu papel") ||
      cleanLower.includes("como voce funciona") ||
      cleanLower.includes("como você funciona")
    ) {
      return `Eu sou a **Athena**, a inteligência artificial cognitiva e sua copilot digital no **VARYNTH OS**! 🦉\n\nMeu papel é atuar como sua parceira intelectual transversal. Tenho visibilidade sobre seus projetos, prazos no Chronos, acervo do Vault, evidências científicas e teses jurídicas na Argument Arena.\n\nAlém disso, conto com o suporte de 7 agentes especialistas internos (como Justitia para Direito, Logos para Ciência e Critias para revisão crítica). Podemos debater qualquer ideia, analisar controvérsias ou executar comandos no sistema!`;
    }

    // 6. Humor, Laughter, or Venting ("kkk", "tá foda", "muita coisa", "cansado", "difícil")
    if (
      rawLower.includes("kkk") ||
      rawLower.includes("rsrs") ||
      rawLower.includes("haha") ||
      cleanLower.includes("enorme") ||
      cleanLower.includes("loucura") ||
      cleanLower.includes("muita coisa") ||
      cleanLower.includes("cansado") ||
      cleanLower.includes("ta foda") ||
      cleanLower.includes("tá foda") ||
      cleanLower.includes("dificil") ||
      cleanLower.includes("difícil")
    ) {
      if (cleanLower.includes("foda") || cleanLower.includes("dificil")) {
        return `Te entendo perfeitamente, Paulo! Desenvolver e orquestrar um ecossistema complexo é desafiador mesmo. Mas estamos avançando e refinando cada detalhe.\n\nMe diz: qual ponto específico você quer que a gente descomplique ou destrave agora?`;
      }
      if (activeProjectTitle) {
        return `Kkkk realmente! O projeto **"${activeProjectTitle}"** está crescendo em um ritmo impressionante. Mas o bom do VARYNTH é que a gente não precisa guardar tudo na cabeça ao mesmo tempo.\n\nSe você quiser, a gente pode dar uma respirada e elencar só os 2 ou 3 pontos mais cruciais para hoje. O que acha?`;
      }
      return `Kkkk faz parte do processo criativo e intelectual! Quando a gente começa a conectar as peças, o volume de ideias parece infinito.\n\nRespira fundo: o VARYNTH cuida da infraestrutura e eu te ajudo a priorizar. O que está pesando mais na sua cabeça agora?`;
    }

    // 7. Greetings & Personal Check-ins ("oi", "olá", "tudo bem", "como vai")
    const isGreeting =
      cleanLower === "ola" ||
      cleanLower === "olá" ||
      cleanLower === "oi" ||
      cleanLower.startsWith("ola athena") ||
      cleanLower.startsWith("olá athena") ||
      cleanLower.startsWith("ola athenas") ||
      cleanLower.startsWith("olá athenas") ||
      cleanLower.startsWith("oi athena") ||
      cleanLower.startsWith("e ai athena") ||
      cleanLower.startsWith("e aí athena") ||
      cleanLower.startsWith("bom dia") ||
      cleanLower.startsWith("boa tarde") ||
      cleanLower.startsWith("boa noite") ||
      cleanLower.includes("tudo bem com voce") ||
      cleanLower.includes("tudo bem com você") ||
      cleanLower.includes("como voce esta") ||
      cleanLower.includes("como você está") ||
      cleanLower.includes("como vai");

    if (isGreeting && cleanLower.length < 40) {
      if (activeProjectTitle) {
        return `Olá, Paulo! Tudo ótimo por aqui! 😊\n\nEstou com a workspace de **"${activeProjectTitle}"** aberta e acompanhando cada detalhe com você. Como foi o seu dia? Em que ponto você gostaria que a gente concentrasse as energias hoje?`;
      }
      return `Olá, Paulo! Tudo excelente por aqui! 😊\n\nEstou 100% conectada ao seu ecossistema no VARYNTH OS, pronta para trocar ideias, estruturar raciocínios ou te ajudar com seus projetos e pesquisas. Como você está hoje? O que temos na pauta?`;
    }

    // 8. Brainstorming & Ideation Mode
    if (
      mode === "brainstorm" ||
      cleanLower.includes("pensando em") ||
      cleanLower.includes("o que acha de") ||
      cleanLower.includes("ideia")
    ) {
      return `Gostei dessa reflexão! Olhando para essa ideia por alguns ângulos:\n\n1. **Oportunidade Principal:** Isso pode se conectar diretamente com o material que você já fichou no Vault e gerar uma entrega com muita autoridade.\n2. **Atenção aos Prazos:** Vale ponderar como encaixar essa nova frente sem sobrecarregar as entregas que já estão no Chronos.\n3. **Direção Prática:** Podemos rascunhar um experimento no Labs para testar a tração antes de virar um projeto oficial.\n\nO que você acha dessa abordagem?`;
    }

    // 9. Open Questions & Concept Inquiries ("você sabe o que é...", "como funciona...", "o que é...", etc.)
    let subject = prompt
      .replace(/^(você sabe o que é|voce sabe o que e|você sabe o que|voce sabe o que|você sabe|voce sabe|o que é|o que e|qual é|qual e|como funciona|quem é|quem e)[:\s]*/i, "")
      .replace(/\bathena\b/gi, "")
      .replace(/\bathenas\b/gi, "")
      .replace(/[?.,!]/g, "")
      .trim();

    if (!subject) subject = prompt;

    return `Sobre **"${subject}"**, analisando sob uma perspectiva ampla e conceitual:\n\n1. **Definição & Contexto:** Trata-se de um tema com múltiplos desdobramentos práticos, teóricos e metodológicos.\n2. **Conexão com o Ecossistema:** Podemos cruzar essa questão com as fontes e referências catalogadas no seu Vault ou estruturar uma discussão crítica na Argument Arena.\n3. **Visão Dialética (Conselho da Athena):** Para aprofundar, vale confrontar a teoria com evidências empíricas e casos reais.\n\nEm qual vertente de **${subject}** você gostaria de focar a nossa discussão?`;
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
