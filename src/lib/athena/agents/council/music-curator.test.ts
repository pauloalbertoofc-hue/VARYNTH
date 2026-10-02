import assert from "node:assert/strict";
import type { AthenaTask } from "../../domain/task";
import { agentRegistry } from "../registry";
import { euterpeAgent } from "./music-curator";

const task = (rawPrompt: string, metadata?: Record<string, unknown>) => ({ rawPrompt, metadata } as AthenaTask);
assert.equal(agentRegistry.getAgent("euterpe"), euterpeAgent);
assert.equal(agentRegistry.getAgent("music-curator"), euterpeAgent);
assert.match(euterpeAgent.personalityPrompt, /artística, sensorial e curiosa/);
assert.match(euterpeAgent.personalityPrompt, /nunca se apresente como “curadora musical”/);
assert.equal(euterpeAgent.canHandle(task("Me ajude com esta playlist de música")), true);
assert.equal(euterpeAgent.canHandle(task("Como está o clima hoje?")), false);

void (async () => {
  const result = await euterpeAgent.execute(task("Sugestão musical?"), {} as never);
  assert.equal(result.success, true);
  assert.equal((result.metadata as { toolAccess: boolean }).toolAccess, false);
  assert.equal((result.metadata as { localFileAccess: boolean }).localFileAccess, false);
  assert.match(result.content, /selecione uma faixa/i);

  const withTrack = await euterpeAgent.execute(task("Sugestão para minha música", { musicTrack: { id: "t1", name: "Demo" } }), {} as never);
  assert.match(withTrack.content, /Demo/);
  assert.equal((withTrack.metadata as { authority: string }).authority, "advisory-only");

  const withExperience = await euterpeAgent.execute(task("Sugestão musical?"), {
    experienceContext: {
      preferences: [], experiences: [{ id: "music-method", domain: "music", context: {}, situation: "curadoria de faixa", action: "comparar o clima percebido com as tags do Music DNA", outcome: "a pessoa selecionou a abordagem", usefulness: 0.9, confidence: 0.9, evidence: [], scope: "AGENT", scopeId: "euterpe", createdAt: "2026-10-01" }],
      instructionPrecedence: "CURRENT_INSTRUCTION_OVERRIDES_PERSONALIZATION", generatedAt: "now", truncated: false,
    },
  } as never);
  assert.match(withExperience.content, /abordagem musical que pode valer testar/i);
  assert.match(withExperience.content, /comparar o clima percebido com as tags do Music DNA/i);
  assert.equal((withExperience.metadata as { toolAccess: boolean }).toolAccess, false);
  const musicalExperienceContext = {
    experienceContext: {
      preferences: [], experiences: [{ id: "music-method", domain: "music", context: {}, situation: "curadoria", action: "comparar tags e clima", outcome: "útil", usefulness: 0.9, confidence: 0.9, evidence: [], scope: "AGENT", scopeId: "euterpe", createdAt: "2026-10-01" }],
      instructionPrecedence: "CURRENT_INSTRUCTION_OVERRIDES_PERSONALIZATION", generatedAt: "now", truncated: false,
    },
  } as never;

  const visualProposal = await euterpeAgent.execute(task("Faça uma capa escura", { musicTrack: { id: "t1", name: "Demo" } }), {} as never);
  assert.match(visualProposal.content, /perfil visual.*capa escura/i);
  assert.deepEqual((visualProposal.metadata as { proposal: unknown }).proposal, { kind: "visual-profile", trackId: "t1", instruction: "capa escura" });
  assert.equal((visualProposal.metadata as { proposalOnly: boolean }).proposalOnly, true, "agent workflows may propose but never apply a visual edit");
  const visualWithExperience = await euterpeAgent.execute(task("Faça uma capa escura", { musicTrack: { id: "t1", name: "Demo" } }), musicalExperienceContext);
  assert.doesNotMatch(visualWithExperience.content, /abordagem musical que pode valer testar/i, "proposal content is not displaced by experience guidance");
  assert.deepEqual((visualWithExperience.metadata as { proposal: unknown }).proposal, { kind: "visual-profile", trackId: "t1", instruction: "capa escura" });
  const refusalWithExperience = await euterpeAgent.execute(task("Não guarde meu gosto por jazz."), musicalExperienceContext);
  assert.match(refusalWithExperience.content, /não vou propor guardar/i);
  assert.doesNotMatch(refusalWithExperience.content, /abordagem musical que pode valer testar/i);

  let calls = 0;
  const delegated = await euterpeAgent.converse(task("Crie uma tarefa para o álbum"), {} as never, async () => { calls++; return { text: "Athena respondeu." }; });
  assert.equal(calls, 1);
  assert.match(delegated.content, /Consultei Athena/);
  assert.equal(delegated.agentId, "euterpe");
  assert.equal((delegated.metadata as { toolAccess: boolean }).toolAccess, false);
  console.log("Athena music curator registry and authority-boundary regression passed.");
})();
