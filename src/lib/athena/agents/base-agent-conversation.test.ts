import assert from "node:assert/strict";
import type { AthenaTask } from "../domain/task";
import type { AthenaContext } from "../domain/context";
import { athenaConversationFeedback } from "../conversation/quality-feedback";
import { converseAsSpecialist, type AthenaAgent } from "./base-agent";

void (async () => {
  const sessionId = `specialist-repair-${Date.now()}-${Math.random()}`;
  const manifest: AthenaAgent["manifest"] = {
    id: "logos", name: "Logos", role: "Especialista em evidências", version: "1", description: "Teste", skills: [], priority: 1, enabled: true,
    persona: { identity: "Sou Logos; avalio como uma afirmação é sustentada e onde a evidência ainda é fraca.", home: "Pesquisa", voice: "analítica", approach: "separo fatos e inferências", evidenceBoundary: "uso as fontes recebidas", authorityBoundary: "sou consultiva" },
  };
  let receivedPrompt = "";
  let receivedTitle = "";
  let receivedScope = "";
  const agent: AthenaAgent = {
    manifest,
    canHandle: () => true,
    execute: async (task) => {
      receivedPrompt = task.rawPrompt;
      receivedTitle = task.title;
      receivedScope = task.scope;
      return { agentId: "logos", agentName: "Logos", role: manifest.role, success: true, content: "Resposta revisada", confidence: 0.6 };
    },
  };
  const context = { scope: "pesquisa", recentConversation: [], conversationSessionId: sessionId, experienceContext: { experiences: [], preferences: [] } } as unknown as AthenaContext;

  athenaConversationFeedback.record({ sessionId, messageId: "response-1", agentId: "logos", category: "MISUNDERSTOOD", correction: "Explique em linguagem simples e separe achado de hipótese" });
  const repaired = await converseAsSpecialist(agent, { rawPrompt: "corrija a resposta", scope: "pesquisa" } as AthenaTask, { ...context, recentConversation: [{ role: "athena", text: "A resposta ficou genérica." }] });
  assert.equal(receivedPrompt, "Explique em linguagem simples e separe achado de hipótese");
  assert.match(repaired.content, /Resposta revisada/);
  assert.equal(repaired.metadata?.repairedFromExplicitFeedback, true);

  const contextual = await converseAsSpecialist(agent, { rawPrompt: "Por quê?", title: "Por quê?", scope: "pesquisa" } as AthenaTask, {
    ...context,
    recentConversation: [
      { role: "user", text: "Avalie os estudos sobre restauração de manguezais" },
      { role: "athena", text: "Há registros preliminares, sem validação independente." },
    ],
  } as AthenaContext);
  assert.match(receivedPrompt, /Avalie os estudos sobre restauração de manguezais/);
  assert.match(receivedPrompt, /Continuação solicitada agora: Por quê\?/);
  assert.equal(receivedTitle, "Por quê?", "the original task title stays stable for telemetry");
  assert.equal(receivedScope, "pesquisa");
  assert.match(contextual.content, /^Sou Logos — avalio como uma afirmação é sustentada/);
  assert.match(contextual.content, /Voltando ao que conversávamos/);
  assert.match(contextual.content, /Resposta revisada/);
  assert.match(contextual.content, /Se quiser, posso aprofundar/);
  assert.equal(contextual.metadata?.conversationReferenceResolved, true);
  assert.equal(contextual.metadata?.conversationPresentation, true);

  const informal = await converseAsSpecialist(agent, { rawPrompt: "Explica em poucas palavras", title: "Resumo", scope: "pesquisa" } as AthenaTask, {
    ...context,
    experienceContext: { preferences: [{ key: "verbosity", value: "concise", status: "CONFIRMED", source: "MANUAL", scope: "GLOBAL", domain: "communication" }] },
  } as unknown as AthenaContext);
  assert.match(informal.content, /^Sou Logos — avalio como uma afirmação é sustentada/);
  assert.doesNotMatch(informal.content, /Se quiser, posso aprofundar/);
  assert.match(informal.content, /Resposta revisada/);

  athenaConversationFeedback.record({ sessionId, messageId: "response-2", agentId: "logos", category: "WRONG_ACTION" });
  receivedPrompt = "";
  const stopped = await converseAsSpecialist(agent, { rawPrompt: "tente novamente", scope: "pesquisa" } as AthenaTask, { ...context, recentConversation: [{ role: "athena", text: "A proposta estava errada." }] });
  assert.equal(receivedPrompt, "", "wrong-action feedback must stop before domain execution");
  assert.match(stopped.content, /não vou repeti-la nem executá-la/);
  assert.equal(stopped.metadata?.executedDomainWork, false);

  console.log("Specialist adapter resolves genuine follow-ups, adapts conversational presentation, applies corrections, and blocks wrong-action retries.");
})();
