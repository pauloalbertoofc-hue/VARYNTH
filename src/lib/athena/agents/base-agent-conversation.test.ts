import assert from "node:assert/strict";
import type { AthenaTask } from "../domain/task";
import type { AthenaContext } from "../domain/context";
import { athenaConversationFeedback } from "../conversation/quality-feedback";
import { converseAsSpecialist, type AthenaAgent } from "./base-agent";
import { experienceEventRepository } from "@/lib/persistence/repositories";

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
  assert.doesNotMatch(contextual.content, /Sou Logos — avalio como uma afirmação é sustentada/);
  assert.doesNotMatch(contextual.content, /Voltando ao que conversávamos/);
  assert.match(contextual.content, /Resposta revisada/);
  assert.doesNotMatch(contextual.content, /Se quiser, posso aprofundar/);
  assert.equal(contextual.metadata?.conversationReferenceResolved, true);
  assert.equal(contextual.metadata?.conversationPresentation, true);

  const naturalRepair = await converseAsSpecialist(agent, { rawPrompt: "Não foi isso; eu quis dizer o prazo", title: "Ajuste", scope: "juridico" } as AthenaTask, {
    ...context,
    recentConversation: [
      { role: "user", text: "Analise o contrato" },
      { role: "athena", text: "A resposta anterior tratou do documento inteiro." },
    ],
  } as AthenaContext);
  assert.equal(receivedPrompt, "Não foi isso; eu quis dizer o prazo", "the specialist should receive the current natural-language correction, not an old stored preference");
  assert.equal(naturalRepair.metadata?.repairedFromExplicitFeedback, true);
  assert.equal(naturalRepair.metadata?.conversationReferenceResolved, true);

  const informal = await converseAsSpecialist(agent, { rawPrompt: "Explica em poucas palavras", title: "Resumo", scope: "pesquisa" } as AthenaTask, {
    ...context,
    experienceContext: { preferences: [{ key: "verbosity", value: "concise", status: "CONFIRMED", source: "MANUAL", scope: "GLOBAL", domain: "communication" }] },
  } as unknown as AthenaContext);
  assert.match(receivedPrompt, /Preferências de apresentação.*Responda de forma concisa/);
  assert.doesNotMatch(informal.content, /Sou Logos — avalio como uma afirmação é sustentada/);
  assert.doesNotMatch(informal.content, /Se quiser, posso aprofundar/);
  assert.match(informal.content, /Resposta revisada/);
  assert.ok(informal.content.startsWith("Resposta revisada"), "The specialist should answer the current request before identity and follow-up scaffolding");

  const registerMatched = await converseAsSpecialist(agent, { rawPrompt: "Vc pode me dar uma força nisso?", scope: "pesquisa" } as AthenaTask, context);
  assert.match(receivedPrompt, /Use registro informal respeitoso/);
  assert.deepEqual(registerMatched.metadata?.presentationPreferences, { formality: "informal" }, "A clear informal register may guide this reply without being persisted as a preference");
  assert.ok(registerMatched.content.startsWith("Resposta revisada"));
  assert.doesNotMatch(registerMatched.content, /Se quiser, posso aprofundar/);
  const formalRegister = await converseAsSpecialist(agent, { rawPrompt: "Poderia, por gentileza, revisar esta análise?", scope: "pesquisa" } as AthenaTask, context);
  assert.match(receivedPrompt, /Use registro formal, claro e natural/);
  assert.deepEqual(formalRegister.metadata?.presentationPreferences, { formality: "formal" }, "A clear formal register may guide this reply without being persisted as a preference");
  assert.doesNotMatch(formalRegister.content, /Caso deseje, posso aprofundar/);

  const explicitInformal = await converseAsSpecialist(agent, { rawPrompt: "Use um registro informal, por favor.", scope: "pesquisa" } as AthenaTask, context);
  assert.deepEqual(explicitInformal.metadata?.presentationPreferences, { formality: "informal" }, "A directly requested informal register must not be outweighed by courtesy");
  const alreadyIntroduced = "Sou Logos, com base nas fontes disponíveis: resposta revisada.";
  responseBody = alreadyIntroduced;
  const noDuplicateIdentity = await converseAsSpecialist(agent, { rawPrompt: "Responda de modo direto.", scope: "pesquisa" } as AthenaTask, context);
  assert.equal((noDuplicateIdentity.content.match(/Sou Logos/g) ?? []).length, 1, "the shared layer must preserve a specialist's own first-person introduction");
  responseBody = "Resposta revisada";
  const detailedRequest = await converseAsSpecialist(agent, { rawPrompt: "Explique passo a passo, com detalhes.", scope: "pesquisa" } as AthenaTask, context);
  assert.doesNotMatch(detailedRequest.content, /Se quiser, posso aprofundar/, "a response that already fulfills an explicit depth request should not append a generic offer");

  const scopedMethodHint = {
    id: "confirmed-method", domain: "research", context: {}, situation: "revisão de evidências",
    action: "separar achados de hipóteses antes de recomendar", outcome: "a revisão ficou clara", usefulness: 1, confidence: 0.9,
    evidence: [{ eventId: "method-event", weight: "VERY_HIGH" as const, reason: "confirmado pelo usuário" }],
    scope: "AGENT" as const, scopeId: "logos", createdAt: new Date(0).toISOString(),
  };
  const specialistMethodHint = await converseAsSpecialist(agent, { rawPrompt: "Avalie a evidência", scope: "pesquisa" } as AthenaTask, {
    ...context,
    experienceContext: { preferences: [], experiences: [scopedMethodHint], instructionPrecedence: "CURRENT_INSTRUCTION_OVERRIDES_PERSONALIZATION", generatedAt: "now", truncated: false },
  } as unknown as AthenaContext);
  assert.match(specialistMethodHint.content, /Em experiências anteriores, mostrou-se útil: separar achados de hipóteses/);
  assert.equal(specialistMethodHint.metadata?.sharedExperienceHints, 1);
  const suppressedMethodHint = await converseAsSpecialist(agent, { rawPrompt: "Avalie a evidência sem usar experiências anteriores.", scope: "pesquisa" } as AthenaTask, {
    ...context,
    experienceContext: { preferences: [], experiences: [scopedMethodHint], instructionPrecedence: "CURRENT_INSTRUCTION_OVERRIDES_PERSONALIZATION", generatedAt: "now", truncated: false },
  } as unknown as AthenaContext);
  assert.doesNotMatch(suppressedMethodHint.content, /Em experiências anteriores, mostrou-se útil/);
  assert.equal(suppressedMethodHint.metadata?.sharedExperienceHints, 0);
  const unrelatedDomainHint = { ...scopedMethodHint, id: "unrelated-domain", scope: "DOMAIN" as const, scopeId: "legal", domain: "legal", action: "considerar apenas casos jurídicos" };
  const noDomainLeak = await converseAsSpecialist(agent, { rawPrompt: "Avalie a evidência", scope: "pesquisa" } as AthenaTask, {
    ...context,
    experienceContext: { preferences: [], experiences: [unrelatedDomainHint], instructionPrecedence: "CURRENT_INSTRUCTION_OVERRIDES_PERSONALIZATION", generatedAt: "now", truncated: false },
  } as unknown as AthenaContext);
  assert.doesNotMatch(noDomainLeak.content, /considerar apenas casos jurídicos/);
  assert.equal(noDomainLeak.metadata?.sharedExperienceHints, 0, "unrelated domain history must not leak into a specialist response");

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
  const traceTaskId = "decision-trace-integration-test";
  const traced = await converseAsSpecialist(agent, { id: traceTaskId, rawPrompt: "Avalie a análise", scope: "pesquisa" } as AthenaTask, {
    ...context,
    activeProject: { id: "trace-project", title: "Projeto de teste", description: "", category: "pesquisa", status: "ativo", priority: "media", tags: [], createdAt: "", updatedAt: "" },
    experienceContext: { preferences: [], experiences: [priorOutcome], instructionPrecedence: "CURRENT_INSTRUCTION_OVERRIDES_PERSONALIZATION", generatedAt: "now", truncated: false },
  } as unknown as AthenaContext);
  const trace = traced.metadata?.experienceTrace as { retrievedExperienceIds: string[]; experienceIdsReferencedInResponse: string[]; evidenceEventIdsReferencedInResponse: string[]; instructionPrecedence: string };
  assert.deepEqual(trace.retrievedExperienceIds, ["trace-experience"]);
  assert.deepEqual(trace.experienceIdsReferencedInResponse, ["trace-experience"]);
  assert.deepEqual(trace.evidenceEventIdsReferencedInResponse, ["trace-event"]);
  assert.equal(trace.instructionPrecedence, "CURRENT_INSTRUCTION_OVERRIDES_PERSONALIZATION");
  const persistedTrace = await experienceEventRepository.getById(`experience-trace:logos:${traceTaskId}`);
  assert.ok(persistedTrace, "A real specialist response with retrieved Experience must persist an inspectable trace event");
  assert.equal(persistedTrace.learningEligible, false);
  assert.equal(persistedTrace.privacyScope, "AGENT_PRIVATE");
  assert.deepEqual(persistedTrace.metadata.retrievedExperienceIds, ["trace-experience"]);
  assert.equal(JSON.stringify(persistedTrace).includes("Resposta revisada"), false, "The persisted trace must not copy conversation text");
  responseBody = "Resposta revisada";

  athenaConversationFeedback.record({ sessionId, messageId: "response-2", agentId: "logos", category: "WRONG_ACTION" });
  receivedPrompt = "";
  const stopped = await converseAsSpecialist(agent, { rawPrompt: "tente novamente", scope: "pesquisa" } as AthenaTask, { ...context, recentConversation: [{ role: "athena", messageId: "response-2", text: "A proposta estava errada." }] });
  assert.equal(receivedPrompt, "", "wrong-action feedback must stop before domain execution");
  assert.match(stopped.content, /não vou repeti-la nem executá-la/);
  assert.equal(stopped.metadata?.executedDomainWork, false);

  console.log("Specialist adapter resolves genuine follow-ups, adapts conversational presentation, applies corrections, and blocks wrong-action retries.");
})();
