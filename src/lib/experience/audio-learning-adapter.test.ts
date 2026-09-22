import { experienceEventRepository } from "@/lib/persistence/repositories";
import { audioLearningAdapter } from "./audio-learning-adapter";

async function run() {
  await experienceEventRepository.clear();
  const event = await audioLearningAdapter.record({ action: "BPM_CHANGED", projectId: "audio-project", before: 68, after: 74 });
  if (event.moduleId !== "audio" || event.actionType !== "MANUAL_EDIT" || event.metadata.audioAction !== "BPM_CHANGED") throw new Error("audio adapter mapping failed");
  const accepted = await audioLearningAdapter.record({ action: "COMPOSITION_PROPOSAL_ACCEPTED", targetId: "proposal-1" });
  if (accepted.actionType !== "PROPOSAL_ACCEPTED") throw new Error("proposal acceptance mapping failed");
  console.log("Audio learning adapter validation passed.");
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
