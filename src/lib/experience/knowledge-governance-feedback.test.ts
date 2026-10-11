import assert from "node:assert/strict";
import { experienceEventRepository } from "@/lib/persistence/repositories";
import { recordKnowledgeGovernanceDecision } from "./knowledge-governance-feedback";

async function run() {
  await experienceEventRepository.clear();
  const published = await recordKnowledgeGovernanceDecision({ action: "PUBLISH", itemId: "knowledge-1", domain: "research" });
  assert.equal(published.actionType, "PROPOSAL_ACCEPTED");
  assert.equal(published.targetType, "KNOWLEDGE_ITEM");
  assert.equal(published.targetId, "knowledge-1");
  assert.equal(published.domain, "research");
  assert.equal(published.learningEligible, false, "governance records are audit evidence, not preference evidence");
  assert.equal(published.metadata.content, undefined);
  assert.equal(published.metadata.title, undefined);

  const revoked = await recordKnowledgeGovernanceDecision({ action: "REVOKE", itemId: "knowledge-2" });
  assert.equal(revoked.actionType, "PROPOSAL_REJECTED");
  assert.equal(revoked.privacyScope, "USER_SHARED");
  const classified = await recordKnowledgeGovernanceDecision({ action: "CLASSIFY", itemId: "knowledge-3", domain: "legal" });
  assert.equal(classified.actionType, "USER_ACTION");
  const lifecycle = await recordKnowledgeGovernanceDecision({ action: "LIFECYCLE", itemId: "knowledge-4", lifecycleState: "ARCHIVED" });
  assert.equal(lifecycle.metadata.lifecycleState, "ARCHIVED");
  const reading = await recordKnowledgeGovernanceDecision({ action: "VAULT_READING_STATUS", itemId: "vault-1", lifecycleState: "concluido" });
  assert.equal(reading.targetType, "VAULT_ITEM");
  assert.equal(reading.metadata.governanceAction, "VAULT_READING_STATUS");
  const deletion = await recordKnowledgeGovernanceDecision({ action: "VAULT_DELETE", itemId: "vault-2" });
  assert.equal(deletion.actionType, "PROPOSAL_REJECTED");
  console.log("Knowledge governance records explicit decisions as scoped, non-learning audit evidence.");
}

run().catch((error) => { console.error(error); process.exitCode = 1; });
