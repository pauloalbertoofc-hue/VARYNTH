import assert from "node:assert/strict";
import { EUTERPE_CHARACTER, getEuterpeCharacterAsset, type EuterpeVisualState } from "./euterpe-character";

const states: EuterpeVisualState[] = ["IDLE", "LISTENING", "THINKING", "SPEAKING", "HAPPY", "CURIOUS", "ALERT", "SLEEP", "MUSIC_REACTIVE", "MUSIC_PAUSED", "TRACK_CHANGED", "ATHENA_DELEGATION"];
assert.equal(EUTERPE_CHARACTER.source, "user-reference");
assert.equal(EUTERPE_CHARACTER.assetPath, "/music/euterpe/character-reference.png");
assert.ok(EUTERPE_CHARACTER.variants.full.width > 0);
for (const state of states) {
  const crop = getEuterpeCharacterAsset(state);
  assert.ok(crop.width > 0 && crop.height > 0, `${state} must resolve a canonical crop`);
  assert.ok(crop.src.endsWith(".png"));
}
assert.equal(EUTERPE_CHARACTER.fullAsset, "/music/euterpe/euterpe-full.png");
assert.equal(getEuterpeCharacterAsset("SLEEP").label, "Euterpe — dormindo");
assert.equal(getEuterpeCharacterAsset("MUSIC_REACTIVE").label, "Euterpe — tocando lira");
assert.equal(getEuterpeCharacterAsset("ATHENA_DELEGATION").label, "Euterpe — expressão serena");
console.log("Euterpe visual states use only crops of the canonical user reference.");
