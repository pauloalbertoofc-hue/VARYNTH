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

console.log("Pending clarification accepts only compatible answers and preserves context across unrelated input.");
