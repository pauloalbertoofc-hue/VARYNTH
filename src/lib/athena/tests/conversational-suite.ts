import { processAthenaQuery } from "../engine";
import { athenaConversationManager } from "../conversation/conversation-manager";
import { Project, Task, VaultItem, ChronosEvent, ArgumentThesis, EvidenceItem, Opportunity } from "@/lib/types";

// Mock Engine Context
const mockProjects: Project[] = [
  {
    id: "proj-1",
    title: "VARYNTH OS",
    category: "pesquisa",
    status: "ativo",
    priority: "alta",
    description: "Sistema operacional cognitivo",
    deadline: "2026-09-30",
    tags: ["core", "os"],
    createdAt: "2026-08-01",
    updatedAt: "2026-08-01",
  },
  {
    id: "proj-2",
    title: "Pesquisa CNJ",
    category: "pesquisa",
    status: "ativo",
    priority: "media",
    description: "Mapeamento de precedentes",
    tags: ["direito", "cnj"],
    createdAt: "2026-08-02",
    updatedAt: "2026-08-02",
  },
];

const mockTasks: Task[] = [
  { id: "task-1", title: "Atualizar notas do projeto", priority: "alta", status: "a_fazer", projectId: "proj-1", createdAt: "2026-08-01" },
  { id: "task-2", title: "Revisar artigo", priority: "media", status: "a_fazer", projectId: "proj-2", createdAt: "2026-08-02" },
];

const mockVault: VaultItem[] = [
  {
    id: "v-1",
    title: "Teoria Pura do Direito - Kelsen",
    type: "livro",
    tags: ["direito"],
    category: "juridico",
    readingStatus: "concluido",
    createdAt: "2026-08-01",
    updatedAt: "2026-08-01",
  },
];

const mockChronos: ChronosEvent[] = [];
const mockTheses: ArgumentThesis[] = [];
const mockEvidences: EvidenceItem[] = [];
const mockOpportunities: Opportunity[] = [];

const mockContext = {
  projects: mockProjects,
  tasks: mockTasks,
  vaultItems: mockVault,
  chronosEvents: mockChronos,
  theses: mockTheses,
  evidences: mockEvidences,
  opportunities: mockOpportunities,
  addTask: (data: any) => ({ ...data, id: "task-mock", createdAt: "2026-08-29" }),
  addNote: (data: any) => ({ ...data, id: "note-mock" }),
};

export interface TestResult {
  name: string;
  passed: boolean;
  details: string;
}

export function runConversationalTestSuite(): TestResult[] {
  const results: TestResult[] = [];
  const sessionId = "test-session-" + Date.now();

  function assert(name: string, condition: boolean, details: string) {
    results.push({
      name,
      passed: condition,
      details: condition ? "PASSED" : `FAILED: ${details}`,
    });
  }

  // TEST 01 — Brainstorm & Recommend
  const t1Prompt = "Me dê ideias para hoje. Que projeto seria interessante começar?";
  const t1Resp = processAthenaQuery(t1Prompt, "geral", mockContext, undefined, sessionId);
  const t1Parsed = athenaConversationManager.processMessage(sessionId, t1Prompt, mockProjects);
  const t1NoEvasion = !t1Resp.text.includes("Como gostaria de encaminhar essa reflexão") && !t1Resp.text.includes("Estou acompanhando sua linha");
  const t1HasIdeas = t1Resp.text.includes("1.") || t1Resp.text.includes("Observatório") || t1Resp.text.includes("propostas");
  assert("TEST 01 — Brainstorm & Recommend: Propostas presentes", t1HasIdeas, "Resposta não continha propostas de projetos");
  assert("TEST 01 — Brainstorm & Recommend: Sem evasão", t1NoEvasion, "Resposta continha frase de evasão genérica");
  assert("TEST 01 — Brainstorm & Recommend: Intent classificada", t1Parsed.intents.includes("BRAINSTORM") || t1Parsed.intents.includes("RECOMMEND"), "Intenção não classificada como BRAINSTORM ou RECOMMEND");

  // TEST 02 — Social Conversation
  const t2Session = "test-social-" + Date.now();
  const t2Prompt = "Como você está?";
  const t2Resp = processAthenaQuery(t2Prompt, "geral", mockContext, undefined, t2Session);
  const t2Parsed = athenaConversationManager.processMessage(t2Session, t2Prompt, mockProjects);
  const t2NoDump = !t2Resp.text.includes("📁 **Workspaces**") && !t2Resp.text.includes("⚡ **Tarefas**");
  assert("TEST 02 — Social Conversation: Sem despejo de banco", t2NoDump, "A resposta social despejou dados de banco de dados");
  assert("TEST 02 — Social Conversation: InteractionType CONVERSATION", t2Parsed.interactionType === "CONVERSATION", "InteractionType não foi CONVERSATION");

  // TEST 03 — Ecosystem Status
  const t3Session = "test-eco-" + Date.now();
  const t3Prompt = "Como está minha situação no sistema?";
  const t3Resp = processAthenaQuery(t3Prompt, "geral", mockContext, undefined, t3Session);
  const t3Parsed = athenaConversationManager.processMessage(t3Session, t3Prompt, mockProjects);
  assert("TEST 03 — Ecosystem Status: Consulta VARYNTH", t3Resp.text.includes("projetos ativos") || t3Resp.text.includes("tarefas pendentes"), "Não consultou o estado do sistema");
  assert("TEST 03 — Ecosystem Status: Intent ECOSYSTEM_STATUS", t3Parsed.intents.includes("ECOSYSTEM_STATUS"), "Intent não foi ECOSYSTEM_STATUS");

  // TEST 04 — Context Continuation / Ellipsis ("E o segundo?")
  const t4Session = "test-ellipsis-" + Date.now();
  processAthenaQuery("Estou entre o VARYNTH OS e a Pesquisa CNJ.", "geral", mockContext, undefined, t4Session);
  const t4Resp = processAthenaQuery("E o segundo?", "geral", mockContext, undefined, t4Session);
  assert("TEST 04 — Ellipsis: Resolveu segundo projeto", t4Resp.text.length > 30 && !t4Resp.text.includes("Como gostaria"), "Não resolveu elipse do segundo projeto");

  // TEST 05 — Follow-up ("Por quê?")
  const t5Session = "test-why-" + Date.now();
  processAthenaQuery("Me dê ideias de projeto para começar hoje", "geral", mockContext, undefined, t5Session);
  const t5Resp = processAthenaQuery("Por quê?", "geral", mockContext, undefined, t5Session);
  assert("TEST 05 — Follow-up: Explicou recomendação", t5Resp.text.includes("recomendei") || t5Resp.text.includes("estratégicas") || t5Resp.text.includes("razões"), "Não explicou os fundamentos da recomendação");

  // TEST 06 — Critique
  const t6Session = "test-critique-" + Date.now();
  processAthenaQuery("Estou pensando no projeto Pesquisa CNJ", "geral", mockContext, undefined, t6Session);
  const t6Resp = processAthenaQuery("Critique essa ideia.", "geral", mockContext, undefined, t6Session);
  assert("TEST 06 — Critique: Crítica concreta", t6Resp.text.includes("criticamente") || t6Resp.text.includes("Ponto Cego") || t6Resp.text.includes("Critias"), "Não apresentou crítica concreta");

  // TEST 07 — Comparison
  const t7Session = "test-compare-" + Date.now();
  processAthenaQuery("Estou avaliando o VARYNTH OS e a Pesquisa CNJ", "geral", mockContext, undefined, t7Session);
  const t7Resp = processAthenaQuery("Compare os dois.", "geral", mockContext, undefined, t7Session);
  assert("TEST 07 — Comparison: Comparação estruturada", t7Resp.text.includes("Comparando") || t7Resp.text.includes("versus"), "Não gerou comparação estruturada");

  // TEST 08 — Unknown / Honest Understanding
  const t8Session = "test-unknown-" + Date.now();
  const t8Resp = processAthenaQuery("x", "geral", mockContext, undefined, t8Session);
  assert("TEST 08 — Unknown: Sem falso entendimento", !t8Resp.text.includes("Entendi perfeitamente"), "Afirmou falsamente entender prompt ininteligível");

  // TEST 09 — Execution Request
  const t9Session = "test-exec-" + Date.now();
  const t9Parsed = athenaConversationManager.processMessage(t9Session, "Crie uma tarefa para amanhã: Revisar teses", mockProjects);
  assert("TEST 09 — Execution: InteractionType OPERATIONAL_REQUEST", t9Parsed.interactionType === "OPERATIONAL_REQUEST", "Não identificou comando operacional");

  // TEST 10 — Casual Humor
  const t10Session = "test-humor-" + Date.now();
  const t10Resp = processAthenaQuery("kkkkkk você está ficando complicada", "geral", mockContext, undefined, t10Session);
  const t10Parsed = athenaConversationManager.processMessage(t10Session, "kkkkkk você está ficando complicada", mockProjects);
  assert("TEST 10 — Casual Humor: Fast path sem banco", t10Parsed.interactionType === "CONVERSATION", "Não direcionou humor para CONVERSATION");
  assert("TEST 10 — Casual Humor: Resposta natural", t10Resp.text.includes("Kkkk"), "Resposta não tratou humor");

  const noveltySession = "test-novelty-" + Date.now();
  processAthenaQuery("Olá Athena", "geral", mockContext, undefined, noveltySession);
  const noveltyResponse = processAthenaQuery("O que você me conta de novidade?", "geral", mockContext, undefined, noveltySession);
  assert(
    "REGRESSION — Pedido de novidade recebe resposta direta sem saudação repetida",
    noveltyResponse.text.includes("novidade específica") && !noveltyResponse.text.includes("Por aqui tudo"),
    "Athena repetiu a saudação em vez de responder sobre novidades"
  );

  // PARAPHRASED TESTS
  const paraphrases = [
    "me dê umas ideias",
    "o que poderíamos inventar?",
    "tem alguma coisa legal pra começar?",
    "quero criar alguma coisa hoje",
    "vamos pensar em algum projeto novo?",
  ];
  for (const para of paraphrases) {
    const pParsed = athenaConversationManager.processMessage("para-sess-" + Math.random(), para, mockProjects);
    assert(`PARAPHRASE — "${para}"`, pParsed.intents.includes("BRAINSTORM") || pParsed.intents.includes("RECOMMEND") || pParsed.interactionType === "COGNITIVE_REQUEST", `Paráfrase "${para}" não identificou intenção cognitiva`);
  }

  // Historical mobile failure: capability-shaped ideation must answer the request,
  // never fall through to the generic operational capabilities response.
  const imageIdeaSession = "image-idea-" + Date.now();
  const imageIdeaPrompt = "Athenas consegue me dar ideia de uma imagem?";
  const imageIdeaParsed = athenaConversationManager.processMessage(imageIdeaSession, imageIdeaPrompt, mockProjects);
  const imageIdeaResponse = processAthenaQuery(imageIdeaPrompt, "geral", mockContext, undefined, imageIdeaSession);
  assert(
    "REGRESSION — Image ideation routes to cognitive brainstorm",
    imageIdeaParsed.interactionType === "COGNITIVE_REQUEST" && imageIdeaParsed.intents.includes("BRAINSTORM"),
    "Pedido de ideia visual não foi encaminhado ao brainstorming cognitivo"
  );
  assert(
    "REGRESSION — Image ideation gives concrete visual concepts",
    imageIdeaResponse.text.includes("ideias visuais concretas") && !imageIdeaResponse.text.includes("Como seu copilot digital, posso"),
    "Pedido de ideia visual caiu no fallback genérico de capacidades"
  );

  const projectSummaryResponse = processAthenaQuery(
    "Resuma as pendências e o prazo deste projeto.",
    "geral",
    mockContext,
    "proj-1",
    "project-summary-" + Date.now()
  );
  assert(
    "REGRESSION — Resumo no workspace prioriza o projeto em contexto",
    projectSummaryResponse.text.includes("Atualizar notas do projeto") &&
      projectSummaryResponse.text.includes("2026-09-30") &&
      !projectSummaryResponse.text.startsWith("Você tem **2 projetos ativos"),
    "Athena ignorou tarefas e prazo do projeto em contexto"
  );

  // ADVERSARIAL TESTS
  const adv1 = athenaConversationManager.processMessage("adv-1", "Como você está?", mockProjects);
  const adv2 = athenaConversationManager.processMessage("adv-2", "Como está o VARYNTH?", mockProjects);
  const adv3 = athenaConversationManager.processMessage("adv-3", "Como está seu Kernel?", mockProjects);
  const adv4 = athenaConversationManager.processMessage("adv-4", "Como está aquele projeto?", mockProjects);

  assert('ADVERSARIAL — "Como você está?" = CONVERSATION', adv1.interactionType === "CONVERSATION", "Falhou distinção social");
  assert('ADVERSARIAL — "Como está o VARYNTH?" = ECOSYSTEM', adv2.intents.includes("ECOSYSTEM_STATUS"), "Falhou distinção ecossistema");
  assert('ADVERSARIAL — "Como está seu Kernel?" = ATHENA_SELF_STATUS', adv3.intents.includes("ATHENA_SELF_STATUS"), "Falhou diagnóstico Athena");
  assert('ADVERSARIAL — "Como está aquele projeto?" = PROJECT_QUERY', adv4.interactionType === "COGNITIVE_REQUEST", "Falhou consulta projeto");

  return results;
}
