import { experienceEventRepository } from "@/lib/persistence/repositories";
import { gameLearningAdapter } from "./game-learning-adapter";

async function run() {
  await experienceEventRepository.clear();
  const event = await gameLearningAdapter.record({ action: "DIFFICULTY_CHANGED", projectId: "game-project", before: "normal", after: "hard" });
  if (event.moduleId !== "game" || event.actionType !== "MANUAL_EDIT" || event.metadata.gameAction !== "DIFFICULTY_CHANGED") throw new Error("game adapter mapping failed");
  console.log("Game learning adapter validation passed.");
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
