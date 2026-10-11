import assert from "node:assert/strict";
import { feedbackTargetFromMetadata } from "./feedback-target";

assert.deepEqual(feedbackTargetFromMetadata(undefined), {});
assert.deepEqual(feedbackTargetFromMetadata({ engine: "deterministic-core" }), {});
assert.deepEqual(feedbackTargetFromMetadata({ agentExecution: { agentId: "logos", agentName: "Logos" } }), { agentId: "logos", agentName: "Logos" });
assert.deepEqual(feedbackTargetFromMetadata({ agentExecution: { agentId: "", agentName: 42 } }), {});
console.log("Conversation feedback is attributed only to the specialist identified as the actual response producer.");
