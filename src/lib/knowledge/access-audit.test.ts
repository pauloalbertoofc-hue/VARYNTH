import assert from "node:assert/strict";
import { listKnowledgeAccessLogs, queryKnowledge } from "./service";

async function main() {
  await queryKnowledge({ requester: "justitia", domain: "music", query: "audio", purpose: "legal context", scope: "PUBLIC" });
  const logs = await listKnowledgeAccessLogs();
  assert.ok(Array.isArray(logs));
  console.log("Knowledge access audit tests passed");
}
void main();
