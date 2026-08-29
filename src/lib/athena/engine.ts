import {
  AthenaMessage,
  AthenaScope,
  AthenaActionCard,
  Project,
  Task,
  VaultItem,
  ChronosEvent,
  ArgumentThesis,
  EvidenceItem,
  Opportunity,
  PriorityLevel,
} from "../types";

export interface AthenaEngineContext {
  projects: Project[];
  tasks: Task[];
  vaultItems: VaultItem[];
  chronosEvents: ChronosEvent[];
  theses: ArgumentThesis[];
  evidences: EvidenceItem[];
  opportunities: Opportunity[];
  addTask: (taskData: Omit<Task, "id" | "createdAt">) => Task;
  addNote: (noteData: { title: string; content: string; projectId?: string; tags: string[]; pinned?: boolean }) => unknown;
}

export function processAthenaQuery(
  rawPrompt: string,
  scope: AthenaScope,
  ctx: AthenaEngineContext
): AthenaMessage {
  const prompt = rawPrompt.trim();
  const lower = prompt.toLowerCase();

  // 1. INTENT: CRIAR TAREFA (ex: "crie uma tarefa para fichar X no projeto Y", "adicionar tarefa: ...")
  if (
    lower.startsWith("crie uma tarefa") ||
    lower.startsWith("criar tarefa") ||
    lower.startsWith("nova tarefa") ||
    lower.startsWith("adicione uma tarefa") ||
    lower.startsWith("adicionar tarefa")
  ) {
    let cleanTitle = prompt
      .replace(/^(crie uma tarefa|criar tarefa|nova tarefa|adicione uma tarefa|adicionar tarefa)[:\s]*/i, "")
      .trim();

    let matchedProject: Project | undefined;
    let priority: PriorityLevel = "media";

    if (lower.includes("urgente") || lower.includes("alta prioridade")) {
      priority = "urgente";
      cleanTitle = cleanTitle.replace(/\burgente\b/gi, "").replace(/\balta prioridade\b/gi, "").trim();
    }

    // Match project name
    for (const p of ctx.projects) {
      if (lower.includes(p.title.toLowerCase()) || (p.tags && p.tags.some((t) => lower.includes(t)))) {
        matchedProject = p;
        break;
      }
    }

    if (!cleanTitle) {
      cleanTitle = "Nova tarefa sugerida pela Athena";
    }

    const createdTask = ctx.addTask({
      title: cleanTitle,
      projectId: matchedProject?.id,
      priority,
      status: "a_fazer",
    });

    return {
      id: "athena-" + Date.now(),
      sender: "athena",
      text: `Entendido! Criei a tarefa **"${createdTask.title}"** com prioridade **${priority.toUpperCase()}**${matchedProject ? ` vinculada ao projeto **${matchedProject.title}**` : " no escopo geral"}.`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      scope,
      actionCard: {
        type: "tarefa_criada",
        title: createdTask.title,
        subtitle: matchedProject ? `Projeto: ${matchedProject.title}` : "Tarefa Geral",
        link: matchedProject ? `/projects/${matchedProject.id}` : "/dashboard",
        linkLabel: "Ver no Projeto",
      },
    };
  }

  // 2. INTENT: CRIAR NOTA (ex: "crie uma nota sobre X", "anote isso: ...")
  if (
    lower.startsWith("crie uma nota") ||
    lower.startsWith("criar nota") ||
    lower.startsWith("anote isso") ||
    lower.startsWith("anotar")
  ) {
    const cleanContent = prompt
      .replace(/^(crie uma nota|criar nota|anote isso|anotar)[:\s]*/i, "")
      .trim();

    ctx.addNote({
      title: `Nota Rápida — ${new Date().toLocaleDateString()}`,
      content: cleanContent || "Anotação rápida registrada via Athena AI.",
      tags: ["athena", "captura-rapida"],
      pinned: false,
    });

    return {
      id: "athena-" + Date.now(),
      sender: "athena",
      text: `Anotação capturada e salva com sucesso nas Notas do seu VARYNTH OS.`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      scope,
      actionCard: {
        type: "nota_criada",
        title: "Nota salva nas notas globais",
        subtitle: `"${cleanContent.slice(0, 60)}..."`,
        link: "/dashboard",
        linkLabel: "Abrir no Início",
      },
    };
  }

  // 3. INTENT: EXCLUIR / LIXEIRA (Protocolo de 10 dias)
  if (
    lower.startsWith("excluir") ||
    lower.startsWith("apagar") ||
    lower.startsWith("remover") ||
    lower.startsWith("deletar") ||
    lower.includes("lixeira")
  ) {
    return {
      id: "athena-" + Date.now(),
      sender: "athena",
      text: `🗑️ **Protocolo de Exclusão Segura (Retenção de 10 Dias):**\n\nNo VARYNTH OS, todas as exclusões exigem confirmação manual e são direcionadas para a **Lixeira Central** com prazo de **10 dias** antes da auto-destruição permanente.\n\nDurante esse período de 10 dias, você pode **restaurar** qualquer projeto, tarefa, nota ou código excluído com um único clique na Lixeira.`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      scope,
      actionCard: {
        type: "diagnostico",
        title: "Lixeira Central do VARYNTH OS",
        subtitle: "Gerenciar itens excluídos e retenção de 10 dias",
        link: "/modules/trash",
        linkLabel: "Abrir Lixeira",
      },
    };
  }

  // 4. INTENT: CONSULTAR PRAZOS / DEADLINES
  if (
    lower.includes("prazo") ||
    lower.includes("deadline") ||
    lower.includes("quando vence") ||
    lower.includes("calendario") ||
    lower.includes("cronograma")
  ) {
    const projectDeadlines = ctx.projects
      .filter((p) => p.deadline)
      .map((p) => `• **${p.title}**: entrega prevista para **${p.deadline}** (Prioridade: ${p.priority})`);

    const chronosDeadlines = ctx.chronosEvents
      .filter((e) => !e.completed)
      .map((e) => `• **[${e.type.toUpperCase()}] ${e.title}**: data **${e.date}**${e.startTime ? ` às ${e.startTime}` : ""}`);

    const allDeadlines = [...projectDeadlines, ...chronosDeadlines];

    return {
      id: "athena-" + Date.now(),
      sender: "athena",
      text:
        allDeadlines.length > 0
          ? `Aqui estão os principais prazos mapeados no seu Chronos e nas workspaces:\n\n${allDeadlines.join("\n")}\n\nRecomendo focar primeiro nas entregas com prioridade urgente.`
          : "Não encontrei prazos pendentes cadastrados no momento.",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      scope,
      actionCard: {
        type: "prazos",
        title: "Prazos & Calendário Sincronizados",
        subtitle: `${allDeadlines.length} compromissos ativos no Chronos`,
        link: "/modules/chronos",
        linkLabel: "Abrir Chronos",
      },
    };
  }

  // 4. INTENT: DIAGNÓSTICO DO SISTEMA / STATUS GERAL
  if (
    lower.includes("diagnostico") ||
    lower.includes("status") ||
    lower.includes("resumo") ||
    lower.includes("como esta meu") ||
    lower.includes("visao geral")
  ) {
    const activeProj = ctx.projects.filter((p) => p.status === "ativo").length;
    const pendingTasks = ctx.tasks.filter((t) => t.status !== "concluida").length;
    const completedTasks = ctx.tasks.filter((t) => t.status === "concluida").length;
    const totalVault = ctx.vaultItems.length;
    const totalTheses = ctx.theses.length;
    const totalOpps = ctx.opportunities.length;

    const urgentTasks = ctx.tasks.filter((t) => t.status !== "concluida" && (t.priority === "urgente" || t.priority === "alta"));

    return {
      id: "athena-" + Date.now(),
      sender: "athena",
      text: `📊 **Diagnóstico Operacional do VARYNTH OS:**\n\n• **Projetos Ativos**: ${activeProj} workspaces em andamento\n• **Tarefas**: ${pendingTasks} pendentes / ${completedTasks} já concluídas\n• **Vault de Conhecimento**: ${totalVault} obras e jurisprudências fichadas\n• **Argument Arena**: ${totalTheses} teses dialéticas estruturadas\n• **Radar de Editais**: ${totalOpps} oportunidades e bolsas mapeadas\n\n💡 **Status Operacional**: ${urgentTasks.length > 0 ? `Você tem ${urgentTasks.length} tarefas prioritárias pendentes para avançar.` : "Tudo em dia no seu ecossistema!"}`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      scope,
      actionCard: {
        type: "diagnostico",
        title: "VARYNTH OS — Status Operacional 100%",
        subtitle: `${activeProj} Projetos · ${pendingTasks} Tarefas Pendentes`,
        link: "/dashboard",
        linkLabel: "Ir para o Cockpit",
      },
    };
  }

  // 5. INTENT: JURÍDICO / TESES / CODEX
  if (
    scope === "juridico" ||
    lower.includes("tese") ||
    lower.includes("argumento") ||
    lower.includes("stf") ||
    lower.includes("stj") ||
    lower.includes("direito") ||
    lower.includes("jurisprudencia")
  ) {
    const thesis = ctx.theses[0];
    if (thesis) {
      return {
        id: "athena-" + Date.now(),
        sender: "athena",
        text: `⚖️ **Análise Jurídica da Athena (Codex):**\n\nNa tese **"${thesis.title}"**, a controvérsia central é:\n> *"${thesis.question}"*\n\n• **Pontos Fortes (Prós)**: ${thesis.pros.length > 0 ? thesis.pros.map((p) => p.statement).join("; ") : "Nenhum cadastrado"}\n• **Riscos & Objeções (Contras)**: ${thesis.cons.length > 0 ? thesis.cons.map((c) => c.statement).join("; ") : "Nenhum cadastrado"}\n• **Precedentes Mapeados**: ${thesis.precedents.length > 0 ? thesis.precedents.join(" | ") : "Nenhum precedent cadastrado"}\n\n${thesis.conclusion ? `• **Síntese Pessoal**: ${thesis.conclusion}` : ""}`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        scope: "juridico",
        actionCard: {
          type: "tese",
          title: `Tese: ${thesis.title}`,
          subtitle: `Área: ${thesis.area}`,
          link: "/modules/codex",
          linkLabel: "Abrir na Argument Arena",
        },
      };
    } else {
      return {
        id: "athena-" + Date.now(),
        sender: "athena",
        text: "⚖️ **Modo Jurídico Ativo**: Nenhuma tese está cadastrada no momento na Argument Arena. Você pode cadastrar uma nova tese jurídica para iniciarmos a análise dialética de prós, contras e precedentes.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        scope: "juridico",
        actionCard: {
          type: "tese",
          title: "Cadastrar Nova Tese",
          subtitle: "Estruturar controvérsia jurídica",
          link: "/modules/codex",
          linkLabel: "Ir para o Codex",
        },
      };
    }
  }

  // 6. INTENT: PESQUISA / EVIDENCE BOARD
  if (
    scope === "pesquisa" ||
    lower.includes("pesquisa") ||
    lower.includes("evidencia") ||
    lower.includes("artigo") ||
    lower.includes("quote") ||
    lower.includes("qualisf") ||
    lower.includes("abnt")
  ) {
    const evCount = ctx.evidences.length;
    const strongEvs = ctx.evidences.filter((e) => e.strength === "forte");

    if (evCount > 0) {
      return {
        id: "athena-" + Date.now(),
        sender: "athena",
        text: `🔬 **Assistente de Pesquisa & Metodologia:**\n\nVocê tem **${evCount} evidências científicas** catalogadas no Evidence Board, sendo **${strongEvs.length} de força alta**.\n\n${strongEvs.length > 0 ? `Evidência em destaque:\n> *"${strongEvs[0]?.claim}"*\n> *(Fonte: ${strongEvs[0]?.source})*` : ""}\n\nPosso ajudar a estruturar citações e argumentação científica. Como deseja prosseguir?`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        scope: "pesquisa",
        actionCard: {
          type: "evidencia",
          title: "Evidence Board Científico",
          subtitle: `${evCount} evidências cadastradas`,
          link: "/modules/research",
          linkLabel: "Abrir Research",
        },
      };
    } else {
      return {
        id: "athena-" + Date.now(),
        sender: "athena",
        text: "🔬 **Modo Pesquisa Acadêmica**: Nenhuma evidência bibliográfica cadastrada ainda no Evidence Board. Você pode cadastrar citações e fontes com nível de força probatória no módulo Research.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        scope: "pesquisa",
        actionCard: {
          type: "evidencia",
          title: "Cadastrar Evidência",
          subtitle: "Vincular fontes probatórias",
          link: "/modules/research",
          linkLabel: "Ir para o Research",
        },
      };
    }
  }

  // 7. INTENT: EDITAIS / OPORTUNIDADES
  if (
    lower.includes("edital") ||
    lower.includes("bolsa") ||
    lower.includes("premio") ||
    lower.includes("oportunidade") ||
    lower.includes("concurso")
  ) {
    if (ctx.opportunities.length > 0) {
      const oppList = ctx.opportunities.map(
        (o) => `• **${o.title}** (${o.institution}): Prazo **${o.deadline}** ${o.prizeOrGrant ? `— *${o.prizeOrGrant}*` : ""} [Status: ${o.status.toUpperCase()}]`
      );

      return {
        id: "athena-" + Date.now(),
        sender: "athena",
        text: `🏆 **Radar de Oportunidades & Editais:**\n\n${oppList.join("\n")}\n\nAcompanhe os prazos de submissão no pipeline para não perder as datas limites.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        scope,
        actionCard: {
          type: "edital",
          title: "Radar de Editais & Bolsas",
          subtitle: `${ctx.opportunities.length} chamadas mapeadas`,
          link: "/modules/opportunities",
          linkLabel: "Abrir Pipeline de Editais",
        },
      };
    } else {
      return {
        id: "athena-" + Date.now(),
        sender: "athena",
        text: "🏆 **Radar de Oportunidades**: Nenhum edital ou bolsa de fomento cadastrado no momento. Cadastre editais no radar para acompanhar o pipeline de submissão.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        scope,
        actionCard: {
          type: "edital",
          title: "Cadastrar Edital",
          subtitle: "Mapear chamadas acadêmicas",
          link: "/modules/opportunities",
          linkLabel: "Ir para Oportunidades",
        },
      };
    }
  }

  // 8. FALLBACK / CONVERSA GERAL INTELIGENTE
  return {
    id: "athena-" + Date.now(),
    sender: "athena",
    text: `Olá, Paulo! Estou conectada ao núcleo do seu **VARYNTH OS**.\n\nCompreendi sua mensagem sobre *"${prompt}"*. Como seu copilot digital, posso:\n\n1. **Executar Ações**: Crie tarefas, notas e marque prazos com comandos diretos.\n2. **Confrontar Teses**: Analisar argumentos na Argument Arena do Codex.\n3. **Sintetizar Evidências**: Cruzar artigos do Vault com o Evidence Board da pesquisa.\n4. **Monitorar Editais**: Acompanhar prazos fatais de bolsas e concursos.\n\nComo deseja que eu te ajude agora?`,
    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    scope,
  };
}

