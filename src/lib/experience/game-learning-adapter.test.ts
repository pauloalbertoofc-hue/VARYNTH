import { experienceEventRepository } from "@/lib/persistence/repositories";
import { collectGameLearningObservation, gameLearningAdapter } from "./game-learning-adapter";
import type { GameDocumentState } from "@/lib/studio/game/types";

async function run() {
  await experienceEventRepository.clear();
  const event = await gameLearningAdapter.record({ action: "DIFFICULTY_CHANGED", projectId: "game-project", before: "normal", after: "hard" });
  if (event.moduleId !== "game" || event.domain !== "game" || event.actionType !== "MANUAL_EDIT" || event.metadata.gameAction !== "DIFFICULTY_CHANGED") throw new Error("game adapter mapping failed");
  const base: GameDocumentState = { artifactId: "game-a", entrySceneId: "scene-a", scenes: [{ id: "scene-a", name: "A", entityIds: [], ruleIds: [], nextSceneIds: [] }], entities: [], variables: [], rules: [], scripts: [], inputActions: [], selectedEntityIds: [], updatedAt: "now" };
  const entity: GameDocumentState["entities"][number] = { id: "entity-a", name: "A", sceneId: "scene-a", components: [], active: true, tags: [] };
  const levelEdit = collectGameLearningObservation(base, { ...base, entities: [entity] });
  if (levelEdit?.action !== "LEVEL_REBUILT" || levelEdit.before.entities !== 0 || levelEdit.after.entities !== 1) throw new Error("game level observation classification failed");
  const mechanicEdit = collectGameLearningObservation(base, { ...base, rules: [{ id: "rule-a", name: "R", enabled: true, trigger: { type: "ON_START" }, conditions: [], actions: [] }] });
  if (mechanicEdit?.action !== "MECHANIC_CHANGED") throw new Error("game mechanic observation classification failed");
  console.log("Game learning adapter validation passed.");
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
