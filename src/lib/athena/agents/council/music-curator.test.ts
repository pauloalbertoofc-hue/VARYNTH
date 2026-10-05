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

  const nativeDelegation = await euterpeAgent.converse(task("Crie um projeto para divulgar o álbum"), {
    recentConversation: [],
    experienceContext: { experiences: [], preferences: [] },
  } as never, async () => ({ text: "O plano está pronto para revisão." }));
  assert.equal(nativeDelegation.metadata?.conversationPresentation, true, "delegated Euterpe replies use the shared conversational boundary");
  assert.match(nativeDelegation.content, /^Sou Euterpe/);
  assert.match(nativeDelegation.content, /Consultei Athena/);
  assert.match(nativeDelegation.content, /plano está pronto/);
  assert.equal((nativeDelegation.metadata as { consultedAthena: boolean }).consultedAthena, true);
  assert.equal((nativeDelegation.metadata as { toolAccess: boolean }).toolAccess, false);

  let followUpQuery = "";
  let followUpContext: unknown;
  const contextualDelegation = await euterpeAgent.converse(task("Quais os riscos?"), {
    recentConversation: [
      { role: "user", text: "Crie um projeto para divulgar o álbum" },
      { role: "athena", text: "Uma campanha por etapas é uma opção." },
      { role: "user", text: "Quais os riscos?" },
    ],
    experienceContext: { experiences: [], preferences: [] },
  } as never, async (request, conversation = []) => {
    followUpQuery = request;
    followUpContext = conversation;
    return { text: "Porque permite validar o interesse gradualmente." };
  });
  assert.equal(followUpQuery, "Quais os riscos?", "keep the user's exact follow-up as the delegated request");
  assert.deepEqual(followUpContext, [], "the test callback defaults context only when AthenaContext carries history");
  assert.match(contextualDelegation.content, /Voltando ao que conversávamos/);
  assert.match(contextualDelegation.content, /validar o interesse gradualmente/);
  assert.equal(contextualDelegation.metadata?.conversationReferenceResolved, true);

  const contextualMusicTurn = await euterpeAgent.converse(task("E os riscos?", {
    musicConversation: [
      { sender: "user", text: "Crie um projeto para divulgar o álbum" },
      { sender: "curator", text: "Consultei Athena: uma campanha por etapas é uma opção.", consultedAthena: true },
      { sender: "user", text: "E os riscos?" },
    ],
  }), {
    experienceContext: { experiences: [], preferences: [] },
  } as never, async (request, conversation = []) => {
    followUpQuery = request;
    followUpContext = conversation;
    return { text: "Há riscos de cronograma que devem ser avaliados." };
  });
  assert.equal(followUpQuery, "Quais os riscos?");
  assert.deepEqual(followUpContext, [], "AthenaContext and Music transcripts remain isolated");
  assert.equal(contextualMusicTurn.metadata?.conversationPresentation, true, "direct Euterpe follow-ups still receive the shared presentation");
  assert.match(contextualMusicTurn.content, /Selecione uma faixa/);

  const directEuterpe = await euterpeAgent.converse(task("O que você acha?"), {
    recentConversation: [], experienceContext: { experiences: [], preferences: [] },
  } as never, async () => { throw new Error("Euterpe-owned music questions stay in her own executor"); });
  assert.equal(directEuterpe.metadata?.consultedAthena, undefined);
  assert.equal(directEuterpe.metadata?.conversationPresentation, true);
  console.log("Athena music curator registry and authority-boundary regression passed.");
})();
