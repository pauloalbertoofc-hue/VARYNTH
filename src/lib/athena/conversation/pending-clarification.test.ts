import assert from "node:assert/strict";
import { ConversationManager } from "./conversation-manager";

const manager = new ConversationManager();
const projects = [
  { id: "p1", title: "VARYNTH OS", status: "ativo" },
  { id: "p2", title: "Pesquisa CNJ", status: "ativo" },
] as any;

function process(sessionId: string, prompt: string) {
  return manager.processMessage(sessionId, prompt, projects);
}

const projectSession = "pending-clarification-project";
let state = manager.getOrCreateSession(projectSession);
state.pendingQuestion = "Qual projeto você quer dizer?";
let parsed = process(projectSession, "VARYNTH OS");
assert.ok(parsed.intents.includes("CLARIFICATION_RESPONSE"), "an exact project name should answer a project question");
assert.equal(parsed.resolvedEntities.targetProjectId, "p1");

const newQuestionSession = "pending-clarification-new-question";
state = manager.getOrCreateSession(newQuestionSession);
state.pendingQuestion = "Qual projeto você quer dizer?";
parsed = process(newQuestionSession, "O que é epistemologia?");
assert.ok(!parsed.intents.includes("CLARIFICATION_RESPONSE"), "a new question must not be consumed as a project answer");
assert.notEqual(parsed.subject, "PROJECT");

const noiseSession = "pending-clarification-noise";
state = manager.getOrCreateSession(noiseSession);
state.pendingQuestion = "Qual projeto você quer dizer?";
parsed = process(noiseSession, "xyz987abc?");
assert.ok(!parsed.intents.includes("CLARIFICATION_RESPONSE"), "noise must not be consumed as a project answer");
assert.equal(manager.getOrCreateSession(noiseSession).pendingQuestion, "Qual projeto você quer dizer?", "unrelated noise must preserve the pending question");

const socialSession = "pending-clarification-social";
state = manager.getOrCreateSession(socialSession);
state.pendingQuestion = "Qual projeto você quer dizer?";
parsed = process(socialSession, "Tudo bem com você?");
assert.ok(!parsed.intents.includes("CLARIFICATION_RESPONSE"), "a social interruption must not be treated as a project answer");
assert.equal(manager.getOrCreateSession(socialSession).pendingQuestion, "Qual projeto você quer dizer?", "a social interruption must preserve the pending question");

const openSession = "pending-clarification-open";
state = manager.getOrCreateSession(openSession);
state.pendingQuestion = "Qual resultado você esperava?";
parsed = process(openSession, "Uma síntese curta, sem jargão");
assert.ok(parsed.intents.includes("CLARIFICATION_RESPONSE"), "a concise answer should resolve an explicitly open clarification");
assert.equal(manager.getOrCreateSession(openSession).pendingQuestion, undefined);

const comparisonSession = "comparison-targets-required";
const comparisonState = manager.getOrCreateSession(comparisonSession);
comparisonState.recentEntities = ["VARYNTH OS"];
parsed = process(comparisonSession, "Compare os dois.");
assert.ok(parsed.intents.includes("CLARIFICATION_REQUIRED"), "a plural comparison without two known targets must ask instead of inventing a referent");
assert.equal(parsed.subject, "UNRESOLVED_COMPARISON");
assert.equal(parsed.isAmbiguous, true);
assert.deepEqual(parsed.missingInformation, ["comparisonTargets"]);
assert.match(parsed.clarificationPrompt || "", /quais são os dois itens/i);

const explicitComparisonSession = "comparison-explicit-targets";
parsed = process(explicitComparisonSession, "Compare VARYNTH OS e Pesquisa CNJ.");
assert.ok(parsed.intents.includes("COMPARE"), "two explicitly named projects provide sufficient comparison targets");
assert.notEqual(parsed.subject, "UNRESOLVED_COMPARISON");

const topicSwitchSession = "explicit-topic-switch-invalidates-active-project";
parsed = process(topicSwitchSession, "Vamos focar no projeto VARYNTH OS.");
assert.equal(parsed.resolvedEntities.targetProjectId, "p1");
parsed = process(topicSwitchSession, "Mudando de assunto: quero aprender a fazer café.");
assert.equal(parsed.resolvedEntities.targetProjectId, undefined, "an explicit topic switch must stop carrying the old project into unrelated requests");
assert.equal(manager.getOrCreateSession(topicSwitchSession).currentProjectId, undefined);
assert.equal(manager.getOrCreateSession(topicSwitchSession).interruptedTopicStack?.at(-1)?.projectId, "p1", "the interrupted project remains available for an explicit return");
parsed = process(topicSwitchSession, "Como faço isso?");
assert.equal(parsed.subject, "UNRESOLVED_REFERENCE", "old recent entities must not make a deictic referent safe after leaving project context");
assert.equal(parsed.isAmbiguous, true);
parsed = process(topicSwitchSession, "Voltando ao projeto.");
assert.equal(parsed.resolvedEntities.targetProjectId, "p1", "an explicit return restores the interrupted project context");

console.log("Pending clarification accepts only compatible answers and preserves context across unrelated input.");
