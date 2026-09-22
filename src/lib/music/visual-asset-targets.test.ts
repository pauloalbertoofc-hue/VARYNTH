import assert from "node:assert/strict";
import { resolveVisualAssetTargetIds } from "./visual-asset-targets";

const library = ["careless", "courtesy", "anima"];

assert.deepEqual(resolveVisualAssetTargetIds("TRACK", "careless", ["courtesy"], library), ["careless"]);
assert.deepEqual(resolveVisualAssetTargetIds("SELECTED", "careless", ["courtesy", "careless", "missing"], library), ["careless", "courtesy"]);
assert.deepEqual(resolveVisualAssetTargetIds("LIBRARY", "careless", ["missing"], [...library, "careless"]), library);
assert.deepEqual(resolveVisualAssetTargetIds("TRACK", "missing", [], library), []);

console.log("Visual asset targeting retains selections and ignores stale tracks.");
