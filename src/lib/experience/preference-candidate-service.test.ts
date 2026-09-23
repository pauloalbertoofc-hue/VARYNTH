import assert from "node:assert/strict";
import type { ExperienceEvent } from "./contracts";
import { derivePreferenceCandidates } from "./preference-candidate-service";

function event(id: string, value: number, artifactId: string, overrides: Partial<ExperienceEvent> = {}): ExperienceEvent {
  return {
    id, ownerId: "local-user", timestamp: new Date().toISOString(), actor: "USER", moduleId: "audio", domain: "audio", artifactId,
    actionType: "USER_ACTION", metadata: { audioAction: "BPM_CHANGED", preferenceSignal: { key: "tempoBpm", value } },
    source: "audio-studio", privacyScope: "USER_SHARED", learningEligible: true, schemaVersion: 1, ...overrides,
  };
}

const subject = "local-user";
const oneArtifact = [event("same-1", 120, "artifact-a"), event("same-2", 120, "artifact-a"), event("same-3", 120, "artifact-a")];
assert.equal(derivePreferenceCandidates(oneArtifact, subject).length, 0, "one artifact must not imply a cross-project preference");

const repeated = [event("repeat-1", 120, "artifact-a"), event("repeat-2", 120, "artifact-b"), event("repeat-3", 120, "artifact-a")];
const candidates = derivePreferenceCandidates(repeated, subject);
assert.equal(candidates.length, 1);
assert.equal(candidates[0].key, "tempoBpm");
assert.equal(candidates[0].value, 120);
assert.equal(candidates[0].scope, "DOMAIN");
assert.equal(candidates[0].evidence.length, 3);
assert.equal(candidates[0].subject, subject);

assert.equal(derivePreferenceCandidates([...repeated, event("contradiction", 142, "artifact-c")], subject).length, 0, "conflicting values must not become a candidate");
assert.equal(derivePreferenceCandidates(repeated, "").length, 0, "candidate needs an explicit subject");
assert.equal(derivePreferenceCandidates([
  event("auto-1", 120, "a", { metadata: { preferenceSignal: { key: "tempoBpm", value: 120 }, generatedAutomatically: true } }),
  event("auto-2", 120, "b", { metadata: { preferenceSignal: { key: "tempoBpm", value: 120 }, generatedAutomatically: true } }),
  event("auto-3", 120, "c", { metadata: { preferenceSignal: { key: "tempoBpm", value: 120 }, generatedAutomatically: true } }),
], subject).length, 0, "automatically generated events must not create candidates");
assert.equal(derivePreferenceCandidates([
  event("agent-1", 120, "a", { actor: "AGENT", learningEligible: false }),
  event("agent-2", 120, "b", { actor: "AGENT", learningEligible: false }),
  event("agent-3", 120, "c", { actor: "AGENT", learningEligible: false }),
], subject).length, 0, "agent-authored evidence must not create candidates");
console.log("Preference candidate thresholds and adversarial policy tests passed.");
