import type { AthenaEngineContext } from "../engine";
import { processAthenaQueryAsync } from "../engine";
import { athenaConversationManager } from "../conversation/conversation-manager";
import { athenaConversationStore } from "../conversation/conversation-store";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const context: AthenaEngineContext = {
  projects: [], tasks: [], vaultItems: [], chronosEvents: [], theses: [], evidences: [], opportunities: [], notes: [],
  addTask: (data) => ({ ...data, id: "communication-task", createdAt: new Date().toISOString() }),
  addNote: (data) => ({ ...data, id: "communication-note", createdAt: new Date().toISOString() }),
};

async function run(): Promise<void> {
  const image = await processAthenaQueryAsync("Athenas consegue me dar ideia de uma imagem?", "geral", context, undefined, "communication-image");
  assert(image.text.includes("ideias visuais") && !image.text.includes("Como seu copilot digital, posso"), "Image ideation must answer with concrete ideas instead of a capabilities briefing");

  const selectedImage = await processAthenaQueryAsync("Faça a 2 então", "geral", context, undefined, "communication-image");
  assert(selectedImage.actionCard?.type === "studio_criado" && selectedImage.actionCard.link?.includes("studio=IMAGE") && !selectedImage.text.includes("O que temos na pauta hoje"), "A numbered follow-up must create an Image Studio artifact instead of resetting the conversation");

  const naturalSelection = await processAthenaQueryAsync("faça a 2 para mim ver", "geral", context, undefined, "communication-image");
  assert(naturalSelection.actionCard?.type === "studio_criado", "Natural numbered selections must preserve and reopen the preceding output");

  const bareSelection = await processAthenaQueryAsync("2", "geral", context, undefined, "communication-image");
  assert(bareSelection.actionCard?.type === "studio_criado", "A bare option number must resolve only from the current conversation context");

  const pastedSelection = await processAthenaQueryAsync("2. Ordem no caos: Um labirinto tecnológico visto de cima", "geral", context, undefined, "communication-image");
  assert(pastedSelection.actionCard?.type === "studio_criado", "A pasted numbered option must resolve to the selected recommendation");

  const restoredConversation = athenaConversationStore.create("geral");
  const restoredSession = restoredConversation.id;
  athenaConversationStore.saveMessages(restoredSession, [
    { id: "u1", sender: "user", text: "quero ideias para uma imagem", timestamp: "10:00", scope: "geral" },
    image,
  ]);
  athenaConversationManager.updateSessionWithHistory(restoredSession, [
    { id: "u1", sender: "user", text: "quero ideias para uma imagem", timestamp: "10:00", scope: "geral" },
    { id: "a1", sender: "athena", text: image.text, timestamp: "10:01", scope: "geral" },
  ]);
  const restoredSelection = await processAthenaQueryAsync("2", "geral", context, undefined, restoredSession);
  assert(restoredSelection.actionCard?.type === "studio_criado", "A selected option must survive a reload or device switch");

  const incomplete = await processAthenaQueryAsync("Dá ruim em", "geral", context, undefined, "communication-incomplete");
  assert(incomplete.text.includes("ficado incompleta") && !incomplete.text.includes("Tudo excelente por aqui"), "Incomplete fragments must request sentence completion instead of replaying a greeting");

  const vault = await processAthenaQueryAsync("Athena consegue salvar esse livro pra mim no Vault?", "geral", context, undefined, "communication-vault");
  assert(vault.text.includes("preciso saber qual é o item") && vault.text.includes("Envie ou selecione") && !vault.text.includes("Tudo excelente por aqui"), "Vault save request without an item must ask for the missing book safely");

  const greeting = await processAthenaQueryAsync("Oi Athena", "geral", context, undefined, "communication-greeting");
  assert(!greeting.text.includes("Paulo") && !greeting.text.includes("ficado incompleta"), "Real greetings must remain natural without leaking another account name");

  console.log("✓ Image ideation, incomplete fragments, Vault handoff and genuine greetings communicate correctly");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
