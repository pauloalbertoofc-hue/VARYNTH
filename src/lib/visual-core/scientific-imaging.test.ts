import assert from "node:assert/strict";
import { analyzeImageData } from "./scientific-imaging";

const data = { width: 2, height: 2, data: new Uint8ClampedArray([0, 0, 0, 255, 255, 255, 255, 255, 128, 128, 128, 128, 255, 0, 0, 255]) } as ImageData;
const report = analyzeImageData(data);
assert.equal(report.pixels, 4);
assert.equal(report.histogram.reduce((sum, value) => sum + value, 0), 4);
assert.equal(report.clippedShadowPercent, 25);
assert.equal(report.clippedHighlightPercent, 25);
assert.equal(report.alphaCoveragePercent, 100);
assert.ok(report.standardDeviation > 0);
console.log("Scientific imaging analysis tests passed.");

