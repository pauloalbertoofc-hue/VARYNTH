import assert from "node:assert/strict";
import { projectAgentEvidenceDisclosure, readAgentEvidenceDisclosure } from "./agent-evidence-disclosure";

const projected = projectAgentEvidenceDisclosure({
  confidence: 1.2,
  sources: ["  Fonte\u0000 principal  ", "Fonte principal", "x".repeat(500), ...Array.from({ length: 12 }, (_, index) => `Fonte ${index}`)],
  limitations: ["Amostra\r\nlimitada", "y".repeat(500)],
});
assert.equal(projected.confidence, undefined, "invalid or uncalibrated out-of-range confidence is not exposed");
assert.equal(projected.sources.length, 8, "the UI disclosure limits source count");
assert.equal(projected.sources[0], "Fonte principal", "control characters and surrounding whitespace are removed");
assert.equal(projected.sources[1].length, 240, "source labels are bounded before display");
assert.equal(projected.sources[2], "Fonte 0", "duplicate references are collapsed");
assert.ok(projected.sources.every((source) => source.length <= 240 && !/[\u0000-\u001f\u007f-\u009f]/.test(source)));
assert.ok(projected.limitations.every((limitation) => limitation.length <= 240 && !/[\u0000-\u001f\u007f-\u009f]/.test(limitation)));

const readable = readAgentEvidenceDisclosure({
  agentExecution: { agentId: "logos", agentName: " Logos ", success: true, ...projected },
  specialistResponseValidation: { accepted: true },
});
assert.equal(readable?.agentName, "Logos");
assert.equal(readable?.accepted, true);
assert.equal(readable?.confidence, undefined);
assert.equal(readAgentEvidenceDisclosure({ agentExecution: { agentName: "Logos", success: "true" } }), undefined);

console.log("Agent evidence disclosure projection validates, deduplicates and bounds specialist metadata.");
