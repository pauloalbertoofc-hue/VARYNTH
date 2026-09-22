import assert from "node:assert/strict";
import { linkKnowledge, listKnowledgeRelationships } from "./service";

(async () => {
  await linkKnowledge({ id: "relationship-r1", fromId: "knowledge-1", toId: "project-1", type: "APPLIES_TO" });
  const relations = await listKnowledgeRelationships("knowledge-1");
  assert.equal(relations[0]?.type, "APPLIES_TO");
  await linkKnowledge({ id: "relationship-derived-a", fromId: "derived-a", toId: "derived-b", type: "DERIVED_FROM" });
  await assert.rejects(linkKnowledge({ id: "relationship-derived-b", fromId: "derived-b", toId: "derived-a", type: "DERIVED_FROM" }), /KNOWLEDGE_RELATION_CYCLE/);
  await linkKnowledge({ id: "relationship-related-cycle-a", fromId: "related-a", toId: "related-b", type: "RELATED_TO" });
  await linkKnowledge({ id: "relationship-related-cycle-b", fromId: "related-b", toId: "related-a", type: "RELATED_TO" });
  await linkKnowledge({ id: "relationship-dependency-a", fromId: "dependency-a", toId: "dependency-b", type: "DEPENDS_ON" });
  await assert.rejects(linkKnowledge({ id: "relationship-dependency-b", fromId: "dependency-b", toId: "dependency-a", type: "DEPENDS_ON" }), /KNOWLEDGE_RELATION_CYCLE/);
  console.log("Knowledge relationship tests passed");
})();
