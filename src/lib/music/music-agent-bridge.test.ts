import assert from "node:assert/strict";
import { musicAgentShouldConsultAthena, resolveEuterpeCorrectionRequest, runMusicAgentTurn } from "./music-agent-bridge";

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
  const direct = await runMusicAgentTurn({ message: "Oi!", consultAthena: async () => { consultCount++; return { text: "não esperado" }; } });
  assert.equal(direct.agent, "euterpe");
  assert.equal(direct.consultedAthena, false);
  assert.match(direct.text, /Euterpe/);
  assert.equal(consultCount, 0);

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
