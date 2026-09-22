import assert from "node:assert/strict";
import { listKnowledgeAccessLogs } from "./service";
import { discoverKnowledge } from "./service";

(async () => {
  await discoverKnowledge({ requester: "athena", domain: "music", purpose: "audit operation", operation: "CAN_DISCOVER" });
  const logs = await listKnowledgeAccessLogs();
  assert.equal(logs.at(-1)?.operation, "CAN_DISCOVER");
  console.log("Knowledge audit operation tests passed");
})();
