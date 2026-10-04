import assert from "node:assert/strict";
import { experienceEventRepository } from "@/lib/persistence/repositories";
import { athenaConversationFeedback } from "./quality-feedback";
import { recordAgentFeedbackInExperience, recordAthenaFeedbackInExperience } from "./experience-feedback-bridge";

async function main() {
  await experienceEventRepository.clear();
  const feedback = athenaConversationFeedback.record({
    sessionId: "feedback-bridge-session", messageId: "response-42", category: "MISUNDERSTOOD",
    prompt: "conteúdo sensível do pedido", response: "conteúdo integral da resposta", correction: "reformule com clareza",
  });
  const retained = athenaConversationFeedback.list().find((item) => item.id === feedback.id)!;
  assert.equal(retained.prompt, undefined, "conversation prompt is not duplicated in feedback storage");
  assert.equal(retained.response, undefined, "full assistant response is not duplicated in feedback storage");
  assert.equal(retained.correction, "reformule com clareza", "user-entered correction remains available for the explicit repair flow");

  const event = await recordAthenaFeedbackInExperience(feedback);
  assert.equal(event.actionType, "FEEDBACK_SUBMITTED");
  assert.equal(event.targetType, "ATHENA_RESPONSE");
  assert.equal(event.targetId, "response-42");
  assert.equal(event.agentId, "athena");
  assert.equal(event.moduleId, "athena");
  assert.equal(event.sessionId, "feedback-bridge-session");
  assert.equal(event.learningEligible, true);
  assert.deepEqual(event.metadata, { feedbackType: "DISLIKE", context: { qualityCategory: "MISUNDERSTOOD" }, strength: "HIGH" });
  assert.equal(JSON.stringify(event).includes("conteúdo sensível"), false, "experience evidence stores category and provenance, not conversation text");
  const helpful = await recordAthenaFeedbackInExperience({ sessionId: "feedback-bridge-session", messageId: "response-43", category: "HELPFUL" });
  assert.equal(helpful.metadata.feedbackType, "LIKE", "positive feedback is distinguished from correction signals");
  const euterpe = await recordAgentFeedbackInExperience({ sessionId: "music-session-account-a", messageId: "euterpe-response-1", category: "LOST_CONTEXT", agentId: "euterpe", moduleId: "music" });
  assert.equal(euterpe.targetType, "EUTERPE_RESPONSE");
  assert.equal(euterpe.agentId, "euterpe");
  assert.equal(euterpe.moduleId, "music");
  assert.equal(euterpe.sessionId, "music-session-account-a");
  assert.deepEqual(euterpe.metadata, { feedbackType: "DISLIKE", context: { qualityCategory: "LOST_CONTEXT" }, strength: "HIGH" });

  let localValue = JSON.stringify([{ id: "legacy", timestamp: "2026-01-01T00:00:00.000Z", sessionId: "old-session", messageId: "old-response", category: "HELPFUL", prompt: "cópia antiga do pedido", response: "cópia antiga da resposta" }]);
  Object.defineProperty(globalThis, "window", { configurable: true, value: { localStorage: {
    getItem: () => localValue,
    setItem: (_key: string, value: string) => { localValue = value; },
  } } });
  const legacy = athenaConversationFeedback.list()[0];
  assert.equal(legacy.prompt, undefined, "legacy redundant prompt is removed while feedback is read");
  assert.equal(legacy.response, undefined, "legacy redundant response is removed while feedback is read");
  assert.equal(localValue.includes("cópia antiga"), false, "legacy redundant conversation copies are scrubbed from local feedback storage");
  Reflect.deleteProperty(globalThis, "window");
  console.log("Athena and Euterpe explicit feedback keeps correct agent/module scope and minimal provenance.");
}

void main().catch((error) => { console.error(error); process.exitCode = 1; });
