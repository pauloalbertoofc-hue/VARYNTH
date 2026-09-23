import assert from "node:assert/strict";
import { experienceEventRepository } from "@/lib/persistence/repositories";
import { musicLearningAdapter } from "./music-learning-adapter";

async function run() {
  await experienceEventRepository.clear();
  const rated = await musicLearningAdapter.record({ action: "TRACK_RATED", trackId: "track-a", before: null, after: 5, note: "Favorita" });
  assert.equal(rated.ownerId, "local-owner");
  assert.equal(rated.domain, "music");
  assert.equal(rated.moduleId, "music");
  assert.equal(rated.actionType, "FEEDBACK_SUBMITTED");
  assert.equal(rated.metadata.explicitRating, 5);
  assert.equal(rated.metadata.note, "Favorita");

  const visual = await musicLearningAdapter.record({ action: "VISUAL_MOTION_CHANGED", trackId: "track-a", before: "ANIMATED", after: "STATIC" });
  assert.equal(visual.actionType, "MANUAL_EDIT");
  assert.equal(visual.artifactId, "track-a");
  assert.equal(visual.metadata.generatedAutomatically, undefined);
  assert.equal((await experienceEventRepository.getAll()).length, 2);
  console.log("Music Experience adapter tests passed");
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
