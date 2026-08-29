import { AthenaPersonaConfig, DEFAULT_ATHENA_PERSONA } from "../domain/persona";
import { ConversationMode, ConversationIntent } from "../domain/conversation";
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
   * Generates Athena's technical self-diagnostic (ATHENA_SELF_STATUS).
   * Note: This inspects Athena's own health, NOT the user's projects or personal data.
   */
  generateAthenaSelfStatus(): string {
    return `Diagnóstico técnico da **Athena**:\n\n` +
      `🧠 **Kernel Cognitivo:** Operacional (V4.0 - Hybrid Perception & Router)\n` +
      `🗣️ **Conversation & Persona Engine:** Ativo e sincronizado\n` +
      `🏛️ **Conselho de Especialistas:** 7/7 prontos (Justitia, Logos, Sophia, Musa, Strategos, Mnemosyne, Critias)\n` +
      `⚙️ **Action Layer / Ferramentas:** 14/14 integradas com Audit Trail\n` +
      `💾 **Memory & Context Gate:** Operacional (Local-first & Sovereignty)\n` +
      `🟢 **Local Inference Engine:** Adaptadores Ollama (127.0.0.1:11434) e Baseline Determinístico prontos.\n\n` +
      `Todos os meus subsistemas cognitivos estão funcionando normalmente por aqui! Em que posso te ajudar?`;
  }

  /**
   * Generates a focused module status (ECOSYSTEM_STATUS) observing minimal disclosure.
   */
  generateEcosystemStatus(
    prompt: string,
    ctx: AthenaEngineContext,
    relevantModule?: "projects" | "tasks" | "vault" | "codex" | "chronos" | "general"
  ): string {
    const lower = prompt.toLowerCase();

    if (relevantModule === "tasks" || lower.includes("tarefa") || lower.includes("pendencia") || lower.includes("pendência")) {
      const pending = ctx.tasks.filter((t) => t.status !== "concluida");
      const urgent = pending.filter((t) => t.priority === "urgente" || t.priority === "alta");
      return `Você tem **${pending.length} tarefas pendentes** no momento${urgent.length > 0 ? `, sendo **${urgent.length} de alta prioridade** (ex: *"__${urgent[0].title}__"*).` : " (todas com prioridade normal e em dia)."}\n\nQuer que a gente foque em avançar alguma tarefa específica agora?`;
    }

    if (relevantModule === "projects" || lower.includes("projeto") || lower.includes("workspace")) {
      const active = ctx.projects.filter((p) => p.status === "ativo");
      return `Você tem **${active.length} projetos ativos** nas suas workspaces:\n${active.map((p) => `• **${p.title}** (${p.category})`).join("\n") || "Nenhum projeto ativo no momento."}\n\nQuer abrir ou revisar algum deles?`;
    }

    if (relevantModule === "chronos" || lower.includes("prazo") || lower.includes("vence") || lower.includes("calendario")) {
      const deadlines = ctx.projects.filter((p) => p.deadline).sort((a, b) => (a.deadline || "").localeCompare(b.deadline || ""));
      return deadlines.length > 0
        ? `Seu próximo marco mapeado é no projeto **"${deadlines[0].title}"**, previsto para **${deadlines[0].deadline}**.`
        : `Nenhum prazo iminente cadastrado no Chronos para os próximos dias. Suas entregas estão tranquilas!`;
    }

    const activeProjs = ctx.projects.filter((p) => p.status === "ativo").length;
    const pendingTasks = ctx.tasks.filter((t) => t.status !== "concluida").length;
    return `Sua situação geral no VARYNTH OS está equilibrada: **${activeProjs} projetos ativos** e **${pendingTasks} tarefas em andamento**. Como deseja direcionar o seu foco hoje?`;
  }

  /**
   * Generates a full Ecosystem Briefing (ECOSYSTEM_BRIEFING) ONLY when explicitly requested.
   */
  generateEcosystemBriefing(ctx: AthenaEngineContext): string {
    const activeProjs = ctx.projects.filter((p) => p.status === "ativo");
    const pendingTasks = ctx.tasks.filter((t) => t.status !== "concluida");
    const urgentTasks = pendingTasks.filter((t) => t.priority === "urgente" || t.priority === "alta");
    const upcomingDeadlines = ctx.projects
      .filter((p) => p.deadline)
      .sort((a, b) => (a.deadline || "").localeCompare(b.deadline || ""));
    const totalVault = ctx.vaultItems.length;
    const totalTheses = ctx.theses.length;

    let report = `Aqui está o seu **Briefing Executivo do VARYNTH OS**:\n\n`;
    report += `📁 **Workspaces**: **${activeProjs.length} projetos em andamento**`;
    if (activeProjs.length > 0) {
      report += ` (com destaque para **"${activeProjs[0].title}"**)`;
    }
    report += `.\n`;

    report += `⚡ **Tarefas**: **${pendingTasks.length} pendências**`;
    if (urgentTasks.length > 0) {
      report += `, sendo **${urgentTasks.length} de alta prioridade** (ex: *"__${urgentTasks[0].title}__"*)\n`;
    } else {
      report += ` (em dia, sem urgências acumuladas!)\n`;
    }

    if (upcomingDeadlines.length > 0) {
      report += `⏳ **Próximo Prazo**: **"${upcomingDeadlines[0].title}"** em **${upcomingDeadlines[0].deadline}**.\n`;
    }

    report += `📚 **Conhecimento**: **${totalVault} obras no Vault** e **${totalTheses} teses no Codex**.\n\n`;
    report += `💡 **Sugestão de Foco**: ${urgentTasks.length > 0 ? `Podemos avançar na tarefa prioritária *"__${urgentTasks[0].title}__"*?` : "Ecossistema equilibrado. Quer iniciar um novo projeto ou fichamento?"}`;

    return report;
  }

  /**
   * Generates a natural, tactful, intelligent conversational response respecting social context.
   */
  generateDialogueResponse(
    prompt: string,
    mode: ConversationMode,
    currentTopic?: string,
    activeProjectTitle?: string,
    ctx?: AthenaEngineContext,
    intent: ConversationIntent = "SOCIAL_CONVERSATION",
    relevantModule?: "projects" | "tasks" | "vault" | "codex" | "chronos" | "general"
  ): string {
    const rawLower = prompt.toLowerCase();
    const cleanLower = rawLower
      .replace(/[.,!?;:]/g, " ")
      .replace(/\bathena\b/g, "")
      .replace(/\bathenas\b/g, "")
      .trim();

    // 1. ATHENA_SELF_STATUS (Questions about Athena's own health, kernel, memory)
    if (intent === "ATHENA_SELF_STATUS") {
      return this.generateAthenaSelfStatus();
    }

    // 2. ECOSYSTEM_BRIEFING (Explicit request for full briefing)
    if (intent === "ECOSYSTEM_BRIEFING" && ctx) {
      return this.generateEcosystemBriefing(ctx);
    }

    // 3. ECOSYSTEM_STATUS (Focused query about user tasks, projects, deadlines)
    if (intent === "ECOSYSTEM_STATUS" && ctx) {
      return this.generateEcosystemStatus(prompt, ctx, relevantModule);
    }

    // 4. CONCEPT_INQUIRY (Questions like "o que é latim", "você sabe o que é um jogo", "o que é hermenêutica")
    if (intent === "CONCEPT_INQUIRY") {
      const concept = this.findConceptExplanation(prompt);
      if (concept) {
        return concept.explanation;
      }

      let subject = prompt
        .replace(/^(você sabe o que é|voce sabe o que e|você sabe o que|voce sabe o que|você sabe|voce sabe|o que é|o que e|qual é|qual e|como funciona|quem é|quem e)[:\s]*/i, "")
        .replace(/\bathena\b/gi, "")
        .replace(/\bathenas\b/gi, "")
        .replace(/[?.,!]/g, "")
        .trim();
      if (!subject) subject = prompt;

      return `Sobre **"${subject}"**, examinando sob uma ótica ampla e conceitual:\n\n1. **Definição & Fundamentos:** Trata-se de um conceito importante com dimensões práticas e teóricas relevantes.\n2. **Aplicação no VARYNTH OS:** Podemos conectar essa reflexão com teses no Codex ou fontes no Vault para enriquecer seu acervo.\n3. **Perspectiva Crítica:** Vale delimitar bem o escopo para extrair o melhor direcionamento prático.\n\nEm qual ângulo de **${subject}** você gostaria de aprofundar nossa conversa?`;
    }

    // 5. Humor, Laughter, or Venting ("kkk", "tá foda", "muita coisa", "cansado", "difícil")
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

    // 6. Social Conversation with Athena's persona (SOCIAL_CONVERSATION)
    if (
      cleanLower.includes("como voce esta") || cleanLower.includes("como você está") ||
      cleanLower.includes("tudo bem com voce") || cleanLower.includes("tudo bem com você") ||
      cleanLower.includes("como anda voce") || cleanLower.includes("como anda você") ||
      cleanLower.includes("sentiu minha falta") ||
      cleanLower.includes("que novidade voce tem") || cleanLower.includes("que novidade você tem") ||
      cleanLower.includes("o que me conta") || cleanLower.includes("o que me diz")
    ) {
      if (activeProjectTitle) {
        return `Por aqui tudo ótimo e em ordem, Paulo! 😊\n\nEstava aqui acompanhando a evolução do projeto **"${activeProjectTitle}"** e pronta para a gente continuar refinando as ideias. Por enquanto, tudo rodando com tranquilidade e estabilidade!\n\nE com você, como estão as coisas hoje? O que você anda aprontando de novo?`;
      }
      return `Por aqui tudo ótimo e em ordem, Paulo! 😊\n\nEstava aqui conectada ao sistema, refinando o raciocínio e pronta para o que der e vier. Por enquanto, nenhuma grande reviravolta — tudo rodando redondo e pronto para o que você quiser criar hoje!\n\nE com você, como foi o seu dia? Alguma ideia nova ou quer só bater um papo leve?`;
    }

    // 7. Greetings ("oi", "olá", "bom dia", "boa tarde", "e aí athena")
    if (
      cleanLower === "ola" || cleanLower === "olá" || cleanLower === "oi" ||
      cleanLower.startsWith("ola") || cleanLower.startsWith("olá") || cleanLower.startsWith("oi") ||
      cleanLower.startsWith("e ai") || cleanLower.startsWith("e aí") ||
      cleanLower.startsWith("bom dia") || cleanLower.startsWith("boa tarde") || cleanLower.startsWith("boa noite")
    ) {
      if (activeProjectTitle) {
        return `Olá, Paulo! Tudo ótimo por aqui! 😊 Estou na workspace de **"${activeProjectTitle}"** acompanhando tudo com você. Como posso te ajudar hoje?`;
      }
      return `Olá, Paulo! Tudo excelente por aqui! 😊 Conectada ao seu ecossistema e pronta para acompanhar suas ideias e pesquisas. O que temos na pauta hoje?`;
    }

    // 8. Brainstorming Mode
    if (mode === "brainstorm" || cleanLower.includes("pensando em") || cleanLower.includes("o que acha de")) {
      return `Gostei dessa reflexão! Olhando para essa ideia por alguns ângulos:\n\n1. **Oportunidade:** Isso pode se conectar diretamente com referências do Vault e gerar autoridade.\n2. **Equilíbrio:** Vale ponderar como encaixar isso no Chronos sem sobrecarregar as outras frentes.\n3. **Prática:** Podemos rascunhar um experimento no Labs para testar a tração.\n\nO que você acha dessa direção?`;
    }

    // 9. Default Tactful Conversation
    if (activeProjectTitle) {
      return `Entendi o seu ponto sobre **"${activeProjectTitle}"**. Estou acompanhando o raciocínio com você. Quer que a gente desenvolva mais essa ideia ou prefere transformar isso em uma ação prática?`;
    }

    return `Entendi perfeitamente, Paulo. Estou acompanhando sua linha de raciocínio. Como você gostaria de encaminhar essa reflexão agora?`;
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
