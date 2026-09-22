import assert from "node:assert/strict";
import { knowledgeFromVaultItem } from "./vault-adapter";
import { requestDomainResponse } from "./protocol";
import { storeKnowledge } from "./service";

async function main() {
  const vaultKnowledge = knowledgeFromVaultItem({ id: "e2e-vault", title: "Copyright de trilha musical", content: "A fonte descreve licenciamento e copyright.", type: "livro", tags: ["copyright"], category: "Direito", primarySubject: "Direito", readingStatus: "para_ler", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  await storeKnowledge(vaultKnowledge);
  const response = await requestDomainResponse({ requester: "athena", domain: "legal", query: "copyright trilha", purpose: "análise interdisciplinar", scope: "DOMAIN" });
  assert.equal(response.specialistAgent, "justitia");
  assert.ok(response.sources.includes("vault:e2e-vault"));
  assert.ok(response.answer.includes("Copyright"));
  assert.equal(response.packet.constraints.length, 2);
  console.log("Knowledge Vault-to-domain end-to-end test passed");
}
void main();
