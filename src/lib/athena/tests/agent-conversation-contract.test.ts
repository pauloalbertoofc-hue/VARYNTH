import assert from "node:assert/strict";
import { renderAgentPersona, SHARED_AGENT_RESPONSE_CONTRACT } from "../agents/base-agent";
import { curadorPesquisaAgent } from "../agents/council/curador-pesquisa";
import { justitiaAgent } from "../agents/council/justitia";
import { critiasAgent } from "../agents/council/critias";
import { logosAgent } from "../agents/council/logos";
import { agentRegistry } from "../agents/registry";
import type { AthenaContext } from "../domain/context";
import type { AthenaTask } from "../domain/task";

const task: AthenaTask = {
  id: "conversation-contract-test",
  title: "Pesquisar validade de uma tese",
  rawPrompt: "Pesquise evidências e analise a tese",
  type: "RESEARCH_SYNTHESIS",
  priority: "media",
  status: "CREATED",
  scope: "pesquisa",
  entities: {},
  createdAt: "2026-10-11T00:00:00.000Z",
  updatedAt: "2026-10-11T00:00:00.000Z",
};

const context: AthenaContext = {
  scope: "pesquisa",
  relevantProjects: [],
  relevantTasks: [],
  relevantVaultItems: [],
  relevantChronosEvents: [],
  relevantTheses: [],
  relevantEvidences: [],
  relevantOpportunities: [],
  systemTime: "2026-10-11T00:00:00.000Z",
};

async function run() {
  const persona = renderAgentPersona(curadorPesquisaAgent);
  assert.ok(persona.includes(SHARED_AGENT_RESPONSE_CONTRACT));
  assert.ok(persona.includes("Na curadoria"));
  assert.ok(renderAgentPersona(justitiaAgent).includes("jurisdição"));
  assert.ok(agentRegistry.listAgents().every((agent) => Boolean(agent.responseMethod)), "Every enabled specialist must define a domain-specific response method");

  const noEvidence = await curadorPesquisaAgent.execute(task, context);
  assert.match(noEvidence.content, /não fiz busca externa/i);
  assert.equal(noEvidence.metadata?.externalSearchPerformed, false);
  assert.ok((noEvidence.confidence ?? 1) < 0.5);

  const legalTask = { ...task, rawPrompt: "Analise esta questão de direito" };
  const noLegalBasis = await justitiaAgent.execute(legalTask, context);
  assert.match(noLegalBasis.content, /análise jurídica preliminar/i);
  assert.match(noLegalBasis.content, /não há base para afirmar/i);
  assert.equal(noLegalBasis.metadata?.currentLawVerified, false);
  assert.ok((noLegalBasis.confidence ?? 1) < 0.5);

  const noReview = await critiasAgent.execute({ ...task, rawPrompt: "Critique a proposta" }, context);
  assert.match(noReview.content, /não recebi aqui o texto/i);
  assert.equal(noReview.metadata?.substantiveReviewPerformed, false);
  const shallowReview = await critiasAgent.review({ agentId: "sample", agentName: "sample", role: "sample", success: true, content: "Uma resposta suficientemente longa, mas sem validação factual.", confidence: 0.9 }, context);
  assert.match(shallowReview.criticism?.[0] ?? "", /não foram avaliadas/i);

  const strategyTask = { ...task, rawPrompt: "O que priorizo?", type: "PRODUCTIVITY_OPTIMIZATION" as const };
  const strategyContext = { ...context, scope: "produtividade" as const };
  const strategy = await (await import("../agents/council/strategos")).strategosAgent.execute(strategyTask, strategyContext);
  assert.doesNotMatch(strategy.content, /Fluxo de execução estabilizado/i);

  const logosResult = await logosAgent.execute(task, context);
  assert.ok((logosResult.confidence ?? 1) < 0.5);

  console.log("PASS agent conversational contract: shared grounding, specialty methods, and empty-evidence calibration");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
