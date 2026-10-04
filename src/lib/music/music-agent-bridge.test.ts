import assert from "node:assert/strict";
import { musicAgentShouldConsultAthena, runMusicAgentTurn } from "./music-agent-bridge";

assert.equal(musicAgentShouldConsultAthena("Oi!"), false);
assert.equal(musicAgentShouldConsultAthena("O que é Music DNA?"), false);
assert.equal(musicAgentShouldConsultAthena("Crie uma playlist calma"), false);
assert.equal(musicAgentShouldConsultAthena("Faça um tema visual escuro"), false);
assert.equal(musicAgentShouldConsultAthena("Crie um projeto para divulgar o álbum"), true);
assert.equal(musicAgentShouldConsultAthena("Pergunte à Athena sobre meu projeto"), true);

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
  console.log("Music agent chat identity and Athena delegation regression passed.");
})();
