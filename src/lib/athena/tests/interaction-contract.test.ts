import {
  assertInteractionContract,
  interactionContractFor,
  resolveInteractionContract,
} from "../domain/interaction-contract";
import { decisionForContract } from "../domain/interaction-contract";
import { athenaInteractionContractGateway } from "../runtime/interaction-contract-gateway";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const matrix = [
  ["CONVERSATION", "ANSWER_SELF"],
  ["COGNITIVE_REQUEST", "USE_AGENT"],
  ["OPERATIONAL_REQUEST", "USE_TOOL"],
] as const;

for (const [legacy, canonical] of matrix) {
  assert(interactionContractFor(legacy) === canonical, `${legacy} must map to ${canonical}`);
}

const self = resolveInteractionContract({
  interactionType: "CONVERSATION",
  intents: ["SOCIAL_CONVERSATION"],
  confidence: "HIGH",
  requiresAction: false,
});
assert(self.capabilities.mayAnswerDirectly, "ANSWER_SELF must allow a direct answer");
assert(!self.capabilities.mayUseAgent && !self.capabilities.mayUseTool, "ANSWER_SELF must be isolated");

const agent = resolveInteractionContract({
  interactionType: "COGNITIVE_REQUEST",
  intents: ["ANALYZE"],
  confidence: "MEDIUM",
  requiresAction: false,
});
assert(agent.capabilities.mayUseAgent, "USE_AGENT must allow agent delegation");
assert(!agent.capabilities.mayMutateState, "USE_AGENT must not grant mutation authority");

const tool = resolveInteractionContract({
  interactionType: "OPERATIONAL_REQUEST",
  intents: ["EXECUTION_REQUEST"],
  confidence: "HIGH",
  requiresAction: true,
});
assert(tool.capabilities.mayUseTool && tool.capabilities.mayMutateState, "USE_TOOL must expose tool capabilities");
assertInteractionContract(tool, "USE_TOOL");

let failedClosed = false;
try {
  resolveInteractionContract({
    interactionType: "OPERATIONAL_REQUEST",
    intents: ["EXECUTION_REQUEST"],
    confidence: "HIGH",
    requiresAction: false,
  });
} catch {
  failedClosed = true;
}
assert(failedClosed, "An inconsistent operational decision must fail closed");

athenaInteractionContractGateway.clearTelemetry();
let executions = 0;
const gatewayResult = athenaInteractionContractGateway.execute(
  decisionForContract("ANSWER_SELF", "test.direct-answer"),
  () => {
    executions += 1;
    return "ok";
  }
);
assert(gatewayResult === "ok" && executions === 1, "The gateway must execute through the selected owner");
const telemetry = athenaInteractionContractGateway.recentTelemetry();
assert(
  telemetry.some((entry) => entry.contract === "ANSWER_SELF" && entry.status === "COMPLETED"),
  "The gateway must retain local completion telemetry"
);

let blockedExecution = false;
try {
  const invalidDecision = {
    ...decisionForContract("ANSWER_SELF", "test.invalid-owner"),
    contract: "USE_TOOL" as const,
  };
  athenaInteractionContractGateway.execute(invalidDecision, () => {
    blockedExecution = true;
  });
} catch {
  // Expected: executor ownership does not match the immutable capabilities.
}
assert(!blockedExecution, "A mismatched executor must fail before invoking its operation");

console.log("✓ Interaction contract compatibility matrix and invariants verified");
