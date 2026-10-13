import assert from "node:assert/strict";
import {
  applyRetouchBuffer,
  normalizeRetouchParameters,
  RETOUCH_LOOKS,
} from "./retouch";
assert.deepEqual(
  normalizeRetouchParameters({ brightness: 4, contrast: -4, saturation: 4 }),
  { brightness: 1, contrast: -1, saturation: 2 },
);
assert.deepEqual(normalizeRetouchParameters(), {
  brightness: 0,
  contrast: 0,
  saturation: 1,
});
assert.equal(RETOUCH_LOOKS.noir.parameters.saturation, 0);
assert.equal(RETOUCH_LOOKS.custom.label, "Personalizado");
const original = new Uint8ClampedArray([64, 96, 128, 255]);
const brighter = applyRetouchBuffer(original, { brightness: 0.25 });
assert.ok(
  brighter[0] > original[0] &&
    brighter[1] > original[1] &&
    brighter[2] > original[2],
);
assert.equal(brighter[3], 255);
console.log("Retouch parameter tests passed.");
