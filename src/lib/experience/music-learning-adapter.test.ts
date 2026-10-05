import assert from "node:assert/strict";
import { experienceEventRepository } from "@/lib/persistence/repositories";
import { musicLearningAdapter } from "./music-learning-adapter";

async function run() {
  await experienceEventRepository.clear();
  const rated = await musicLearningAdapter.record({ action: "TRACK_RATED", trackId: "track-a", before: null, after: 5, note: "texto livre que nao deve persistir", userInitiated: true });
  assert.equal(rated.ownerId, "local-owner");
  assert.equal(rated.domain, "music");
  assert.equal(rated.moduleId, "music");
  assert.equal(rated.actionType, "FEEDBACK_SUBMITTED");
  assert.equal(rated.metadata.explicitRating, 5);
  assert.equal(rated.actor, "USER");
  assert.equal(rated.learningEligible, true);
  assert.equal(rated.metadata.note, undefined);
  assert.equal(rated.after, undefined);

  const visual = await musicLearningAdapter.record({ action: "VISUAL_MOTION_CHANGED", trackId: "track-a", before: "ANIMATED", after: "STATIC", userInitiated: true });
  assert.equal(visual.actionType, "MANUAL_EDIT");
  assert.equal(visual.artifactId, "track-a");
  assert.equal(visual.metadata.generatedAutomatically, false);
  const unattributed = await musicLearningAdapter.record({ action: "VISUAL_EFFECT_CHANGED", trackId: "track-a", before: "safe", after: { arbitrary: "payload" } });
  assert.equal(unattributed.actor, "SYSTEM");
  assert.equal(unattributed.learningEligible, false);
  assert.equal(unattributed.before, "safe");
  assert.equal(unattributed.after, undefined);
  assert.equal((await experienceEventRepository.getAll()).length, 3);
  console.log("Music Experience adapter tests passed");
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
