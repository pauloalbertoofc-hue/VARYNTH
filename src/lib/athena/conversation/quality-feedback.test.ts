import assert from "node:assert/strict";
import { athenaConversationFeedback } from "./quality-feedback";

const suffix = `${Date.now()}-${Math.random()}`;
const sessionId = `agent-isolation-${suffix}`;
athenaConversationFeedback.record({ sessionId, messageId: `euterpe-${suffix}`, category: "MISUNDERSTOOD", agentId: "euterpe", moduleId: "music" });
assert.equal(athenaConversationFeedback.latest(sessionId, "athena"), undefined, "Euterpe feedback must not drive Athena's repair behavior");
assert.equal(athenaConversationFeedback.latest(sessionId, "euterpe")?.agentId, "euterpe");
athenaConversationFeedback.record({ sessionId, messageId: `legacy-${suffix}`, category: "LOST_CONTEXT" });
assert.equal(athenaConversationFeedback.latest(sessionId, "athena")?.messageId, `legacy-${suffix}`, "Legacy agent-less feedback remains Athena-scoped");
athenaConversationFeedback.record({ sessionId, messageId: `older-${suffix}`, category: "MISUNDERSTOOD", correction: "correction antiga" });
athenaConversationFeedback.record({ sessionId, messageId: `current-${suffix}`, category: "GENERIC_RESPONSE", correction: "correction atual" });
assert.equal(athenaConversationFeedback.latestForMessage(sessionId, `older-${suffix}`, "athena")?.correction, "correction antiga");
assert.equal(athenaConversationFeedback.latestForMessage(sessionId, `current-${suffix}`, "athena")?.correction, "correction atual");
assert.equal(athenaConversationFeedback.latestForMessage(sessionId, `unrated-${suffix}`, "athena"), undefined, "a correction must not leak to a different, unrated assistant response");
console.log("Conversation feedback stays isolated by agent while preserving legacy Athena records.");
