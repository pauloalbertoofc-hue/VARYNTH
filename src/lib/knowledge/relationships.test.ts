import assert from "node:assert/strict";
import { linkKnowledge, listKnowledgeRelationships } from "./service";

(async () => {
  await linkKnowledge({ id: "relationship-r1", fromId: "knowledge-1", toId: "project-1", type: "APPLIES_TO" });
  const relations = await listKnowledgeRelationships("knowledge-1");
  assert.equal(relations[0]?.type, "APPLIES_TO");
  console.log("Knowledge relationship tests passed");
})();
