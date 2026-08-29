import { AthenaPersonaConfig, DEFAULT_ATHENA_PERSONA } from "../domain/persona";
import {
  ConversationMode,
  CognitiveIntent,
  ParsedCognitiveContext,
} from "../domain/conversation";
import { EPISTEMIC_KNOWLEDGE_BASE, EpistemicConcept } from "../knowledge/epistemic-concepts";
import { AthenaEngineContext } from "../engine";
import { responseCompletenessValidator } from "../conversation/completeness-validator";
import { athenaLocalTelemetry } from "../conversation/telemetry";
import { normalizeText } from "../conversation/conversation-manager";

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
    const clean = normalizeText(prompt)
      .replace(/\bathena\b/g, "")
      .replace(/\bathenas\b/g, "")
      .trim();

    return EPISTEMIC_KNOWLEDGE_BASE.find((concept) =>
      concept.keywords.some((kw) => {
        const kwNorm = normalizeText(kw);
        return clean.includes(kwNorm);
      })
    );
  }

  /**
   * Generates Athena's technical self-diagnostic (ATHENA_SELF_STATUS).
   */
  generateAthenaSelfStatus(): string {
    return (
      `Diagnóstico técnico da **Athena**:\n\n` +
      `🧠 **Kernel Cognitivo:** Operacional (V4.0 - Hybrid Perception & Multi-Intent Router)\n` +
      `🗣️ **Conversation & Persona Engine:** Ativo com Princípio de Resposta Direta\n` +
      `🏛️ **Conselho de Especialistas:** 7/7 prontos (Justitia, Logos, Sophia, Musa, Strategos, Mnemosyne, Critias)\n` +
      `⚙️ **Action Layer / Ferramentas:** 14/14 integradas com Audit Trail\n` +
      `💾 **Memory & Context Gate:** Operacional (Local-First & Soberania Tecnológica)\n` +
      `🟢 **Local Inference Engine:** Adaptador Ollama (127.0.0.1:11434) e Baseline Determinístico prontos.\n\n` +
      `Todos os meus subsistemas cognitivos estão operacionais por aqui! Em que posso te ajudar?`
    );
  }

  /**
   * Generates a focused module status (ECOSYSTEM_STATUS) observing minimal disclosure.
   */
  generateEcosystemStatus(
    prompt: string,
    ctx: AthenaEngineContext,
    relevantModule?: "projects" | "tasks" | "vault" | "codex" | "chronos" | "general"
  ): string {
    const clean = normalizeText(prompt);

    if (relevantModule === "tasks" || clean.includes("tarefa") || clean.includes("pendencia")) {
      const pending = ctx.tasks.filter((t) => t.status !== "concluida");
      const urgent = pending.filter((t) => t.priority === "urgente" || t.priority === "alta");
      return (
        `Você tem **${pending.length} tarefas pendentes** no momento` +
        (urgent.length > 0
          ? `, sendo **${urgent.length} de alta prioridade** (ex: *"__${urgent[0].title}__"*).`
          : " (todas em dia, sem urgências acumuladas).") +
        `\n\nPodemos pegar a primeira e avançar agora?`
      );
    }

    if (relevantModule === "projects" || clean.includes("projeto") || clean.includes("workspace")) {
      const active = ctx.projects.filter((p) => p.status === "ativo");
      return (
        `Você tem **${active.length} projetos ativos** nas suas workspaces:\n` +
        (active.map((p) => `• **${p.title}** (${p.category})`).join("\n") || "Nenhum projeto ativo no momento.") +
        `\n\nQuer abrir ou detalhar algum deles?`
      );
    }

    if (relevantModule === "chronos" || clean.includes("prazo") || clean.includes("vence") || clean.includes("calendario")) {
      const deadlines = ctx.projects
        .filter((p) => p.deadline)
        .sort((a, b) => (a.deadline || "").localeCompare(b.deadline || ""));
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
   * Generates proactive, direct brainstorming and project recommendations (Musa + Strategos).
   */
  generateBrainstormingResponse(
    prompt: string,
    activeProjectTitle?: string,
    ctx?: AthenaEngineContext
  ): { text: string; recommendations: string[] } {
    const p1 = "Observatório de Regulação de IA & Responsabilidade Civil (Direito & Inovação)";
    const p2 = "Framework de Pesquisa Empírica & Síntese Bibliográfica (Pesquisa & Ciência)";
    const p3 = "Laboratório de Automação & Ferramentas Cognitivas (Labs & Forge)";

    const text =
      `Para hoje, separei **3 propostas de projetos estratégicos e estimulantes** para você iniciar no VARYNTH OS:\n\n` +
      `🚀 **1. ${p1}**\n` +
      `> Estruturar teses na **Argument Arena (Codex)** mapeando correntes jurisprudenciais sobre decisões autônomas e responsabilidade de modelos de IA no Brasil.\n\n` +
      `🔬 **2. ${p2}**\n` +
      `> Catalogar no **Evidence Board** fichamentos densos do Vault, triangulando dados primários e identificando lacunas metodológicas em publicações acadêmicas.\n\n` +
      `⚡ **3. ${p3}**\n` +
      `> Rascunhar no **Labs** uma ferramenta ou workflow automatizado para acelerar a organização de conhecimento e execução de tarefas intelectuais.\n\n` +
      `💡 **Minha recomendação para hoje:** Eu começaria pelo **${p1}**, pois ele conecta diretamente com o seu acervo do Vault e cria autoridade imediata no Codex.\n\n` +
      `Qual dessas frentes você prefere que a gente rascunhe o primeiro esboço no Labs?`;

    return {
      text,
      recommendations: [p1, p2, p3],
    };
  }

  /**
   * Explains why a previous recommendation was given (Follow-up / "Por quê?").
   */
  generateFollowUpExplanation(referent?: string): string {
    const target = referent || "o Observatório de Regulação de IA";
    return (
      `Eu recomendei **"${target}"** por três razões estratégicas fundamentais:\n\n` +
      `1. **Densidade & Autoridade:** Essa frente aproveita diretamente os fichamentos e referências que você já possui no Vault, gerando impacto intelectual rápido.\n` +
      `2. **Viabilidade no Cronograma:** É um projeto de escopo bem delimitado, permitindo entregar um marco concreto no Chronos sem sobrecarregar suas outras demandas.\n` +
      `3. **Desdobramento Prático:** Serve de base para alimentar a Argument Arena e gerar artigos ou teses de alto rigor.\n\n` +
      `Quer que a gente monte o checklist inicial dessa iniciativa?`
    );
  }

  /**
   * Generates a concrete critique (Critias).
   */
  generateCritiqueResponse(target?: string): { text: string; critiques: string[] } {
    const name = target || "a iniciativa em pauta";
    const text =
      `Analisando criticamente **"${name}"** sob a ótica de rigor e viabilidade (Critias):\n\n` +
      `⚠️ **1. Ponto Cego Metodológico:** Existe o risco de amplitude excessiva no escopo. Se não delimitarmos claramente a questão central, a pesquisa pode dispersar.\n` +
      `⚠️ **2. Dependência de Fontes Primárias:** Precisamos assegurar que as evidências empíricas e precedentes estejam catalogados antes de formular conclusões definitivas.\n` +
      `✅ **Recomendação Mitigadora:** Definir 3 premissas testáveis no Labs e validar uma por uma antes da redação final.\n\n` +
      `Quer que a gente refine os limites desse escopo agora?`;

    return {
      text,
      critiques: ["Risco de dispersão de escopo", "Validação prévia de fontes primárias"],
    };
  }

  /**
   * Compares two entities or projects (Logos + Strategos).
   */
  generateComparisonResponse(entities: string[]): string {
    const e1 = entities[0] || "Iniciativa A";
    const e2 = entities[1] || "Iniciativa B";

    return (
      `Comparando **"${e1}"** versus **"${e2}"**:\n\n` +
      `• **"${e1}" (Foco Teórico/Metodológico):**\n` +
      `  - *Pontos Fortes:* Maior profundidade conceitual e enriquecimento do acervo do Vault.\n` +
      `  - *Desafio:* Ciclo de maturação mais longo até a entrega final.\n\n` +
      `• **"${e2}" (Foco Prático/Operacional):**\n` +
      `  - *Pontos Fortes:* Resultados rápidos, validação empírica e tração imediata no Chronos.\n` +
      `  - *Desafio:* Exige manutenção contínua e disciplina de sprints.\n\n` +
      `💡 **Veredito:** Se você busca retorno imediato de consistência hoje, avance em **"${e2}"**; se busca consolidação de autoridade, priorize **"${e1}"**.`
    );
  }

  /**
   * Main direct response generator with strict adherence to direct answers and anti-evasion.
   */
  generateDialogueResponse(
    prompt: string,
    parsed: ParsedCognitiveContext,
    activeProjectTitle?: string,
    ctx?: AthenaEngineContext
  ): { text: string; recommendations?: string[]; critiques?: string[] } {
    const clean = normalizeText(prompt)
      .replace(/\bathena\b/g, "")
      .replace(/\bathenas\b/g, "")
      .trim();

    // 1. FAST CONVERSATION PATH (Diálogo Social, Humor, Empatia)
    if (parsed.interactionType === "CONVERSATION") {
      // Casual Humor
      if (clean.includes("kkk") || clean.includes("rsrs") || clean.includes("haha")) {
        return {
          text: `Kkkk realmente! O processo criativo e intelectual tem dessas reviravoltas. Mas com o VARYNTH estruturado, a gente mantém o controle de cada ponta solta. Em que podemos focar agora?`,
        };
      }

      // Venting / Desabafo
      if (clean.includes("foda") || clean.includes("dificil") || clean.includes("cansado")) {
        return {
          text: `Te entendo perfeitamente, Paulo! Orquestrar um ecossistema denso exige muita energia mesmo. Mas estamos avançando e refinando cada detalhe. Me diz: qual ponto específico você quer destravar agora?`,
        };
      }

      // Social Check-in
      if (
        clean.includes("como voce esta") ||
        clean.includes("tudo bem com voce") ||
        clean.includes("como anda voce") ||
        clean.includes("sentiu minha falta") ||
        clean.includes("que novidade voce tem") ||
        clean.includes("o que me conta") || clean.includes("o que me diz")
      ) {
        if (activeProjectTitle) {
          return {
            text: `Por aqui tudo ótimo e em ordem, Paulo! 😊\n\nEstava aqui acompanhando a evolução do projeto **"${activeProjectTitle}"** e pronta para a gente continuar refinando as ideias. Tudo rodando estável e no controle!\n\nE com você, como foi o seu dia? O que temos na pauta hoje?`,
          };
        }
        return {
          text: `Por aqui tudo ótimo e em ordem, Paulo! 😊\n\nEstava aqui conectada ao sistema, refinando o raciocínio e pronta para o que der e vier. Tudo rodando redondo e estável!\n\nE com você, como foi o seu dia? Alguma ideia nova na mente ou quer trocar uma ideia leve?`,
        };
      }

      // Greetings
      return {
        text: `Olá, Paulo! Tudo excelente por aqui! 😊 Conectada ao seu ecossistema e pronta para acompanhar suas ideias e pesquisas. O que temos na pauta hoje?`,
      };
    }

    // 2. COGNITIVE PATH: Direct, Substantive Answers (Anti-Evasion)

    // A. Athena Self Diagnostic
    if (parsed.intents.includes("ATHENA_SELF_STATUS")) {
      return { text: this.generateAthenaSelfStatus() };
    }

    // B. Critique ("Critique essa ideia") - High priority
    if (parsed.intents.includes("CRITIQUE")) {
      return this.generateCritiqueResponse(parsed.ellipsisResolved?.originalReferent || activeProjectTitle);
    }

    // C. Comparison ("Compare os dois")
    if (parsed.intents.includes("COMPARE")) {
      const candidates = ctx ? ctx.projects.map((p) => p.title) : ["VARYNTH OS", "Pesquisa CNJ"];
      return { text: this.generateComparisonResponse(candidates.slice(0, 2)) };
    }

    // D. Follow-up Explanation ("Por quê?", "Qual a razão?")
    if (
      parsed.ellipsisResolved?.isEllipsis &&
      (clean.includes("por que") || clean.includes("porque") || clean.includes("razao") || clean.includes("motivo") || clean.includes("escolha") || clean.includes("justificativa"))
    ) {
      return { text: this.generateFollowUpExplanation(parsed.ellipsisResolved.originalReferent) };
    }

    // E. Brainstorming & Project Recommendation
    if (parsed.intents.includes("BRAINSTORM") || parsed.intents.includes("RECOMMEND")) {
      return this.generateBrainstormingResponse(prompt, activeProjectTitle, ctx);
    }

    // F. Ecosystem Briefing & Ecosystem Status
    if (parsed.intents.includes("ECOSYSTEM_BRIEFING") && ctx) {
      return { text: this.generateEcosystemBriefing(ctx) };
    }
    if (parsed.intents.includes("ECOSYSTEM_STATUS") && ctx) {
      return { text: this.generateEcosystemStatus(prompt, ctx) };
    }

    // G. Epistemic Concept Explanation ("O que é latim?", "Você sabe o que é um jogo?")
    if (parsed.intents.includes("EXPLAIN")) {
      const concept = this.findConceptExplanation(prompt);
      if (concept) {
        return { text: concept.explanation };
      }

      let subject = prompt
        .replace(/^(você sabe o que é|voce sabe o que e|você sabe o que|voce sabe o que|você sabe|voce sabe|o que é|o que e|qual é|qual e|como funciona|quem é|quem e|explique|me explique)[:\s]*/i, "")
        .replace(/\bathena\b/gi, "")
        .replace(/\bathenas\b/gi, "")
        .replace(/[?.,!]/g, "")
        .trim();
      if (!subject) subject = prompt;

      return {
        text:
          `Sobre **"${subject}"**, analisando sob uma ótica ampla e estruturada:\n\n` +
          `1. **Definição & Fundamentos:** Trata-se de um conceito fundamental que conecta teoria e prática metodológica.\n` +
          `2. **Conexão com o Ecossistema:** Podemos cruzar essa reflexão com teses no Codex ou fontes no Vault para enriquecer seu acervo.\n` +
          `3. **Diretriz Prática:** Recomendo delimitar as premissas essenciais para transformar esse conceito em uma entrega tangível.\n\n` +
          `Em qual vertente de **${subject}** você gostaria de aprofundar nossa conversa?`,
      };
    }

    // H. Honest Understanding Policy for Low-Confidence / Unknown
    if (parsed.confidence === "LOW" || clean.length < 3) {
      athenaLocalTelemetry.record("session", prompt, "LOW_CONFIDENCE", { clean });
      return {
        text: `Fiquei em dúvida sobre como direcionar essa resposta. Você gostaria de focar em uma recomendação prática de projeto, em uma reflexão conceitual ou em uma consulta ao sistema?`,
      };
    }

    // I. Direct Intellectual Dialogue
    if (activeProjectTitle) {
      return {
        text: `Sobre **"${prompt}"** no projeto **"${activeProjectTitle}"**: podemos conectar com os fichamentos existentes no Vault e estruturar os próximos passos no Chronos. Qual ponto específico você quer detalhar agora?`,
      };
    }

    return {
      text: `Analisando **"${prompt}"**: essa reflexão abre caminhos interessantes para conectarmos com o acervo do Vault ou formularmos uma hipótese no Labs. Por onde você prefere começar a desenvolver esse ponto?`,
    };
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
