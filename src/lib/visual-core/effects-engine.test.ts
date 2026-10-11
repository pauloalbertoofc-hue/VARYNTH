import { strict as assert } from "node:assert";
import { alphaComposite, applyOpacity, grayscale } from "./effects-engine";

const result = alphaComposite({ r: 0, g: 0, b: 0, a: 1 }, { r: 255, g: 0, b: 0, a: 0.5 });
assert(Math.abs(result.r - 127.5) < 0.01);
assert.equal(grayscale({ r: 255, g: 0, b: 0, a: 1 }).a, 1);
assert.equal(applyOpacity({ r: 1, g: 2, b: 3, a: 1 }, 0.25).a, 0.25);
console.log("Effects engine tests passed: compositing, grayscale and opacity.");

