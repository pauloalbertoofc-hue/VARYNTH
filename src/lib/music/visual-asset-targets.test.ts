import assert from "node:assert/strict";
import { resolveVisualAssetTargetIds } from "./visual-asset-targets";

const library = ["careless", "courtesy", "anima"];

assert.deepEqual(resolveVisualAssetTargetIds("TRACK", "careless", ["courtesy"], library), ["careless"]);
assert.deepEqual(resolveVisualAssetTargetIds("SELECTED", "careless", ["courtesy", "careless", "missing"], library), ["careless", "courtesy"]);
assert.deepEqual(resolveVisualAssetTargetIds("LIBRARY", "careless", ["missing"], [...library, "careless"]), library);
assert.deepEqual(resolveVisualAssetTargetIds("TRACK", "missing", [], library), []);
const largeLibrary = Array.from({ length: 250 }, (_, index) => `track-${index}`);
assert.equal(resolveVisualAssetTargetIds("LIBRARY", largeLibrary[0], [], largeLibrary).length, 250, "whole-library scope retains every track beyond the cloud association batch size");

console.log("Visual asset targeting retains selections and ignores stale tracks.");
