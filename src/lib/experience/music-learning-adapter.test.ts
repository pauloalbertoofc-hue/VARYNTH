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
  const acceptedVisualProposal = await musicLearningAdapter.record({ action: "VISUAL_DIRECTIVE_APPLIED", trackId: "track-a", before: "DARK", after: "LIGHT", correlationId: "visual-proposal-1", userInitiated: true });
  assert.equal(acceptedVisualProposal.actionType, "PROPOSAL_ACCEPTED", "a confirmed visual proposal is recorded only as an accepted user action");
  assert.equal(acceptedVisualProposal.learningEligible, true);
  assert.equal(acceptedVisualProposal.correlationId, "visual-proposal-1");
  const acceptedPlaylist = await musicLearningAdapter.record({ action: "PLAYLIST_CREATED", trackId: "track-a", after: 1, correlationId: "playlist-1", userInitiated: true });
  assert.equal(acceptedPlaylist.actionType, "PROPOSAL_ACCEPTED", "playlist acceptance must not be mislabeled as project creation");
  const confirmedPreference = await musicLearningAdapter.record({ action: "PREFERENCE_CONFIRMED", trackId: "track-a", after: "music-style", note: "jazz", correlationId: "account:explicit-style-preference", userInitiated: true });
  assert.equal(confirmedPreference.actionType, "PREFERENCE_CONFIRMED");
  assert.equal(confirmedPreference.metadata.preferenceCategory, "music-style");
  assert.equal(confirmedPreference.after, "music-style", "the Experience event records the category, not the private preference value");
  assert.equal(JSON.stringify(confirmedPreference).includes("jazz"), false, "private preference contents are not duplicated into the Experience event");
  const unattributed = await musicLearningAdapter.record({ action: "VISUAL_EFFECT_CHANGED", trackId: "track-a", before: "safe", after: { arbitrary: "payload" } });
  assert.equal(unattributed.actor, "SYSTEM");
  assert.equal(unattributed.learningEligible, false);
  assert.equal(unattributed.before, "safe");
  assert.equal(unattributed.after, undefined);
  assert.equal((await experienceEventRepository.getAll()).length, 6);
  console.log("Music Experience adapter tests passed");
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
