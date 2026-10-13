import assert from "node:assert/strict";
import {
  applyCinematicLightingBuffer,
  normalizeCinematicLightingParameters,
} from "./cinematic-lighting";

const normalized = normalizeCinematicLightingParameters({
  exposure: 4,
  vignette: -2,
});
assert.equal(normalized.exposure, 1);
assert.equal(normalized.vignette, 0);
const source = new Uint8ClampedArray([120, 100, 80, 255, 120, 100, 80, 255]);
const output = applyCinematicLightingBuffer(
  source,
  { warmth: 1, vignette: 0.5 },
  2,
  1,
);
assert.notDeepEqual(Array.from(output), Array.from(source));
assert.equal(output[3], 255);
console.log("Cinematic lighting tests passed.");
