import assert from "node:assert/strict";
import { processAthenaQueryAsync, type AthenaEngineContext } from "../engine";
import { artifactStore } from "../../artifacts/artifact-store";
import { athenaConversationFeedback } from "../conversation/quality-feedback";

const context: AthenaEngineContext = {
  projects: [], tasks: [], vaultItems: [], chronosEvents: [], theses: [], evidences: [], opportunities: [], notes: [],
  addTask: data => ({ ...data, id: "task", createdAt: new Date().toISOString() }), addNote: data => ({ ...data, id: "note" }),
};
const cases = [["IMAGE", "crie uma imagem de um labirinto tecnológico"], ["DOCUMENT", "crie um documento sobre memória e continuidade"], ["WEB", "crie um site landing para o VARYNTH"], ["AUDIO", "crie uma música instrumental curta"], ["VIDEO", "crie um vídeo de abertura para o VARYNTH"], ["GAME", "crie um jogo de quiz"]] as const;
async function run() {
for (const [studio, prompt] of cases) {
  const response = await processAthenaQueryAsync(prompt, "geral", context, undefined, `studio-${studio}`);
  assert.equal(response.actionCard?.type, "studio_criado", `${studio} must return a Studio result card`);
  assert.match(response.actionCard?.link || "", new RegExp(`studio=${studio}.*id=`), `${studio} link must target the created artifact`);
  assert.ok(artifactStore.getById(response.metadata?.artifactId as string), `${studio} artifact must be persisted`);
}
athenaConversationFeedback.record({ sessionId: "feedback-repair", messageId: "bad", category: "MISUNDERSTOOD", prompt: "pedido anterior", response: "resposta ruim", correction: "crie um documento chamado Memória Corrigida" });
const repaired = await processAthenaQueryAsync("corrija a resposta", "geral", context, undefined, "feedback-repair");
assert.equal(repaired.actionCard?.type, "studio_criado", "Explicit feedback correction must be executable on the next turn");
const domainCommand = await processAthenaQueryAsync("crie uma tarefa para revisar a imagem", "geral", context, undefined, "studio-domain-guard");
assert.notEqual(domainCommand.actionCard?.type, "studio_criado", "A task mentioning an image must not be diverted into Image Studio");
console.log("✓ Athena creates persisted, editable outputs in all six Studios and applies explicit feedback corrections");
}
run().catch(error => { console.error(error); process.exitCode = 1; });
