import assert from "node:assert/strict";
import { applyVisualDirective, createVisualProfile, visualFrameStyle } from "./visual-profile";

const initial = createVisualProfile("track-a");
assert.equal(initial.trackId, "track-a");
assert.equal(initial.schemaVersion, 1);
const rain = applyVisualDirective(initial, "Use chuva e deixe essa capa mais sombria");
assert.equal(rain.particleType, "rain");
assert.equal(rain.mood, "dark");
assert.notDeepEqual(rain.palette, initial.palette);
const noMotion = applyVisualDirective(rain, "reduzir movimento");
assert.equal(noMotion.reducedMotion, true);
assert.equal(noMotion.motionSpeed, 0);
const style = visualFrameStyle(initial, { bass: 1, mids: 0.5, treble: 0.2, loudness: 0.8, playing: true });
assert.ok(Number(style["--music-scale"]) > 1);
assert.equal(style["--music-accent"], initial.accentColor);
console.log("VisualProfile determinism, directives, reduced motion, and audio response passed.");
