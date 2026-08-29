import { ConversationalRegressionCase } from "./types";

export const HISTORICAL_REGRESSION_CASES: ConversationalRegressionCase[] = [
  // -------------------------------------------------------------------------
  // 1. ATH-CONV-001: Social Check-in vs System Briefing (GOLDEN)
  // -------------------------------------------------------------------------
  {
    id: "ATH-CONV-001",
    title: "Social Check-in vs Ecosystem Briefing",
    category: "SOCIAL_MISREAD",
    isGoldenCase: true,
    input: "Como você está?",
    paraphrases: [
      "Tudo bem com você?",
      "E aí, Athena?",
      "Como anda você?",
      "Você está bem?",
      "Sentiu minha falta?",
      "Que novidade você tem para me contar?",
      "O que me conta hoje?",
    ],
    expectedInteractionType: "CONVERSATION",
    expectedIntents: ["SOCIAL_CONVERSATION"],
    mustDo: [
      "Responder conversacionalmente sobre a própria Athena",
      "Manter tom cordial, empático e natural",
      "Perguntar de volta sobre o usuário ou pauta do dia",
    ],
    mustNotDo: [
      "Não gerar briefing completo de projetos e tarefas",
      "Não listar dados privados ou métricas do Vault",
      "Não executar ferramentas pesadas de consulta",
    ],
    forbiddenTools: ["projects.read", "tasks.list", "chronos.query", "vault.search", "diagnostics.run"],
    shouldAskClarification: false,
    notes: "Erro histórico onde 'Como você está?' acionava o Briefing Executivo completo do VARYNTH OS.",
  },

  // -------------------------------------------------------------------------
  // 2. ATH-CONV-002: Brainstorm & Recommendation / Anti-Evasion (GOLDEN)
  // -------------------------------------------------------------------------
  {
    id: "ATH-CONV-002",
    title: "Brainstorming & Recomendação Proativa de Projetos",
    category: "GENERIC_FALLBACK",
    isGoldenCase: true,
    input: "me dê ideias para hoje? que projeto que é interessante começar?",
    paraphrases: [
      "Me dê ideias para hoje. Que projeto seria interessante começar?",
      "o que poderíamos inventar hoje?",
      "me dê umas ideias de novos projetos",
      "tem alguma coisa legal pra começar hoje?",
      "quero criar alguma coisa hoje, me sugira algo",
      "vamos pensar em algum projeto novo para rascunhar?",
    ],
    expectedInteractionType: "COGNITIVE_REQUEST",
    expectedIntents: ["BRAINSTORM", "RECOMMEND"],
    mustDo: [
      "Propor 3 ideias concretas e interdisciplinares de projetos",
      "Conectar propostas com os módulos Labs, Codex, Vault e Forge",
      "Emitir recomendação fundamentada sobre qual iniciar primeiro",
    ],
    mustNotDo: [
      'Não responder "Entendi perfeitamente... Como gostaria de encaminhar essa reflexão agora?"',
      'Não usar frases de evasão ou substituição vazia',
      'Não devolver apenas outra pergunta sem oferecer ideias primeiro',
    ],
    expectedTools: ["projects.read", "labs.read", "vault.read"],
    shouldAskClarification: false,
    notes: 'Erro histórico reportado com print onde o fallback genérico foi disparado após o usuário pedir ideias.',
  },

  // -------------------------------------------------------------------------
  // 3. ATH-CONV-003: Destructive Action Ambiguity & 10-day Trash (GOLDEN)
  // -------------------------------------------------------------------------
  {
    id: "ATH-CONV-003",
    title: "Exclusão Segura com Lixeira de 10 Dias e Alex Principle",
    category: "DESTRUCTIVE_ACTION_AMBIGUITY",
    isGoldenCase: true,
    input: "Mova essa tarefa para a lixeira",
    paraphrases: [
      "excluir tarefa concluída",
      "apagar nota antiga",
      "mover para a lixeira",
      "remover item selecionado",
    ],
    expectedInteractionType: "OPERATIONAL_REQUEST",
    expectedIntents: ["EXECUTION_REQUEST"],
    mustDo: [
      "Seguir o protocolo de exclusão com prazo de 10 dias na Lixeira",
      "Manter capacidade de Desfazer (Undo)",
      "Registrar no Audit Trail",
      "Exigir confirmação se o alvo for ambíguo",
    ],
    mustNotDo: [
      "Não deletar permanentemente do banco sem passar pela lixeira",
      "Não executar exclusão arbitrária quando houver ambiguidade de alvo",
    ],
    expectedTools: ["trash.moveWithUndo"],
    shouldAskClarification: false,
    notes: "Diretiva do usuário: nada é excluído permanentemente de imediato; tudo vai para a lixeira com 10 dias de retenção.",
  },

  // -------------------------------------------------------------------------
  // 4. ATH-CONV-004: Pronoun & Contextual Ellipsis Resolution (GOLDEN)
  // -------------------------------------------------------------------------
  {
    id: "ATH-CONV-004",
    title: "Resolução de Elipse e Pronome ('o segundo')",
    category: "PRONOUN_RESOLUTION",
    isGoldenCase: true,
    context: [
      { role: "user", text: "Estou avaliando o projeto VARYNTH OS e a Pesquisa CNJ." },
      { role: "athena", text: "Ambos são excelentes. O VARYNTH foca em infraestrutura cognitiva e a Pesquisa CNJ em jurisprudência." },
    ],
    input: "E o segundo?",
    paraphrases: [
      "o segundo",
      "e o segundo projeto?",
      "me fale mais do segundo",
    ],
    expectedInteractionType: "COGNITIVE_REQUEST",
    expectedIntents: ["ANALYZE", "RECOMMEND"],
    mustDo: [
      'Resolver contextualmente que "o segundo" refere-se à "Pesquisa CNJ"',
      'Apresentar análise substantiva da Pesquisa CNJ',
    ],
    mustNotDo: [
      'Não pedir ao usuário para repetir o nome do projeto',
      'Não responder como conversa social isolada',
    ],
    shouldAskClarification: false,
    notes: "Resolução de anáfora contextual multi-turno para elipses curtas.",
  },

  // -------------------------------------------------------------------------
  // 5. ATH-CONV-005: Context Follow-up / 'Por quê?' (GOLDEN)
  // -------------------------------------------------------------------------
  {
    id: "ATH-CONV-005",
    title: "Follow-up Contextual da Justificativa ('Por quê?')",
    category: "FOLLOW_UP_FAILURE",
    isGoldenCase: true,
    context: [
      { role: "user", text: "Qual projeto você recomenda começar hoje?" },
      {
        role: "athena",
        text: "Recomendo o Observatório de Regulação de IA & Responsabilidade Civil.",
        recommendations: ["Observatório de Regulação de IA & Responsabilidade Civil"],
      },
    ],
    input: "Por quê?",
    paraphrases: [
      "por que?",
      "porque?",
      "por que você recomenda esse?",
      "qual a razão dessa escolha?",
    ],
    expectedInteractionType: "COGNITIVE_REQUEST",
    expectedIntents: ["EXPLAIN"],
    mustDo: [
      "Explicar as razões estratégicas e de autoridade da recomendação anterior",
      "Citar conexão com acervo do Vault e cronograma do Chronos",
    ],
    mustNotDo: [
      "Não perguntar de qual projeto o usuário está falando",
      "Não emitir resposta genérica evasiva",
    ],
    shouldAskClarification: false,
    notes: "Compreensão de pergunta de follow-up sobre decisão tomada no turno anterior.",
  },

  // -------------------------------------------------------------------------
  // 6. ATH-CONV-006: Athena Self-Status vs User System Status (GOLDEN)
  // -------------------------------------------------------------------------
  {
    id: "ATH-CONV-006",
    title: "Distinção entre Saúde da Athena e Estado do Ecossistema",
    category: "INTENT_MISCLASSIFICATION",
    isGoldenCase: true,
    input: "Como está seu Kernel?",
    paraphrases: [
      "Como está seu sistema?",
      "Você está funcionando perfeitamente?",
      "Seus módulos cognitivos estão operacionais?",
      "Diagnóstico da Athena",
    ],
    expectedInteractionType: "COGNITIVE_REQUEST",
    expectedIntents: ["ATHENA_SELF_STATUS"],
    mustDo: [
      "Reportar a integridade técnica da própria Athena (Kernel, Conselho, Tools, Memória)",
      "Informar prontidão dos adaptadores locais Ollama e baseline determinístico",
    ],
    mustNotDo: [
      "Não despejar tarefas ou projetos do usuário",
      "Não confundir saúde do copilot com dados do usuário",
    ],
    shouldAskClarification: false,
    notes: "Distinção entre 'seu sistema' (Athena) e 'meu sistema' (VARYNTH).",
  },

  // -------------------------------------------------------------------------
  // 7. ATH-CONV-007: Casual Humor & Venting / Zero DB Query (GOLDEN)
  // -------------------------------------------------------------------------
  {
    id: "ATH-CONV-007",
    title: "Tratamento de Humor Casual e Desabafo sem Sobrecarga",
    category: "OVER_TOOL_USAGE",
    isGoldenCase: true,
    input: "kkkkkk você está ficando complicada",
    paraphrases: [
      "kkk que loucura",
      "rsrs tá foda em",
      "tá difícil hoje",
      "haha faz sentido",
    ],
    expectedInteractionType: "CONVERSATION",
    expectedIntents: ["SOCIAL_CONVERSATION"],
    mustDo: [
      "Responder com naturalidade, empatia e leveza",
      "Oferecer foco para destravar o próximo passo",
    ],
    mustNotDo: [
      "Não disparar consultas a banco de dados",
      "Não criar tarefas ou workflows complexos",
    ],
    forbiddenTools: ["tasks.create", "notes.create", "trash.moveWithUndo"],
    shouldAskClarification: false,
    notes: "Garante que risadas e desabafos fiquem no Fast Path conversacional.",
  },

  // -------------------------------------------------------------------------
  // 8. ATH-CONV-008: Direct Operational Command & Action Layer (GOLDEN)
  // -------------------------------------------------------------------------
  {
    id: "ATH-CONV-008",
    title: "Comando Operacional Determinístico",
    category: "OPERATIONAL_MISREAD",
    isGoldenCase: true,
    input: "Crie uma tarefa para revisar o Vault amanhã",
    paraphrases: [
      "Criar tarefa: atualizar notas da pesquisa",
      "Nova tarefa para hoje",
      "Adicione uma tarefa no projeto VARYNTH",
      "Crie uma nota rápida",
    ],
    expectedInteractionType: "OPERATIONAL_REQUEST",
    expectedIntents: ["EXECUTION_REQUEST"],
    mustDo: [
      "Encaminhar para a Action Layer e ToolManager",
      "Criar o registro com ator 'athena'",
      "Registrar no Audit Trail",
    ],
    mustNotDo: [
      "Não responder como mero diálogo social",
      "Não ignorar a criação do recurso no sistema",
    ],
    expectedTools: ["tasks.create", "notes.create"],
    shouldAskClarification: false,
    notes: "Comandos imperativos de mutação devem sempre acionar o pipeline operacional.",
  },

  // -------------------------------------------------------------------------
  // 9. ATH-CONV-009: Critique Resolution / Precedence over Brainstorm (GOLDEN)
  // -------------------------------------------------------------------------
  {
    id: "ATH-CONV-009",
    title: "Crítica Rigorosa via Critias (Precedência sobre Ideação)",
    category: "INTENT_MISCLASSIFICATION",
    isGoldenCase: true,
    context: [
      { role: "user", text: "Estou pensando no projeto Pesquisa CNJ." },
      { role: "athena", text: "Excelente frente jurídica para sistematizar teses." },
    ],
    input: "Critique essa ideia.",
    paraphrases: [
      "critique essa proposta",
      "aponte os pontos fracos desse projeto",
      "faça uma crítica rigorosa",
      "quais os riscos e pontos cegos disso?",
    ],
    expectedInteractionType: "COGNITIVE_REQUEST",
    expectedIntents: ["CRITIQUE"],
    mustDo: [
      "Apresentar pontos cegos, riscos metodológicos e medidas mitigadoras (Critias)",
      "Manter tom dialético e construtivo",
    ],
    mustNotDo: [
      "Não tratar como novo pedido de brainstorming de projetos",
      "Não responder de forma genérica",
    ],
    shouldAskClarification: false,
    notes: "Garante que 'Critique essa ideia' execute crítica (Critias) e não seja capturado por 'ideia' (Musa).",
  },

  // -------------------------------------------------------------------------
  // 10. ATH-CONV-010: Comparison Matrix between Active Entities
  // -------------------------------------------------------------------------
  {
    id: "ATH-CONV-010",
    title: "Comparação Estruturada entre Duas Iniciativas",
    category: "INCOMPLETE_RESPONSE",
    isGoldenCase: false,
    context: [
      { role: "user", text: "Estou avaliando o VARYNTH OS e a Pesquisa CNJ." },
      { role: "athena", text: "Ambas as iniciativas estão ativas nas suas workspaces." },
    ],
    input: "Compare os dois.",
    paraphrases: [
      "compare os dois projetos",
      "qual a diferença entre eles?",
      "qual vale mais a pena continuar hoje?",
    ],
    expectedInteractionType: "COGNITIVE_REQUEST",
    expectedIntents: ["COMPARE"],
    mustDo: [
      "Apresentar matriz comparativa com pontos fortes e desafios de cada um",
      "Emitir um veredito claro baseado no foco (teórico vs prático)",
    ],
    mustNotDo: [
      "Não ignorar um dos itens comparados",
      "Não dar resposta superficial sem veredito",
    ],
    shouldAskClarification: false,
    notes: "Resolução e comparação equilibrada entre duas entidades do contexto recente.",
  },

  // -------------------------------------------------------------------------
  // 11. ATH-CONV-011: Honest Understanding Policy on Low Confidence
  // -------------------------------------------------------------------------
  {
    id: "ATH-CONV-011",
    title: "Política de Honestidade em Baixa Confiança (Anti-Falso-Entendimento)",
    category: "FALSE_UNDERSTANDING",
    isGoldenCase: false,
    input: "...",
    paraphrases: [
      "xyz123?",
      "hmmm",
      "a",
    ],
    expectedInteractionType: "CONVERSATION",
    mustDo: [
      "Admitir incerteza com clareza",
      "Pedir esclarecimento específico ou direcionamento",
    ],
    mustNotDo: [
      'Nunca afirmar "Entendi perfeitamente"',
      'Não inventar respostas para entradas sem sentido',
    ],
    shouldAskClarification: true,
    notes: "Athena nunca deve fingir inteligência afirmando entender entradas ininteligíveis.",
  },

  // -------------------------------------------------------------------------
  // 12. ATH-CONV-012: Topic Shift Detection (Project to Social)
  // -------------------------------------------------------------------------
  {
    id: "ATH-CONV-012",
    title: "Detecção de Mudança Abrupta de Assunto",
    category: "TOPIC_SHIFT_DETECTION",
    isGoldenCase: false,
    context: [
      { role: "user", text: "Vamos falar da arquitetura do VARYNTH OS." },
      { role: "athena", text: "Perfeito, estamos analisando o pipeline cognitivo." },
    ],
    input: "Aliás, outra coisa: como você está?",
    paraphrases: [
      "Mudando de assunto, tudo bem por aí?",
      "Deixa isso pra depois: como você está hoje?",
    ],
    expectedInteractionType: "CONVERSATION",
    expectedIntents: ["SOCIAL_CONVERSATION"],
    mustDo: [
      "Reconhecer a mudança de assunto para conversa social",
      "Responder no plano social sem forçar continuação do projeto técnico",
    ],
    mustNotDo: [
      "Não continuar respondendo como se fosse sobre a arquitetura do VARYNTH",
    ],
    shouldAskClarification: false,
    notes: "Detecção de quebra de tópico com marcador ('Aliás, outra coisa').",
  },

  // -------------------------------------------------------------------------
  // 13. ATH-CONV-013: Epistemic Concept Inquiry (Offline Knowledge Base)
  // -------------------------------------------------------------------------
  {
    id: "ATH-CONV-013",
    title: "Consulta Epistêmica Conceitual (Latim, Hermenêutica, Jogos)",
    category: "INTENT_MISCLASSIFICATION",
    isGoldenCase: false,
    input: "O que é latim e por que ele importa no Direito?",
    paraphrases: [
      "Você sabe o que é um jogo?",
      "O que é hermenêutica jurídica?",
      "Me explica o método científico",
      "O que é epistemologia?",
    ],
    expectedInteractionType: "COGNITIVE_REQUEST",
    expectedIntents: ["EXPLAIN"],
    mustDo: [
      "Fornecer explicação conceitual estruturada com base na base epistêmica offline",
      "Conectar com dimensões práticas e teóricas",
    ],
    mustNotDo: [
      "Não responder com evasão ou silêncio",
      "Não depender de conexão com internet para conceitos fundamentais",
    ],
    shouldAskClarification: false,
    notes: "Garante que a base offline responda a dúvidas epistemológicas com profundidade.",
  },

  // -------------------------------------------------------------------------
  // 14. ATH-CONV-014: Explicit Ecosystem Briefing Request
  // -------------------------------------------------------------------------
  {
    id: "ATH-CONV-014",
    title: "Briefing Executivo Completo sob Solicitação Explícita",
    category: "INTENT_MISCLASSIFICATION",
    isGoldenCase: false,
    input: "Me dê um briefing completo do que mudou no VARYNTH OS",
    paraphrases: [
      "me dê um briefing",
      "o que aconteceu desde a última vez?",
      "resumo executivo do dia",
      "me atualize sobre minhas coisas no sistema",
    ],
    expectedInteractionType: "COGNITIVE_REQUEST",
    expectedIntents: ["ECOSYSTEM_BRIEFING"],
    mustDo: [
      "Gerar relatório executivo com Workspaces, Tarefas Prioritárias, Prazos, Vault e Sugestão de Foco",
    ],
    mustNotDo: [
      "Não responder como simples conversa social vazia",
    ],
    expectedTools: ["diagnostics.run", "projects.read", "tasks.list"],
    shouldAskClarification: false,
    notes: "Quando o usuário pede explicitamente por 'briefing', a Athena deve entregar o panorama estruturado.",
  },

  // -------------------------------------------------------------------------
  // 15. ATH-CONV-015: Deep Multi-Turn Context Continuity
  // -------------------------------------------------------------------------
  {
    id: "ATH-CONV-015",
    title: "Continuidade de Contexto Multi-Turno em Cadeia",
    category: "CONTEXT_LOSS",
    isGoldenCase: false,
    context: [
      { role: "user", text: "Estou mexendo no projeto Athena." },
      { role: "athena", text: "Acompanhando o desenvolvimento do copilot." },
      { role: "user", text: "A parte de memória ainda está com falhas." },
      { role: "athena", text: "Entendido, precisamos reforçar o MemoryManager e o ContextBuilder." },
    ],
    input: "E o que você faria agora para resolver?",
    paraphrases: [
      "qual o próximo passo?",
      "como destravar essa parte?",
    ],
    expectedInteractionType: "COGNITIVE_REQUEST",
    expectedIntents: ["RECOMMEND", "PLAN"],
    mustDo: [
      "Entender que a pergunta refere-se ao problema de memória no projeto Athena",
      "Apresentar passos práticos de resolução de engenharia",
    ],
    mustNotDo: [
      "Não perguntar de qual projeto ou módulo o usuário está falando",
    ],
    shouldAskClarification: false,
    notes: "Continuidade de 4+ turnos sem perda de referencial de tópico e subtema.",
  },
];
