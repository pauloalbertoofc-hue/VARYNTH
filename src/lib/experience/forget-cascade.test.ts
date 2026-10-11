import { experienceEventRepository, experiencePreferenceRepository, experienceRepository } from "@/lib/persistence/repositories";
import { experienceService } from "./experience-service";
import { preferenceService } from "./preference-service";
import { retainExperience } from "./outcome-service";
import { recordExperienceDecisionTrace } from "./decision-trace";

async function run() {
  await Promise.all([experienceEventRepository.clear(), experiencePreferenceRepository.clear(), experienceRepository.clear()]);
  const event = await experienceService.record({ actor: "USER", actionType: "FEEDBACK_SUBMITTED", metadata: {}, source: "test", privacyScope: "USER_SHARED", learningEligible: true });
  const inferred = await preferenceService.propose({ subject: "local-owner", domain: "audio", key: "mix", value: "warm", scope: "DOMAIN", scopeId: "audio", evidence: [{ eventId: event.id, weight: "HIGH", reason: "approved" }], proposedAt: new Date().toISOString() });
  const confirmed = await preferenceService.propose({ subject: "local-owner", domain: "audio", key: "style", value: "natural", scope: "DOMAIN", scopeId: "audio", evidence: [{ eventId: event.id, weight: "VERY_HIGH", reason: "explicit" }], proposedAt: new Date().toISOString() });
  await preferenceService.setStatus(confirmed.id, "CONFIRMED");
  const retained = await retainExperience({ domain: "audio", context: {}, situation: "mix a scene", action: "lower the pad", outcome: "accepted", evidence: [{ eventId: event.id, weight: "HIGH", reason: "approved" }] });
  const decisionTraceId = `experience-trace:logos:forget-test-${Date.now()}`;
  await recordExperienceDecisionTrace({
    ownerId: "local-owner", taskId: decisionTraceId, agentId: "logos", domain: "audio", projectId: "project-1",
    trace: { agentId: "logos", retrievedPreferenceIds: [inferred.id, confirmed.id], retrievedExperienceIds: [retained.id], experienceIdsReferencedInResponse: [retained.id], evidenceEventIdsReferencedInResponse: [event.id], instructionPrecedence: "CURRENT_INSTRUCTION_OVERRIDES_PERSONALIZATION" },
  });
  const decisionTrace = `experience-trace:logos:${encodeURIComponent(decisionTraceId)}`;
  if (!(await experienceEventRepository.getById(decisionTrace))) throw new Error("decision trace was not recorded");

  if (!(await experienceService.forget(event.id))) throw new Error("source event was not forgotten");
  if (await experienceEventRepository.getById(event.id)) throw new Error("forgotten event remains stored");
  if (await experiencePreferenceRepository.getById(inferred.id)) throw new Error("unsupported inferred preference survived forget");
  const invalidated = await experiencePreferenceRepository.getById(confirmed.id);
  if (invalidated?.status !== "DEPRECATED" || invalidated.evidence.length !== 0) throw new Error("manual preference provenance was not invalidated");
  if (await experienceRepository.getById(retained.id)) throw new Error("experience without source evidence survived forget");
  if (await experienceEventRepository.getById(decisionTrace)) throw new Error("trace still references forgotten experience evidence");
  console.log("Evidence cascade forgetting tests passed.");
}

run().catch((error) => { console.error(error); process.exitCode = 1; });
