import assert from "node:assert/strict";
import { askSpecialist } from "./specialist-consultation.server";
import { storeKnowledge } from "./service";

(async () => {
  const timestamp = new Date().toISOString();
  await storeKnowledge({ id: "specialist-music-source", title: "Fundamentos de harmonia", content: "A harmonia descreve relações entre alturas simultâneas; esta fonte não permite inferir a progressão de uma faixa específica.", primaryDomain: "music.theory.harmony", relatedDomains: [], categories: ["theory"], tags: ["harmony"], ownerAgent: "euterpe", contributingAgents: [], visibility: "PUBLIC_TO_AGENTS", sensitivity: "PUBLIC", kind: "PUBLIC_DOMAIN", assertion: "FACT", provenance: { sourceType: "TEST", sourceReference: "fixture://music/harmony", addedBy: "SYSTEM", createdAt: timestamp, authority: "OFFICIAL_REFERENCE", inferred: false }, version: 1, freshness: "CURRENT", relatedProjectIds: [], relatedArtifactIds: [], createdAt: timestamp, updatedAt: timestamp });
  const response = await askSpecialist({ requester: "justitia", domain: "music.theory.harmony", query: "harmony", purpose: "cross-agent technical question", scope: "PUBLIC" });
  assert.equal(response.specialistAgent, "euterpe");
  assert.equal(response.consultation?.status, "SPECIALIST_INVOKED");
  assert.equal(response.consultation?.executionMode, "REGISTERED_AGENT_KNOWLEDGE_METHOD");
  assert.match(response.answer, /Fundamentos de harmonia/);
  assert.deepEqual(response.evidence, ["specialist-music-source"]);
  assert.deepEqual(response.sources, response.packet.provenanceIds);
  assert.match(response.limitations.join(" "), /não análise neural/);

  await storeKnowledge({ id: "specialist-legal-source", title: "Licenciamento de obra musical", content: "O documento descreve licenças e condições de uso comercial de composições, mas não confirma a situação de uma obra específica.", primaryDomain: "legal.intellectual-property", relatedDomains: ["music.asset-provenance"], categories: ["copyright"], tags: ["licença", "uso comercial"], ownerAgent: "justitia", contributingAgents: [], visibility: "PUBLIC_TO_AGENTS", sensitivity: "PUBLIC", kind: "PUBLIC_DOMAIN", assertion: "REFERENCE", provenance: { sourceType: "TEST", sourceReference: "fixture://legal/music-license", addedBy: "SYSTEM", createdAt: timestamp, authority: "OFFICIAL_REFERENCE", inferred: false }, version: 1, freshness: "CURRENT", relatedProjectIds: [], relatedArtifactIds: [], createdAt: timestamp, updatedAt: timestamp });
  const legalResponse = await askSpecialist({ requester: "euterpe", domain: "legal.intellectual-property", query: "licenças condições uso comercial", purpose: "interdisciplinary licensing context", scope: "PUBLIC" });
  assert.equal(legalResponse.specialistAgent, "justitia");
  assert.equal(legalResponse.consultation?.status, "SPECIALIST_INVOKED");
  assert.match(legalResponse.answer, /Licenciamento de obra musical/);
  assert.match(legalResponse.limitations.join(" "), /não aconselhamento jurídico/);

  const noEvidence = await askSpecialist({ requester: "justitia", domain: "music.asset-provenance", query: "unindexed-specialist-query-23910", purpose: "no evidence test", scope: "PUBLIC" });
  assert.equal(noEvidence.specialistAgent, "euterpe");
  assert.equal(noEvidence.consultation?.status, "NO_AUTHORIZED_KNOWLEDGE");
  assert.equal(noEvidence.packet.facts.length, 0);
  assert.equal(response.packet.constraints.includes("O pacote não contém raciocínio interno."), true);
  console.log("Knowledge specialist consultation tests passed");
})();
