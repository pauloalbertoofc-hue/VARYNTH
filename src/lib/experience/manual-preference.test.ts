import assert from "node:assert/strict";
import { experienceEventRepository, experiencePreferenceRepository } from "@/lib/persistence/repositories";
import { PreferenceService } from "./preference-service";

async function main() {
  await Promise.all([experienceEventRepository.clear(), experiencePreferenceRepository.clear()]);
  const service = new PreferenceService();
  const first = await service.declare({ domain: "audio", key: "mixDensity", value: "sparse", scope: "DOMAIN" }, "account-a");
  assert.equal(first.status, "CONFIRMED");
  assert.equal(first.source, "MANUAL");
  assert.equal(first.confidence, 1);
  assert.equal(first.scopeId, "audio");
  assert.equal(first.evidence.length, 1);
  const source = await experienceEventRepository.getById(first.evidence[0].eventId);
  assert.equal(source?.ownerId, "account-a");
  assert.equal(source?.actionType, "PREFERENCE_CONFIRMED");
  assert.equal(source?.learningEligible, false);

  const agentPreference = await service.declare({ domain: "creativity", key: "ideationMode", value: "practical", scope: "AGENT", scopeId: "musa" }, "account-a");
  assert.equal(agentPreference.scope, "AGENT");
  assert.equal(agentPreference.scopeId, "musa");
  assert.deepEqual((await service.resolve({ ownerId: "account-a", domain: "creativity", agentId: "musa" })).map((item) => item.value), ["practical"]);
  assert.deepEqual(await service.resolve({ ownerId: "account-a", domain: "creativity", agentId: "logos" }), [], "Agent-private manual preferences never leak to another specialist");
  await assert.rejects(() => service.declare({ domain: "creativity", key: "ideationMode", value: "practical", scope: "AGENT" }, "account-a"), /PREFERENCE_INVALID/);
  await assert.rejects(() => service.declare({ domain: "creativity", key: "ideationMode", value: "practical", scope: "AGENT", scopeId: "imaginary-agent" }, "account-a"), /PREFERENCE_INVALID/);

  const corrected = await service.declare({ domain: "audio", key: "mixDensity", value: "balanced", scope: "DOMAIN" }, "account-a");
  assert.equal(corrected.id, first.id);
  assert.equal(corrected.value, "balanced");
  assert.equal(corrected.status, "CONFIRMED");
  assert.equal(corrected.source, "MANUAL");
  assert.equal(corrected.evidence.length, 2, "correction retains both actual user declarations as provenance");
  assert.deepEqual((await service.resolve({ ownerId: "account-a", domain: "audio" })).map((item) => item.value), ["balanced"]);
  assert.deepEqual(await service.resolve({ ownerId: "account-b", domain: "audio" }), []);
  await assert.rejects(() => service.declare({ domain: "Audio space", key: "mixDensity", value: "loud", scope: "GLOBAL" }, "account-a"), /PREFERENCE_INVALID/);
  console.log("Manual preference ownership, correction, and provenance tests passed.");
}

void main().catch((error) => { console.error(error); process.exitCode = 1; });
