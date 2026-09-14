import assert from "node:assert/strict";
import { musicSeekTimeAtPointer } from "./music-playback";

assert.equal(musicSeekTimeAtPointer(150, 100, 200, 240), 60);
assert.equal(musicSeekTimeAtPointer(20, 100, 200, 240), 0);
assert.equal(musicSeekTimeAtPointer(350, 100, 200, 240), 240);
assert.equal(musicSeekTimeAtPointer(150, 100, 0, 240), 0);
console.log("Waveform pointer seeking maps to clamped media time.");
