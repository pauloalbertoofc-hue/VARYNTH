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
  let responseBody = "Resposta revisada";
  const agent: AthenaAgent = {
    manifest,
    canHandle: () => true,
    execute: async (task) => {
      receivedPrompt = task.rawPrompt;
      receivedTitle = task.title;
      receivedScope = task.scope;
      return { agentId: "logos", agentName: "Logos", role: manifest.role, success: true, content: responseBody, confidence: 0.6 };
    },
  };
  const context = { scope: "pesquisa", recentConversation: [], conversationSessionId: sessionId, experienceContext: { experiences: [], preferences: [] } } as unknown as AthenaContext;

  athenaConversationFeedback.record({ sessionId, messageId: "response-1", agentId: "logos", category: "MISUNDERSTOOD", correction: "Explique em linguagem simples e separe achado de hipótese" });
  const repaired = await converseAsSpecialist(agent, { rawPrompt: "corrija a resposta", scope: "pesquisa" } as AthenaTask, { ...context, recentConversation: [{ role: "athena", messageId: "response-1", text: "A resposta ficou genérica." }] });
  assert.equal(receivedPrompt, "Explique em linguagem simples e separe achado de hipótese");
  assert.match(repaired.content, /Resposta revisada/);
  assert.equal(repaired.metadata?.repairedFromExplicitFeedback, true);

  athenaConversationFeedback.record({ sessionId, messageId: "response-old", agentId: "logos", category: "MISUNDERSTOOD", correction: "Correção antiga que não deve ser reutilizada" });
  receivedPrompt = "";
  const staleFeedback = await converseAsSpecialist(agent, { rawPrompt: "tente novamente", scope: "pesquisa" } as AthenaTask, {
    ...context,
    recentConversation: [
      { role: "athena", messageId: "response-old", text: "A resposta genérica inicial." },
      { role: "user", text: "Agora, uma nova pergunta" },
      { role: "athena", messageId: "response-2", text: "Resposta mais recente, sem avaliação" },
    ],
  });
  assert.equal(receivedPrompt, "", "feedback on an older response must not trigger domain execution for the latest one");
  assert.match(staleFeedback.content, /Qual parte da resposta anterior devo ajustar/);
  assert.equal(staleFeedback.metadata?.executedDomainWork, false);

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
  assert.ok(contextual.content.startsWith("Resposta revisada"), "Follow-up answers should lead with the specialist's answer");
  assert.match(contextual.content, /Sou Logos — avalio como uma afirmação é sustentada/);
  assert.match(contextual.content, /Voltando ao que conversávamos/);
  assert.match(contextual.content, /Resposta revisada/);
  assert.match(contextual.content, /Se quiser, posso aprofundar/);
  assert.equal(contextual.metadata?.conversationReferenceResolved, true);
  assert.equal(contextual.metadata?.conversationPresentation, true);

  const informal = await converseAsSpecialist(agent, { rawPrompt: "Explica em poucas palavras", title: "Resumo", scope: "pesquisa" } as AthenaTask, {
    ...context,
    experienceContext: { preferences: [{ key: "verbosity", value: "concise", status: "CONFIRMED", source: "MANUAL", scope: "GLOBAL", domain: "communication" }] },
  } as unknown as AthenaContext);
  assert.match(informal.content, /Sou Logos — avalio como uma afirmação é sustentada/);
  assert.doesNotMatch(informal.content, /Se quiser, posso aprofundar/);
  assert.match(informal.content, /Resposta revisada/);
  assert.ok(informal.content.startsWith("Resposta revisada"), "The specialist should answer the current request before identity and follow-up scaffolding");

  const registerMatched = await converseAsSpecialist(agent, { rawPrompt: "Vc pode me dar uma força nisso?", scope: "pesquisa" } as AthenaTask, context);
  assert.deepEqual(registerMatched.metadata?.presentationPreferences, { formality: "informal" }, "A clear informal register may guide this reply without being persisted as a preference");
  assert.ok(registerMatched.content.startsWith("Resposta revisada"));
  assert.match(registerMatched.content, /Se quiser, posso aprofundar/);
  const formalRegister = await converseAsSpecialist(agent, { rawPrompt: "Poderia, por gentileza, revisar esta análise?", scope: "pesquisa" } as AthenaTask, context);
  assert.deepEqual(formalRegister.metadata?.presentationPreferences, { formality: "formal" }, "A clear formal register may guide this reply without being persisted as a preference");
  assert.match(formalRegister.content, /Caso deseje, posso aprofundar/);

  responseBody = "🔬 **Análise Metodológica & Científica (Logos):**\n\nOs estudos recebidos ainda não permitem uma conclusão firme.";
  const athenaOwned = await converseAsSpecialist(agent, { rawPrompt: "Avalie esta evidência", scope: "pesquisa" } as AthenaTask, {
    ...context,
    responseAudience: "ATHENA",
  } as AthenaContext);
  assert.match(athenaOwned.content, /^🔬 \*\*Análise Metodológica & Científica:\*\*/);
  assert.doesNotMatch(athenaOwned.content.split("\n")[0], /Logos|Sou /, "Delegated findings should not appear to the user as another chatbot");
  assert.match(athenaOwned.content, /Os estudos recebidos ainda não permitem uma conclusão firme/);
  assert.equal(athenaOwned.metadata?.conversationAudience, "ATHENA");
  responseBody = "Resposta revisada";

  const priorOutcome = {
    id: "trace-experience", domain: "research", context: {}, situation: "Uma síntese misturava camadas",
    action: "separar premissas e evidências", outcome: "a revisão ficou auditável", usefulness: 1, confidence: 0.5,
    evidence: [{ eventId: "trace-event", weight: "VERY_HIGH" as const, reason: "revisão manual" }],
    scope: "PROJECT" as const, scopeId: "trace-project", createdAt: new Date(0).toISOString(),
  };
  responseBody = "Resposta revisada: separar premissas e evidências antes da conclusão.";
  const traced = await converseAsSpecialist(agent, { rawPrompt: "Avalie a análise", scope: "pesquisa" } as AthenaTask, {
    ...context,
    activeProject: { id: "trace-project", title: "Projeto de teste", description: "", category: "pesquisa", status: "ativo", priority: "media", tags: [], createdAt: "", updatedAt: "" },
    experienceContext: { preferences: [], experiences: [priorOutcome], instructionPrecedence: "CURRENT_INSTRUCTION_OVERRIDES_PERSONALIZATION", generatedAt: "now", truncated: false },
  } as unknown as AthenaContext);
  const trace = traced.metadata?.experienceTrace as { retrievedExperienceIds: string[]; experienceIdsReferencedInResponse: string[]; evidenceEventIdsReferencedInResponse: string[]; instructionPrecedence: string };
  assert.deepEqual(trace.retrievedExperienceIds, ["trace-experience"]);
  assert.deepEqual(trace.experienceIdsReferencedInResponse, ["trace-experience"]);
  assert.deepEqual(trace.evidenceEventIdsReferencedInResponse, ["trace-event"]);
  assert.equal(trace.instructionPrecedence, "CURRENT_INSTRUCTION_OVERRIDES_PERSONALIZATION");
  responseBody = "Resposta revisada";

  athenaConversationFeedback.record({ sessionId, messageId: "response-2", agentId: "logos", category: "WRONG_ACTION" });
  receivedPrompt = "";
  const stopped = await converseAsSpecialist(agent, { rawPrompt: "tente novamente", scope: "pesquisa" } as AthenaTask, { ...context, recentConversation: [{ role: "athena", messageId: "response-2", text: "A proposta estava errada." }] });
  assert.equal(receivedPrompt, "", "wrong-action feedback must stop before domain execution");
  assert.match(stopped.content, /não vou repeti-la nem executá-la/);
  assert.equal(stopped.metadata?.executedDomainWork, false);

  console.log("Specialist adapter resolves genuine follow-ups, adapts conversational presentation, applies corrections, and blocks wrong-action retries.");
})();
