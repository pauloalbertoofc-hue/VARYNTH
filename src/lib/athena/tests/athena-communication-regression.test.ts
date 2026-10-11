import type { AthenaEngineContext } from "../engine";
import { processAthenaQueryAsync } from "../engine";
import { athenaConversationManager } from "../conversation/conversation-manager";
import { athenaConversationStore } from "../conversation/conversation-store";
import { experienceEventRepository, experienceRepository, learningExclusionRepository } from "@/lib/persistence/repositories";
import { experienceService } from "@/lib/experience/experience-service";
import { recordReviewedProjectOutcome } from "@/lib/experience/reviewed-outcome-service";
import { prepareAgentExperienceContext } from "@/lib/athena/runtime/agent-experience-context";
import { musaAgent } from "@/lib/athena/agents/council/musa";
import type { AthenaTask } from "@/lib/athena/domain/task";
import type { AthenaContext } from "@/lib/athena/domain/context";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const context: AthenaEngineContext = {
  projects: [], tasks: [], vaultItems: [], chronosEvents: [], theses: [], evidences: [], opportunities: [], notes: [],
  addTask: (data) => ({ ...data, id: "communication-task", createdAt: new Date().toISOString() }),
  addNote: (data) => ({ ...data, id: "communication-note", createdAt: new Date().toISOString() }),
};

async function run(): Promise<void> {
  await Promise.all([experienceEventRepository.clear(), experienceRepository.clear(), learningExclusionRepository.clear()]);
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

  const colloquialFollowUp = athenaConversationManager.processMessage("communication-colloquial-follow-up", "E aí?", [], undefined, [
    { role: "user", text: "Quero entender as opções para estruturar esse projeto." },
    { role: "athena", text: "Posso comparar as opções com você." },
  ]);
  assert(colloquialFollowUp.ellipsisResolved?.isEllipsis, "A colloquial short follow-up must bind only when a prior exchange exists");
  assert(colloquialFollowUp.ellipsisResolved?.originalReferent === "Quero entender as opções para estruturar esse projeto.", "The exact preceding user request must remain the contextual referent");
  assert(colloquialFollowUp.interactionType === "COGNITIVE_REQUEST", "A contextual continuation should stay on the cognitive path instead of resetting to social conversation");
  const greetingEai = athenaConversationManager.processMessage("communication-eai-greeting", "E aí, tudo bem?");
  assert(!greetingEai.ellipsisResolved?.isEllipsis, "A greeting-shaped turn must not manufacture a previous-topic reference");

  const clarificationSession = "communication-clarify-previous-answer";
  const priorAnswer = "A revisão encontrou duas premissas sem fonte e recomendou separar hipótese de evidência antes da conclusão.";
  athenaConversationManager.updateSessionWithHistory(clarificationSession, [
    { id: "prior-answer", sender: "athena", text: priorAnswer, timestamp: new Date().toISOString(), scope: "geral" },
  ]);
  const clarification = await processAthenaQueryAsync("Poderia explicar melhor?", "geral", context, undefined, clarificationSession);
  assert(clarification.text.includes(priorAnswer), `A formal clarification request must resolve against the immediately preceding Athena answer without inventing details. Got: ${clarification.text}`);
  assert((clarification.metadata?.debug as Record<string, unknown> | undefined)?.interactionContract === "ANSWER_SELF", "Clarifying Athena's own prior answer must not invoke a specialist or tool");

  const noReferent = await processAthenaQueryAsync("Me explica melhor?", "geral", context, undefined, "communication-clarify-without-history");
  assert(noReferent.text.includes("Ainda não há uma resposta anterior"), "Without a prior answer, Athena must ask what to clarify instead of inventing a referent");

  const outcomeEvent = await experienceService.record({
    ownerId: "local-owner", actor: "USER", actionType: "MANUAL_EDIT", domain: "creativity", metadata: { field: "visual-direction" },
    source: "labs", privacyScope: "PROJECT_SHARED", learningEligible: true, projectId: "communication-project",
  });
  const retainedOutcome = await recordReviewedProjectOutcome({
    ownerId: "local-owner", projectId: "communication-project", situation: "As primeiras propostas estavam genéricas",
    action: "Relacionar cada proposta ao objetivo visual do projeto", outcome: "A direção foi escolhida com menos revisões",
    evidenceEventIds: [outcomeEvent.id], confirmsUseful: true,
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
  assert(projectIdeas.text.includes("Experiência registrada neste projeto") && projectIdeas.text.includes("menos revisões"), `Deterministic Athena should use a positive retained outcome for the exact active project as a method reference. Got: ${projectIdeas.text}; metadata=${JSON.stringify(projectIdeas.metadata)}`);
  const appliedExperienceIds = ((projectIdeas.metadata?.experienceContext as { appliedExperienceIds?: string[] } | undefined)?.appliedExperienceIds) ?? [];
  assert(appliedExperienceIds.length === 1 && appliedExperienceIds[0] === retainedOutcome.id, "The response trace should identify the exact experience record it used");

  const agentTask: AthenaTask = {
    id: "reviewed-outcome-agent-task", title: "Ideias para identidade visual", rawPrompt: "Me dê ideias para uma exposição",
    type: "CREATIVE_IDEATION", priority: "media", status: "CREATED", scope: "geral", targetProjectId: "communication-project",
    entities: {}, metadata: { sessionId: "reviewed-outcome-agent-session" }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
  const activeProject = projectContext.projects[0];
  const agentContext: AthenaContext = {
    scope: "geral", activeProject, relevantProjects: [activeProject], relevantTasks: [], relevantVaultItems: [],
    relevantChronosEvents: [], relevantTheses: [], relevantEvidences: [], relevantOpportunities: [], systemTime: new Date().toISOString(),
  };
  const musaExperience = await prepareAgentExperienceContext("musa", agentTask, agentContext, "local-owner");
  assert(musaExperience?.experiences.length === 1 && musaExperience.experiences[0]?.id === retainedOutcome.id, "The reviewed outcome should retrieve for Musa inside the matching creativity/project scope");
  const musaReply = await musaAgent.execute(agentTask, { ...agentContext, experienceContext: musaExperience });
  assert(musaReply.content.includes("Relacionar cada proposta ao objetivo visual do projeto"), "Musa should use the authored outcome as a methodological hint");

  const suppressedIdeas = await processAthenaQueryAsync("Me dê ideias para este projeto sem usar experiências anteriores", "geral", projectContext, "communication-project", "communication-project-no-history");
  assert(!suppressedIdeas.text.includes("Experiência registrada neste projeto"), "Explicit current instruction must suppress historical guidance");

  const otherProjectIdeas = await processAthenaQueryAsync("Me dê ideias para outro projeto", "geral", projectContext, "another-project", "communication-other-project");
  assert(!otherProjectIdeas.text.includes("Experiência registrada neste projeto"), "Project outcome must not cross into another project");

  console.log("✓ Reviewed retrospective outcomes reach Athena and Musa with evidence, project isolation and instruction precedence");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
