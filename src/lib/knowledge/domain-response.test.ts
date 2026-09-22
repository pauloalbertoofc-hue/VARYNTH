import assert from "node:assert/strict";
import { requestDomainResponse } from "./protocol";

async function main() {
  const response = await requestDomainResponse({ requester: "athena", domain: "music", query: "conteúdo ausente", purpose: "cross-agent context", scope: "PUBLIC" });
  assert.equal(response.specialistAgent, "euterpe");
  assert.equal(response.confidence, 0);
  assert.ok(response.limitations.length > 0);
  console.log("Domain response tests passed");
}
void main();
