import assert from "node:assert/strict";
import { simulateLearningPipeline, type LearningSandboxObservation } from "./learning-sandbox";

const repeated: LearningSandboxObservation[] = [
  { domain: "audio", key: "tempoDirection", value: "increase", artifactId: "track-a" },
  { domain: "audio", key: "tempoDirection", value: "increase", artifactId: "track-b" },
  { domain: "audio", key: "tempoDirection", value: "increase", artifactId: "track-a" },
];

const consistent = simulateLearningPipeline(repeated);
assert.equal(consistent.events.length, 3);
assert.equal(consistent.signals.length, 3);
assert.equal(consistent.candidates.length, 1, "the production threshold accepts three independent signals across two artifacts");
assert.equal(consistent.candidates[0].evidence.length, 3);
assert.equal(consistent.candidates[0].domain, "audio");
assert.equal(consistent.candidates[0].key, "tempoDirection");
assert.equal(consistent.candidates[0].value, "increase");
assert.equal(consistent.persistentWrites, 0);
const rejected = simulateLearningPipeline(repeated.map((item) => ({ ...item, actionType: "PROPOSAL_REJECTED" as const })));
assert.ok(rejected.signals.every((signal) => signal.polarity === "NEGATIVE"));
assert.equal(rejected.candidates.length, 0, "simulated rejections must not be promoted into positive candidates");
assert.equal(rejected.persistentWrites, 0, "negative simulations must remain non-persistent");
assert.ok(consistent.events.every((event) => event.ownerId === "experience-sandbox-only" && event.metadata.simulationOnly === true));

assert.equal(simulateLearningPipeline(repeated.slice(0, 2)).candidates.length, 0, "one or two events do not cross the real evidence threshold");
assert.equal(simulateLearningPipeline(repeated.map((item) => ({ ...item, artifactId: "track-a" }))).candidates.length, 0, "repeated edits to one artifact are not independent enough");
assert.equal(simulateLearningPipeline([
  ...repeated.slice(0, 2), { ...repeated[2], value: "decrease" },
]).candidates.length, 0, "conflicting values do not become an averaged preference");
assert.equal(simulateLearningPipeline([
  ...repeated.slice(0, 2), { ...repeated[2], generatedAutomatically: true },
]).candidates.length, 0, "automatic events do not inflate preference evidence");
assert.equal(simulateLearningPipeline(repeated.map((item) => ({ ...item, actor: "AGENT" as const }))).candidates.length, 0, "agent-authored events cannot become user preference evidence");
assert.equal(simulateLearningPipeline(repeated.map((item) => ({ ...item, correlationId: "same-action" }))).candidates.length, 0, "duplicate causation does not satisfy the independent-event threshold");
assert.throws(() => simulateLearningPipeline(Array.from({ length: 21 }, (_, index) => ({ ...repeated[0], artifactId: `track-${index}` }))), /EXPERIENCE_SANDBOX_INVALID/);
assert.throws(() => simulateLearningPipeline([{ ...repeated[0], value: "personal conversation text".repeat(20) }]), /EXPERIENCE_SANDBOX_INVALID/);

console.log("Learning sandbox reuses real signal/candidate rules and never persists synthetic evidence.");
