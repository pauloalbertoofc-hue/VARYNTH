import assert from "node:assert/strict";
import { getPublicKnowledgeProfile, listPublicCapabilities, requestKnowledgePacket } from "./protocol";
import { listKnowledgeAccessLogs, storeKnowledge } from "./service";

async function main() {
  await storeKnowledge({ id: "packet-k1", title: "Formato WAV", content: "WAV é um formato de áudio", primaryDomain: "music", relatedDomains: [], categories: [], tags: ["audio"], ownerAgent: "euterpe", contributingAgents: [], visibility: "PUBLIC_TO_AGENTS", sensitivity: "PUBLIC", kind: "PUBLIC_DOMAIN", assertion: "FACT", provenance: { sourceType: "TEST", addedBy: "SYSTEM", createdAt: new Date().toISOString(), authority: "INTERNAL_DOCUMENT", inferred: false }, version: 1, freshness: "CURRENT", relatedProjectIds: [], relatedArtifactIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  assert.ok(listPublicCapabilities().some((capability) => capability.agentId === "euterpe"));
  assert.ok(!listPublicCapabilities().some((capability) => capability.id === "delegateTask"));
  const profile = getPublicKnowledgeProfile("music");
  assert.ok(profile?.contracts.every((contract) => contract.capabilities.length === 1 && contract.allowedConsumers.length > 0));
  assert.ok(profile?.contracts.some((contract) => contract.capabilities.includes("music.explainHarmony")));
  const packet = await requestKnowledgePacket({ requester: "justitia", domain: "music", query: "formato áudio", purpose: "análise jurídica", scope: "PUBLIC" });
  assert.equal(packet.provider, "euterpe");
  assert.equal(packet.facts.length, 1);
  assert.equal(packet.facts[0].domain, "music");
  assert.equal(packet.facts[0].authority, "INTERNAL_DOCUMENT");
  assert.deepEqual(packet.facts[0].derivedFromIds, []);
  assert.deepEqual(packet.provenanceIds, packet.facts.map((fact) => fact.knowledgeId));
  assert.ok(packet.constraints.some((constraint) => constraint.includes("raciocínio")));
  assert.equal(packet.truncated, false);
  const accessLog = (await listKnowledgeAccessLogs()).at(-1);
  assert.equal(accessLog?.requester, "justitia");
  assert.equal(accessLog?.provider, "euterpe");
  assert.deepEqual(accessLog?.knowledgeIds, packet.provenanceIds);
  await assert.rejects(requestKnowledgePacket({ requester: "justitia", provider: "unregistered-agent", domain: "music", query: "formato áudio", purpose: "spoof provider", scope: "PUBLIC" }), /KNOWLEDGE_PROVIDER_UNREGISTERED/);
  const longText = "longcontext ".repeat(120);
  const timestamp = new Date().toISOString();
  await storeKnowledge({ id: "packet-long-k2", title: "Contexto extenso", content: longText, primaryDomain: "music", relatedDomains: [], categories: [], tags: [], ownerAgent: "euterpe", contributingAgents: [], visibility: "PUBLIC_TO_AGENTS", sensitivity: "PUBLIC", kind: "PUBLIC_DOMAIN", assertion: "FACT", provenance: { sourceType: "TEST", addedBy: "SYSTEM", createdAt: timestamp, authority: "INTERNAL_DOCUMENT", inferred: false }, version: 1, freshness: "CURRENT", relatedProjectIds: [], relatedArtifactIds: [], createdAt: timestamp, updatedAt: timestamp });
  const boundedPacket = await requestKnowledgePacket({ requester: "justitia", domain: "music", query: "longcontext", purpose: "bounded context", scope: "PUBLIC" });
  assert.equal(boundedPacket.facts.length, 1);
  assert.equal(boundedPacket.facts[0].content.length, 1000);
  assert.equal(boundedPacket.facts[0].truncated, true);
  assert.equal(boundedPacket.truncated, true);
  assert.equal(boundedPacket.facts[0].sourceSpan, undefined);
  console.log("Knowledge protocol tests passed");
}
void main();
