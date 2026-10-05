import { experienceEventRepository } from "@/lib/persistence/repositories";
import { documentLearningAdapter } from "./document-learning-adapter";

async function run() {
  await experienceEventRepository.clear();
  const event = await documentLearningAdapter.record({ action: "CITATION_STYLE_CHANGED", domain: "legal-workflow", before: "ABNT", after: "OSCOLA", userInitiated: true });
  if (event.moduleId !== "document" || event.domain !== "legal-workflow" || event.actionType !== "MANUAL_EDIT" || event.metadata.domain !== "legal-workflow" || !event.learningEligible || event.actor !== "USER") throw new Error("explicit citation edit mapping failed");
  const edit = await documentLearningAdapter.record({ action: "CONTENT_EDITED", artifactId: "document-a", before: { characters: 0 }, after: { characters: 42 } });
  if (edit.domain !== "writing" || edit.actionType !== "MANUAL_EDIT" || edit.metadata.documentAction !== "CONTENT_EDITED" || edit.learningEligible || edit.actor !== "SYSTEM") throw new Error("unattributed document save must not become preference evidence");
  console.log("Document learning adapter validation passed.");
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
