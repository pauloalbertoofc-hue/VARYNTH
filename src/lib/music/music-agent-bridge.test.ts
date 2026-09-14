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

  const delegated = await runMusicAgentTurn({ message: "Crie um projeto para divulgar o álbum", consultAthena: async (request) => { consultCount++; assert.equal(request, "Crie um projeto para divulgar o álbum"); return { text: "O plano está pronto para revisão." }; } });
  assert.equal(delegated.agent, "euterpe");
  assert.equal(delegated.consultedAthena, true);
  assert.match(delegated.text, /Consultei Athena/);
  assert.match(delegated.text, /plano está pronto/);
  assert.equal(consultCount, 1);
  console.log("Music agent chat identity and Athena delegation regression passed.");
})();
