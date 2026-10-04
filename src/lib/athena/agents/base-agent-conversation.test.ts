import assert from "node:assert/strict";
import type { AthenaTask } from "../domain/task";
import type { AthenaContext } from "../domain/context";
import { athenaConversationFeedback } from "../conversation/quality-feedback";
import { converseAsSpecialist, type AthenaAgent } from "./base-agent";

void (async () => {
  const sessionId = `specialist-repair-${Date.now()}-${Math.random()}`;
  const manifest: AthenaAgent["manifest"] = {
    id: "logos", name: "Logos", role: "Especialista em evidências", version: "1", description: "Teste", skills: [], priority: 1, enabled: true,
    persona: { identity: "Sou Logos", home: "Pesquisa", voice: "analítica", approach: "separo fatos e inferências", evidenceBoundary: "uso as fontes recebidas", authorityBoundary: "sou consultiva" },
  };
  let receivedPrompt = "";
  const agent: AthenaAgent = {
    manifest,
    canHandle: () => true,
    execute: async (task) => {
      receivedPrompt = task.rawPrompt;
      return { agentId: "logos", agentName: "Logos", role: manifest.role, success: true, content: "Resposta revisada", confidence: 0.6 };
    },
  };
  const context = { scope: "pesquisa", recentConversation: [], conversationSessionId: sessionId } as unknown as AthenaContext;

  athenaConversationFeedback.record({ sessionId, messageId: "response-1", agentId: "logos", category: "MISUNDERSTOOD", correction: "Explique em linguagem simples e separe achado de hipótese" });
  const repaired = await converseAsSpecialist(agent, { rawPrompt: "corrija a resposta" } as AthenaTask, context);
  assert.equal(receivedPrompt, "Explique em linguagem simples e separe achado de hipótese");
  assert.equal(repaired.content, "Resposta revisada");
  assert.equal(repaired.metadata?.repairedFromExplicitFeedback, true);

  athenaConversationFeedback.record({ sessionId, messageId: "response-2", agentId: "logos", category: "WRONG_ACTION" });
  receivedPrompt = "";
  const stopped = await converseAsSpecialist(agent, { rawPrompt: "tente novamente" } as AthenaTask, context);
  assert.equal(receivedPrompt, "", "wrong-action feedback must stop before domain execution");
  assert.match(stopped.content, /não vou repeti-la nem executá-la/);
  assert.equal(stopped.metadata?.executedDomainWork, false);

  console.log("Specialist conversation adapter applies explicit correction and blocks blind wrong-action retries.");
})();
