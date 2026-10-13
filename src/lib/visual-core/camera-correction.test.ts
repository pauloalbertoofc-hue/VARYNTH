import assert from "node:assert/strict";
import { suggestCameraCorrection } from "./camera-correction";

const base = { sharpness: { score: .8, confidence: .8 }, exposure: { meanLuma: .5, clippedHighlights: 0, clippedShadows: 0, confidence: .8 }, warnings: [] };
assert.deepEqual(suggestCameraCorrection(base), { exposure: 0, contrast: .04, warmth: 0, tint: 0, vignette: 0 });
assert.equal(suggestCameraCorrection({ ...base, exposure: { ...base.exposure, meanLuma: 0 } }).exposure, .18);
assert.equal(suggestCameraCorrection({ ...base, exposure: { ...base.exposure, meanLuma: 1 } }).exposure, -.18);
console.log("Camera correction tests passed: conservative suggestions are deterministic and bounded.");
