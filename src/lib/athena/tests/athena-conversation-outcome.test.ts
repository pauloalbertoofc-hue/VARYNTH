import assert from "node:assert/strict";
import { processAthenaQueryAsync } from "../engine";
import { athenaConversationManager } from "../conversation/conversation-manager";

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

  const incomplete = await ask("isso dá ruim em", "outcome-incomplete");
  assert.match(incomplete, /incompleta|terminar a frase/i);

  const save = await ask("salva esse livro no Vault", "outcome-vault");
  assert.match(save, /envie|selecione|qual.*livro|arquivo/i);

  const compareSession = "outcome-context";
  await ask("Estou comparando VARYNTH OS e Pesquisa CNJ", compareSession);
  const comparison = await ask("compare os dois", compareSession);
  assert.match(comparison, /comparando|versus|por outro lado|enquanto/i);

  const correction = await ask("não, eu quis dizer Pesquisa CNJ", compareSession);
  assert.ok(correction.length > 20);
  const state = athenaConversationManager.getOrCreateSession(compareSession);
  assert.ok(state.correctionCount >= 1, "Correção do usuário não foi registrada no estado conversacional");

  const status = await ask("quantas tarefas pendentes eu tenho?", "outcome-facts");
  assert.match(status, /1 tarefa|1 tarefas/i);

  const greeting = await ask("oi Athena, tudo bem?", "outcome-social", true);
  assert.match(greeting, /olá|oi|ótimo|bem/i);

  const parsed = athenaConversationManager.processMessage("outcome-state", "quero aquele negócio lá", ctx.projects);
  assert.ok(["UNKNOWN", "AMBIGUOUS", "MISSING_INFORMATION"].includes(parsed.comprehensionStatus || ""));
  assert.ok((parsed.missingInformation || []).length > 0);

  console.log("✓ Conversation outcomes: understanding, context, clarification, grounding and anti-generic gate");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
