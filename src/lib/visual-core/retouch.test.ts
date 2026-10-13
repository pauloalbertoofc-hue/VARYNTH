import assert from "node:assert/strict";
import {
  applyRetouchBuffer,
  applyCloneStamp,
  applyHealingBrush,
  canvasPointToImagePoint,
  normalizeRetouchParameters,
  RETOUCH_LOOKS,
} from "./retouch";

if (typeof globalThis.ImageData === "undefined") {
  (
    globalThis as typeof globalThis & { ImageData: typeof ImageData }
  ).ImageData = class {
    data: Uint8ClampedArray;
    width: number;
    height: number;
    constructor(data: Uint8ClampedArray, width: number, height: number) {
      this.data = data;
      this.width = width;
      this.height = height;
    }
  } as unknown as typeof ImageData;
}
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
const cloneSource = new ImageData(
  new Uint8ClampedArray([255, 0, 0, 255, 0, 0, 255, 255]),
  2,
  1,
);
const cloned = applyCloneStamp(cloneSource, {
  sourceX: 0,
  sourceY: 0,
  destinationX: 1,
  destinationY: 0,
  radius: 1,
  opacity: 1,
});
assert.equal(cloned.data[4], 255);
assert.equal(cloned.data[6], 0);
const healingSource = new ImageData(
  new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255]),
  3,
  1,
);
const healed = applyHealingBrush(healingSource, {
  sourceX: 0,
  sourceY: 0,
  destinationX: 2,
  destinationY: 0,
  radius: 1,
  opacity: 1,
});
assert.ok(healed.data[10] > 0);
assert.deepEqual(
  canvasPointToImagePoint(
    50,
    25,
    { left: 0, top: 0, width: 100, height: 50 },
    { width: 800, height: 400 },
  ),
  { x: 400, y: 200 },
);
assert.deepEqual(
  canvasPointToImagePoint(
    -10,
    80,
    { left: 0, top: 0, width: 100, height: 50 },
    { width: 800, height: 400 },
  ),
  { x: 0, y: 399 },
);
console.log("Retouch parameter tests passed.");
