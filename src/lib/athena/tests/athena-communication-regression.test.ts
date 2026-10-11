import type { AthenaEngineContext } from "../engine";
import { processAthenaQueryAsync } from "../engine";
import { athenaConversationManager } from "../conversation/conversation-manager";
import { athenaConversationStore } from "../conversation/conversation-store";
import { experienceEventRepository, experienceRepository } from "@/lib/persistence/repositories";
import { experienceService } from "@/lib/experience/experience-service";
import { retainExperience } from "@/lib/experience/outcome-service";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const context: AthenaEngineContext = {
  projects: [], tasks: [], vaultItems: [], chronosEvents: [], theses: [], evidences: [], opportunities: [], notes: [],
  addTask: (data) => ({ ...data, id: "communication-task", createdAt: new Date().toISOString() }),
  addNote: (data) => ({ ...data, id: "communication-note", createdAt: new Date().toISOString() }),
};

async function run(): Promise<void> {
  await Promise.all([experienceEventRepository.clear(), experienceRepository.clear()]);
  for (const [index, question] of [
    "Quais tarefas eu tenho?",
    "Tem coisa pendente?",
    "O que ficou pra fazer?",
    "Estou devendo alguma coisa?",
    "Tem algo na fila?",
  ].entries()) {
    const status = await processAthenaQueryAsync(question, "geral", context, undefined, `communication-tasks-${index}`);
    assert(status.text.includes("tarefas pendentes"), `Task-status paraphrase must return grounded task counts: ${question}`);
    const debug = status.metadata?.debug as Record<string, unknown> | undefined;
    assert(debug?.interactionContract === "ANSWER_SELF", `Read-only task status must be answered directly: ${question}`);
  }

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

  const outcomeEvent = await experienceService.record({
    ownerId: "local-owner", actor: "USER", actionType: "OUTCOME_RECORDED", metadata: { reviewed: true },
    source: "project-retrospective", privacyScope: "PROJECT_SHARED", learningEligible: true, projectId: "communication-project",
  });
  await retainExperience({
    ownerId: "local-owner", domain: "creativity", context: {}, situation: "As primeiras propostas estavam genéricas",
    action: "Relacionar cada proposta ao objetivo visual do projeto", outcome: "A direção foi escolhida com menos revisões",
    usefulness: 0.9, evidence: [{ eventId: outcomeEvent.id, weight: "HIGH", reason: "retrospectiva confirmada" }],
    scope: "PROJECT", scopeId: "communication-project",
  });
  const projectContext: AthenaEngineContext = {
    ...context,
    experienceOwnerId: "local-owner",
    projects: [{
      id: "communication-project", title: "Identidade visual", description: "Projeto de teste", category: "experimento",
      status: "ativo", priority: "media", tags: [], createdAt: "2026-10-10", updatedAt: "2026-10-10",
    }],
  };
  const projectIdeas = await processAthenaQueryAsync("Me dê ideias para este projeto", "geral", projectContext, "communication-project", "communication-project-experience");
  assert(projectIdeas.text.includes("Experiência registrada neste projeto") && projectIdeas.text.includes("menos revisões"), "Deterministic Athena should use a positive retained outcome for the exact active project as a method reference");
  const appliedExperienceIds = ((projectIdeas.metadata?.experienceContext as { appliedExperienceIds?: string[] } | undefined)?.appliedExperienceIds) ?? [];
  assert(appliedExperienceIds.length === 1, "The response trace should identify the exact experience record it used");

  const suppressedIdeas = await processAthenaQueryAsync("Me dê ideias para este projeto sem usar experiências anteriores", "geral", projectContext, "communication-project", "communication-project-no-history");
  assert(!suppressedIdeas.text.includes("Experiência registrada neste projeto"), "Explicit current instruction must suppress historical guidance");

  const otherProjectIdeas = await processAthenaQueryAsync("Me dê ideias para outro projeto", "geral", projectContext, "another-project", "communication-other-project");
  assert(!otherProjectIdeas.text.includes("Experiência registrada neste projeto"), "Project outcome must not cross into another project");

  console.log("✓ Athena colloquial conversation, real project-outcome retrieval, instruction override and project isolation passed");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
