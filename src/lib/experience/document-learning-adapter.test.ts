import { experienceEventRepository } from "@/lib/persistence/repositories";
import { documentLearningAdapter } from "./document-learning-adapter";

async function run() {
  await experienceEventRepository.clear();
  const event = await documentLearningAdapter.record({ action: "CITATION_STYLE_CHANGED", domain: "legal-workflow", before: "ABNT", after: "OSCOLA" });
  if (event.moduleId !== "document" || event.domain !== "legal-workflow" || event.actionType !== "MANUAL_EDIT" || event.metadata.domain !== "legal-workflow") throw new Error("document adapter mapping failed");
  const edit = await documentLearningAdapter.record({ action: "CONTENT_EDITED", artifactId: "document-a", before: { characters: 0 }, after: { characters: 42 } });
  if (edit.domain !== "writing" || edit.actionType !== "MANUAL_EDIT" || edit.metadata.documentAction !== "CONTENT_EDITED") throw new Error("document content edit mapping failed");
  console.log("Document learning adapter validation passed.");
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
