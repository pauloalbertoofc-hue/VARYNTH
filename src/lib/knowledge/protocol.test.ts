import assert from "node:assert/strict";
import { listPublicCapabilities, requestKnowledgePacket } from "./protocol";
import { storeKnowledge } from "./service";

async function main() {
  await storeKnowledge({ id: "packet-k1", title: "Formato WAV", content: "WAV é um formato de áudio", primaryDomain: "music", relatedDomains: [], categories: [], tags: ["audio"], ownerAgent: "euterpe", contributingAgents: [], visibility: "PUBLIC_TO_AGENTS", sensitivity: "PUBLIC", kind: "PUBLIC_DOMAIN", assertion: "FACT", provenance: { sourceType: "TEST", addedBy: "SYSTEM", createdAt: new Date().toISOString(), authority: "INTERNAL_DOCUMENT", inferred: false }, version: 1, freshness: "CURRENT", relatedProjectIds: [], relatedArtifactIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  assert.ok(listPublicCapabilities().some((capability) => capability.agentId === "euterpe"));
  const packet = await requestKnowledgePacket({ requester: "justitia", domain: "music", query: "formato áudio", purpose: "análise jurídica", scope: "PUBLIC" });
  assert.equal(packet.provider, "euterpe");
  assert.equal(packet.facts.length, 1);
  assert.ok(packet.constraints.some((constraint) => constraint.includes("raciocínio")));
  console.log("Knowledge protocol tests passed");
}
void main();
