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
  assert.match(result.content, /Não acesso a arquivos/);

  const withTrack = await euterpeAgent.execute(task("Sugestão para minha música", { musicTrack: { id: "t1", name: "Demo" } }), {} as never);
  assert.match(withTrack.content, /Demo/);
  assert.equal((withTrack.metadata as { authority: string }).authority, "advisory-only");

  let calls = 0;
  const delegated = await euterpeAgent.converse(task("Crie uma tarefa para o álbum"), {} as never, async () => { calls++; return { text: "Athena respondeu." }; });
  assert.equal(calls, 1);
  assert.match(delegated.content, /Consultei Athena/);
  assert.equal(delegated.agentId, "euterpe");
  assert.equal((delegated.metadata as { toolAccess: boolean }).toolAccess, false);
  console.log("Athena music curator registry and authority-boundary regression passed.");
})();
