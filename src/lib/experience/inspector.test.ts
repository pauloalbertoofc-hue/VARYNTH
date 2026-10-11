import assert from "node:assert/strict";
import { buildExperienceEventLineage } from "./inspector";
import type { ExperienceEvent, ExperienceRecord, Preference, PreferenceCandidate } from "./contracts";

const sourceEvent: ExperienceEvent = { id: "source", ownerId: "owner-a", timestamp: "2026-10-11T00:00:00.000Z", actor: "USER", actionType: "FEEDBACK_SUBMITTED", metadata: {}, source: "athena", privacyScope: "USER_SHARED", learningEligible: true, schemaVersion: 1 };
const preference: Preference = { id: "preference", ownerId: "owner-a", subject: "user", domain: "communication", key: "tone", value: "concise", scope: "GLOBAL", confidence: 0.9, status: "CONFIRMED", evidence: [{ eventId: "source", weight: "VERY_HIGH", reason: "explicit" }], source: "MANUAL", createdAt: "", updatedAt: "" };
const experience: ExperienceRecord = { id: "experience", ownerId: "owner-a", domain: "research", context: {}, situation: "s", action: "a", outcome: "o", confidence: 0.8, evidence: [{ eventId: "source", weight: "HIGH", reason: "reviewed" }], scope: "PROJECT", scopeId: "p", createdAt: "" };
const candidate: PreferenceCandidate = { subject: "user", domain: "audio", key: "tempo", value: 90, scope: "PROJECT", scopeId: "p", evidence: [{ eventId: "source", weight: "HIGH", reason: "repeated edit" }], proposedAt: "" };
const retrieval: ExperienceEvent = { id: "decision", ownerId: "owner-a", timestamp: "2026-10-11T00:01:00.000Z", actor: "AGENT", agentId: "logos", moduleId: "athena", actionType: "EXPERIENCE_CONTEXT_RETRIEVED", metadata: { retrievedPreferenceIds: ["preference"], retrievedExperienceIds: ["experience"], experienceIdsReferencedInResponse: ["experience"], evidenceEventIdsReferencedInResponse: ["source"], instructionPrecedence: "CURRENT_INSTRUCTION_OVERRIDES_PERSONALIZATION" }, source: "athena-experience-context", privacyScope: "AGENT_PRIVATE", learningEligible: false, schemaVersion: 1 };
const foreignPreference = { ...preference, id: "foreign", ownerId: "owner-b" };

const lineage = buildExperienceEventLineage("source", [sourceEvent, retrieval], [candidate], [preference, foreignPreference], [experience]);
assert.ok(lineage);
assert.equal(lineage.signal?.kind, "EXPLICIT_FEEDBACK");
assert.deepEqual(lineage.candidates.map((item) => item.key), ["tempo"]);
assert.deepEqual(lineage.preferences.map((item) => item.id), ["preference"]);
assert.deepEqual(lineage.experiences.map((item) => item.id), ["experience"]);
assert.deepEqual(lineage.decisionTraces.map((item) => item.id), ["decision"]);
assert.equal(buildExperienceEventLineage("missing", [sourceEvent], [], [], []), undefined);
console.log("Experience inspector joins event, signal, evidence-backed records, and retrieval trace without cross-account or causal inference.");
