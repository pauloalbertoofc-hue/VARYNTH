import assert from "node:assert/strict";
import {
  applyCinematicLightingBuffer,
  normalizeCinematicLightingParameters,
  parseCinematicLightingRecipe,
  serializeCinematicLightingRecipe,
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
const recipe = parseCinematicLightingRecipe(
  serializeCinematicLightingRecipe({
    look: "golden",
    parameters: { warmth: 2 },
    sourceName: "sample.png",
    generatedAt: "2026-01-01T00:00:00.000Z",
  }),
);
assert.equal(recipe.look, "golden");
assert.equal(recipe.parameters.warmth, 1);
assert.throws(() =>
  parseCinematicLightingRecipe('{"schema":"other","version":1}'),
);
console.log("Cinematic lighting tests passed.");
