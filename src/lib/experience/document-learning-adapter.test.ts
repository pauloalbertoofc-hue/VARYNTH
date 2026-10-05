import { experienceEventRepository } from "@/lib/persistence/repositories";
import { documentLearningAdapter } from "./document-learning-adapter";

async function run() {
  await experienceEventRepository.clear();
  const event = await documentLearningAdapter.record({ action: "CITATION_STYLE_CHANGED", domain: "legal-workflow", before: "ABNT", after: "OSCOLA", userInitiated: true });
  if (event.moduleId !== "document" || event.domain !== "legal-workflow" || event.actionType !== "MANUAL_EDIT" || event.metadata.domain !== "legal-workflow" || !event.learningEligible || event.actor !== "USER") throw new Error("explicit citation edit mapping failed");
  const edit = await documentLearningAdapter.record({ action: "CONTENT_EDITED", artifactId: "document-a", before: { characters: 0, text: "private" }, after: { characters: 42, body: "private" } });
  if (edit.domain !== "writing" || edit.actionType !== "MANUAL_EDIT" || edit.metadata.documentAction !== "CONTENT_EDITED" || edit.learningEligible || edit.actor !== "SYSTEM" || JSON.stringify(edit.before) !== JSON.stringify({ characters: 0 }) || JSON.stringify(edit.after) !== JSON.stringify({ characters: 42 })) throw new Error("document adapter must retain lengths only and reject unattributed learning evidence");
  console.log("Document learning adapter validation passed.");
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
