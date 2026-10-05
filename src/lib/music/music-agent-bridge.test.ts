import assert from "node:assert/strict";
import { musicAgentShouldConsultAthena, prepareEuterpeExperienceContext, resolveEuterpeCorrectionRequest, runMusicAgentTurn } from "./music-agent-bridge";
import { experienceEventRepository, experiencePreferenceRepository, experienceRepository } from "@/lib/persistence/repositories";
import { preferenceService } from "@/lib/experience/preference-service";
import { experienceService } from "@/lib/experience/experience-service";
import { retainExperience } from "@/lib/experience/outcome-service";

assert.deepEqual(resolveEuterpeCorrectionRequest("Faça uma playlist"), { kind: "continue", prompt: "Faça uma playlist" });
assert.equal(resolveEuterpeCorrectionRequest("corrija a resposta").kind, "clarify", "A retry without Euterpe-scoped feedback must not invent the previous correction");
assert.deepEqual(resolveEuterpeCorrectionRequest("não foi isso", { category: "GENERIC_RESPONSE", correction: "Explique com exemplos para iniciantes" }), { kind: "continue", prompt: "Explique com exemplos para iniciantes" });
const wrongActionRetry = resolveEuterpeCorrectionRequest("tente novamente", { category: "WRONG_ACTION" });
assert.equal(wrongActionRetry.kind, "clarify");
if (wrongActionRetry.kind === "clarify") assert.match(wrongActionRetry.response, /não vou repeti-la automaticamente/);
const contextRetry = resolveEuterpeCorrectionRequest("corrija", { category: "LOST_CONTEXT" });
assert.equal(contextRetry.kind, "clarify");
if (contextRetry.kind === "clarify") assert.match(contextRetry.response, /Qual faixa/);

assert.equal(musicAgentShouldConsultAthena("Oi!"), false);
assert.equal(musicAgentShouldConsultAthena("O que é Music DNA?"), false);
assert.equal(musicAgentShouldConsultAthena("Crie uma playlist calma"), false);
assert.equal(musicAgentShouldConsultAthena("Faça um tema visual escuro"), false);
assert.equal(musicAgentShouldConsultAthena("Crie um projeto para divulgar o álbum"), true);
assert.equal(musicAgentShouldConsultAthena("Dá pra montar um projeto pra divulgar essa playlist?"), true, "An explicitly requested platform project must be delegated even when it mentions music");
assert.equal(musicAgentShouldConsultAthena("O que significa gravidade?"), true, "Colloquial epistemic questions outside music belong to Athena");
assert.equal(musicAgentShouldConsultAthena("Como está o clima hoje?"), true);
assert.equal(musicAgentShouldConsultAthena("Quero um visualizador mais calmo para essa faixa"), false, "Music-domain visual requests stay with Euterpe");
assert.equal(musicAgentShouldConsultAthena("O que você acha?"), false, "A conversational question in Euterpe's music space stays with her");
assert.equal(musicAgentShouldConsultAthena("Por quê?"), false, "A short contextual follow-up remains with Euterpe");
assert.equal(musicAgentShouldConsultAthena("Não consulte a Athena; só me explica as tags do Music DNA"), false, "A direct refusal to delegate must be respected");
assert.equal(musicAgentShouldConsultAthena("oi, tudo bem?"), false);
assert.equal(musicAgentShouldConsultAthena("Pergunte à Athena sobre meu projeto"), true);
const delegatedConversation = [
  { sender: "user" as const, text: "Crie uma tarefa para divulgar o álbum" },
  { sender: "curator" as const, text: "Consultei Athena: a proposta foi revisar o plano.", consultedAthena: true },
  { sender: "user" as const, text: "Por quê?" },
];
assert.equal(musicAgentShouldConsultAthena("Por quê?", delegatedConversation), true, "A follow-up to Athena's answer should return to Athena");
assert.equal(musicAgentShouldConsultAthena("Por quê?", [{ sender: "curator", text: "A tag escura veio do Music DNA." }]), false, "A follow-up to Euterpe's own answer stays with Euterpe");

void (async () => {
  let consultCount = 0;
  await Promise.all([experienceEventRepository.clear(), experiencePreferenceRepository.clear(), experienceRepository.clear()]);
  await preferenceService.declare({ domain: "music", key: "formality", value: "formal", scope: "AGENT", scopeId: "euterpe" }, "local-owner");
  const trackEvent = await experienceService.record({ ownerId: "local-owner", actor: "USER", actionType: "OUTCOME_RECORDED", moduleId: "music", domain: "music", artifactId: "track-1", metadata: {}, source: "music-test", privacyScope: "USER_SHARED", learningEligible: true });
  await retainExperience({ ownerId: "local-owner", domain: "music", context: {}, situation: "revisão de uma faixa", action: "comparar tags sem inferir gênero", outcome: "a comparação ajudou a escolher um perfil", evidence: [{ eventId: trackEvent.id, weight: "HIGH", reason: "resultado revisado" }], scope: "ARTIFACT", scopeId: "track-1", usefulness: 0.8 });
  const preparedExperience = await prepareEuterpeExperienceContext({ trackId: "track-1", currentInstruction: "O que acha dessa faixa?" });
  assert.equal(preparedExperience?.preferences.length, 1, "direct Music context retrieves the confirmed preference for Euterpe");
  assert.equal(preparedExperience?.experiences[0]?.scopeId, "track-1", "artifact-scoped precedent is retrieved for the selected track");
  assert.match(preparedExperience?.experiences[0]?.action || "", /comparar tags sem inferir gênero/);
  const otherTrackExperience = await prepareEuterpeExperienceContext({ trackId: "track-2" });
  assert.equal(otherTrackExperience?.experiences.length, 0, "track-scoped precedent is isolated from other tracks");
  const direct = await runMusicAgentTurn({ message: "Oi!", consultAthena: async () => { consultCount++; return { text: "não esperado" }; } });
  assert.equal(direct.agent, "euterpe");
  assert.equal(direct.consultedAthena, false);
  assert.match(direct.text, /Euterpe/);
  assert.equal(consultCount, 0);
  const greetingWithExperience = await runMusicAgentTurn({ message: "Oi!", experienceContext: await prepareEuterpeExperienceContext({ trackId: "track-1" }), consultAthena: async () => { throw new Error("A saudação não deve ser delegada"); } });
  assert.doesNotMatch(greetingWithExperience.text, /abordagem musical que pode valer testar/i, "historical experience should not turn a greeting into unsolicited advice");

  const personalized = await runMusicAgentTurn({ message: "O que acha dessa faixa?", experienceContext: preparedExperience, consultAthena: async () => { throw new Error("A pergunta musical não deve ser delegada"); } });
  assert.match(personalized.text, /Não há uma faixa selecionada nesta conversa/, "the direct Music chat receives Euterpe-scoped confirmed preferences through the bridge");
  const currentInstructionWins = await runMusicAgentTurn({ message: "Fale de forma informal. O que acha dessa faixa?", experienceContext: preparedExperience, consultAthena: async () => { throw new Error("A pergunta musical não deve ser delegada"); } });
  assert.match(currentInstructionWins.text, /Ainda não tenho uma faixa selecionada/, "the current request overrides Euterpe's stored formality");
  const trackAware = await runMusicAgentTurn({ message: "O que acha dessa faixa?", track: { id: "track-1", name: "Noite", artist: "Demo", durationMs: 0, mimeType: "audio/mpeg", sizeBytes: 0, addedAt: "now" }, experienceContext: preparedExperience, consultAthena: async () => { throw new Error("A pergunta musical não deve ser delegada"); } });
  assert.match(trackAware.text, /abordagem musical que pode valer testar/i);
  assert.match(trackAware.text, /comparar tags sem inferir gênero/i, "Euterpe may use useful method precedent scoped to this track without claiming facts about its audio");

  const visualProposal = await runMusicAgentTurn({
    message: "Faça uma capa escura",
    track: { id: "track-1", name: "Noite", artist: "Demo", durationMs: 0, mimeType: "audio/mpeg", sizeBytes: 0, addedAt: "now" },
    conversation: [{ sender: "user", text: "Faça uma capa escura" }],
    consultAthena: async () => { throw new Error("A solicitação musical não deve ser delegada"); },
  });
  assert.deepEqual(visualProposal.proposal, { kind: "visual-profile", trackId: "track-1", instruction: "capa escura" });

  const contextualFollowUp = await runMusicAgentTurn({
    message: "Por quê?",
    track: { id: "track-1", name: "Noite", artist: "Demo", durationMs: 0, mimeType: "audio/mpeg", sizeBytes: 0, addedAt: "now" },
    conversation: [
      { sender: "user", text: "Faça uma capa escura" },
      { sender: "curator", text: "Posso preparar um perfil visual capa escura para Noite." },
      { sender: "user", text: "Por quê?" },
    ],
    consultAthena: async () => { throw new Error("O follow-up musical não deve ser delegado"); },
  });
  assert.match(contextualFollowUp.text, /Faça uma capa escura/);
  assert.doesNotMatch(contextualFollowUp.text, /Por quê\?/i);

  const delegated = await runMusicAgentTurn({ message: "Crie um projeto para divulgar o álbum", consultAthena: async (request) => { consultCount++; assert.equal(request, "Crie um projeto para divulgar o álbum"); return { text: "O plano está pronto para revisão." }; } });
  assert.equal(delegated.agent, "euterpe");
  assert.equal(delegated.consultedAthena, true);
  assert.match(delegated.text, /Consultei Athena/);
  assert.match(delegated.text, /plano está pronto/);
  assert.equal(consultCount, 1);

  let delegatedContext: Array<{ sender: "user" | "curator"; text: string; consultedAthena?: boolean }> | undefined;
  const followedUp = await runMusicAgentTurn({
    message: "Por quê?",
    conversation: delegatedConversation,
    consultAthena: async (_request, conversation) => {
      delegatedContext = conversation;
      return { text: "Porque essa foi a prioridade indicada no plano." };
    },
  });
  assert.equal(followedUp.consultedAthena, true);
  assert.deepEqual(delegatedContext, delegatedConversation.slice(0, -1), "Athena receives only the preceding bounded turns; the current prompt is separate");
  console.log("Music agent chat identity and Athena delegation regression passed.");
})();
