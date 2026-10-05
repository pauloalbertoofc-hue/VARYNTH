import assert from "node:assert/strict";
import { processAthenaQuery, processAthenaQueryAsync } from "../engine";
import { athenaConversationManager } from "../conversation/conversation-manager";
import { athenaCapabilitySelector } from "../kernel/capability-selector";
import { athenaPerceptionEngine } from "../kernel/perception";
import { athenaContextBuilder } from "../memory/context-builder";
import { agentRegistry } from "../agents/registry";
import { athenaGeneralistAgent } from "../agents/council/athena-generalist";
import { archivistAgent } from "../agents/council/archivist";
import { athenaPersonaEngine } from "../persona/persona-engine";

const ctx: any = {
  projects: [
    { id: "p1", title: "VARYNTH OS", status: "ativo", category: "software", deadline: "2026-12-31", updatedAt: "2026-09-06" },
    { id: "p2", title: "Pesquisa CNJ", status: "ativo", category: "pesquisa", deadline: "2026-10-10", updatedAt: "2026-09-06" },
  ],
  tasks: [{ id: "t1", title: "Revisar arquitetura", projectId: "p1", status: "pendente", priority: "alta" }],
  vaultItems: [], chronosEvents: [], theses: [], evidences: [], opportunities: [], notes: [],
  addTask: () => ({}), addNote: () => ({}),
};

const forbiddenGeneric = [
  "conectada ao seu ecossistema",
  "como seu copilot digital, posso",
  "como deseja que eu te ajude agora",
];

async function ask(prompt: string, sessionId: string, allowSocialGreeting = false) {
  const response = await processAthenaQueryAsync(prompt, "geral", ctx, undefined, sessionId);
  if (!allowSocialGreeting) {
    for (const marker of forbiddenGeneric) {
      assert.ok(!response.text.toLowerCase().includes(marker), `Resposta genérica para “${prompt}”: ${response.text}`);
    }
  }
  return response.text;
}

async function run() {
  const ideation = await ask("Quero uma ideia de capa escura para um livro sobre memória", "outcome-ideation");
  assert.match(ideation, /visual|capa|conceito|ideia/i);

  const unknown = await ask("quero aquele negócio lá", "outcome-unknown");
  assert.match(unknown, /não consegui|qual resultado|pista|referindo|qual é o nome|referência/i);

  const repairSession = `outcome-clarification-repair-${Date.now()}`;
  const firstClarification = await processAthenaQueryAsync("quero aquele negócio lá", "geral", ctx, undefined, repairSession);
  assert.match(firstClarification.text, /nome do item ou projeto/i);
  assert.deepEqual(athenaConversationManager.getRecentTurns(repairSession, 2).map((turn) => turn.role), ["user", "athena"], "the clarification question must be saved in the same conversation session");
  const clarificationReply = await processAthenaQueryAsync("VARYNTH OS", "geral", ctx, undefined, repairSession);
  assert.doesNotMatch(clarificationReply.text, /não tenho um item anterior confiável/i, "the explicit answer to the clarification must resolve the dangling reference");
  assert.match(clarificationReply.text, /Entendi: você está falando de \*\*VARYNTH OS\*\*/i);
  assert.match(clarificationReply.text, /o que você gostaria de saber ou fazer/i);
  assert.deepEqual(athenaConversationManager.getRecentTurns(repairSession, 4).map((turn) => turn.role), ["user", "athena", "user", "athena"]);

  const incomplete = await ask("isso dá ruim em", "outcome-incomplete");
  assert.match(incomplete, /incompleta|terminar a frase/i);

  const save = await ask("salva esse livro no Vault", "outcome-vault");
  assert.match(save, /envie|selecione|qual.*livro|arquivo/i);

  const compareSession = "outcome-context";
  athenaConversationManager.clearSession(compareSession);
  await ask("Estou comparando VARYNTH OS e Pesquisa CNJ", compareSession);
  const comparison = await ask("compare os dois", compareSession);
  assert.match(comparison, /comparando|versus|por outro lado|enquanto/i);

  const correction = await ask("não, eu quis dizer Pesquisa CNJ", compareSession);
  assert.ok(correction.length > 20);
  const state = athenaConversationManager.getOrCreateSession(compareSession);
  assert.ok(state.correctionCount >= 1, "Correção do usuário não foi registrada no estado conversacional");

  const status = await ask("quantas tarefas pendentes eu tenho?", "outcome-facts");
  assert.match(status, /1 tarefa|1 tarefas/i);

  const recommendationSession = `outcome-grounded-recommendation-${Date.now()}`;
  const recommendation = processAthenaQuery("Me dê ideias de projeto para começar hoje", "geral", ctx, undefined, recommendationSession);
  assert.doesNotMatch(recommendation.text, /seus fichamentos|seu acervo do Vault|sem sobrecarregar suas outras demandas/i, "General brainstorming must not claim account-specific context that was not supplied");
  const recommendationWhy = processAthenaQuery("Por quê?", "geral", ctx, undefined, recommendationSession);
  assert.doesNotMatch(recommendationWhy.text, /aproveita diretamente os fichamentos|viabilidade no cronograma|sem sobrecarregar suas outras demandas/i, "A follow-up must not invent evidence or schedule rationale absent from the previous response and live context");
  assert.match(recommendationWhy.text, /combina direito e inovação/i, "A follow-up may restate the general criterion actually recorded in the preceding response");
  assert.match(recommendationWhy.text, /não apresentei|não registrei|critério/i, "When the earlier suggestion contains no grounded rationale, Athena should say so and ask for a decision criterion");
  const unsupportedWhy = athenaPersonaEngine.generateFollowUpExplanation("Projeto Sensor Cívico", "A resposta anterior não continha esse nome nem um critério de escolha.");
  assert.match(unsupportedWhy, /não encontrei essa recomendação/i, "Stale recommendation state must not override the immediately preceding answer");
  const noRationaleWhy = athenaPersonaEngine.generateFollowUpExplanation("Projeto Sensor Cívico", "Mencionei Projeto Sensor Cívico como uma possibilidade.");
  assert.match(noRationaleWhy, /não registrei um critério/i, "Athena must ask for criteria instead of inventing reasons when a recommendation had no stated basis");

  const greeting = await ask("oi Athena, tudo bem?", "outcome-social", true);
  assert.match(greeting, /olá|oi|ótimo|bem/i);
  assert.doesNotMatch(greeting, /conectada ao seu ecossistema|acompanhando a evolução|tudo rodando|conectada ao sistema/i, "A social greeting must not imply background monitoring or unverified system health");
  const checkIn = await ask("Como você está?", "outcome-check-in", true);
  assert.match(checkIn, /pronta para conversar/i);
  assert.doesNotMatch(checkIn, /estava aqui acompanhando|tudo rodando estável|conectada ao sistema/i, "A check-in must not claim Athena monitored a project or verified runtime health");

  const personaInput = {
    interactionType: "COGNITIVE_REQUEST",
    intents: ["EXPLAIN"],
    confidence: "HIGH",
    requiresContext: false,
    requiresAction: false,
    resolvedEntities: {},
    isAmbiguous: false,
  } as any;
  const unknownConcept = athenaPersonaEngine.generateDialogueResponse("O que é um zintrônio?", personaInput).text;
  assert.match(unknownConcept, /não encontrei.*base conceitual local/i);
  assert.doesNotMatch(unknownConcept, /conceito fundamental|conectamos com teses no Codex|fontes no Vault/i, "An unknown concept must not receive a fabricated generic definition or imply indexed sources");

  const genericQuestion = athenaPersonaEngine.generateDialogueResponse("A ideia de zintrônio pode mudar a educação?", { ...personaInput, intents: ["REFLECT"] }).text;
  assert.match(genericQuestion, /explicação, uma comparação, uma revisão crítica ou um plano/i);
  assert.doesNotMatch(genericQuestion, /acervo do Vault|hipótese no Labs|fichamentos existentes/i, "A generic fallback must not invent available resources or promise integrations");
  const projectQuestion = athenaPersonaEngine.generateDialogueResponse("A ideia de zintrônio", { ...personaInput, intents: ["REFLECT"] }, "Projeto Aurora", ctx).text;
  assert.match(projectQuestion, /não traz elementos para afirmar como se conectam/i);
  assert.doesNotMatch(projectQuestion, /fichamentos existentes no Vault|Chronos/i, "An active project title alone does not prove Vault content or schedule relevance");

  const boundedTurns = athenaConversationManager.getRecentTurns(compareSession, 2);
  assert.equal(boundedTurns.length, 2, "Recent-turn access must be bounded and return a copy");
  boundedTurns.pop();
  assert.equal(athenaConversationManager.getRecentTurns(compareSession, 2).length, 2, "Mutating a read result must not mutate session history");

  const generalTask = athenaPerceptionEngine.perceive("gostaria de uma ideia", "geral");
  const generalContext = athenaContextBuilder.buildContext(generalTask, "geral", ctx);
  const unknownTask = { ...generalTask, rawPrompt: "assunto sem área reconhecida", type: "GENERAL_DELIBERATION" as const };
  const noExpert = athenaCapabilitySelector.select({ kind: "AGENT", task: unknownTask, context: generalContext });
  assert.equal(noExpert.status, "NO_MATCH", "Unmatched requests must not invent Sophia/Critias delegation");
  assert.equal(agentRegistry.findCompetentAgents(unknownTask, generalContext).length, 0);

  const general = await athenaGeneralistAgent.execute({ ...unknownTask, rawPrompt: "explique uma dúvida geral", title: "dúvida geral" }, generalContext);
  assert.equal(general.success, false, "Generalist must not report a canned, unperformed analysis as success");
  assert.equal(general.metadata?.generatedAnalysis, false);

  const archive = await archivistAgent.execute({ ...generalTask, rawPrompt: "arquitetura" }, generalContext);
  assert.match(archive.content, new RegExp(`${agentRegistry.listAgents().length} agentes`), "Archive inventory must be measured at runtime");
  assert.doesNotMatch(archive.content, /100% versionada|Next\.js 16|baseline determinístico de 0 ms/i, "Archive must not assert unsupported synchronization or fixed architecture claims");
  assert.match(archive.content, /não prova.*sincronizado externamente/i, "Archive must state the limits of its local catalog audit");

  const parsed = athenaConversationManager.processMessage("outcome-state", "quero aquele negócio lá", ctx.projects);
  assert.ok(["UNKNOWN", "AMBIGUOUS", "MISSING_INFORMATION"].includes(parsed.comprehensionStatus || ""));
  assert.ok((parsed.missingInformation || []).length > 0);

  const delegatedContextResponse = "Consultei Athena. O pedido anterior era criar uma tarefa para divulgar o álbum Noite.";
  const delegatedFollowUp = athenaConversationManager.processMessage(
    "outcome-music-context",
    "Por quê?",
    ctx.projects,
    undefined,
    [
      { role: "user", text: "Crie uma tarefa para divulgar o álbum Noite." },
      { role: "athena", text: delegatedContextResponse },
    ],
  );
  assert.equal(delegatedFollowUp.ellipsisResolved?.isEllipsis, true);
  assert.equal(delegatedFollowUp.ellipsisResolved?.previousAssistantText, delegatedContextResponse, "Athena can resolve a short follow-up against the bounded Euterpe transcript");
  assert.deepEqual(athenaConversationManager.getRecentTurns("outcome-music-context").map((turn) => turn.role), ["user", "athena", "user"], "Imported context is account-session-local and bounded in the standard history format");

  console.log("✓ Conversation outcomes: understanding, context, clarification, grounding and anti-generic gate");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
