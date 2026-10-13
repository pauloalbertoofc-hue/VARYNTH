import assert from "node:assert/strict";
import { visualCapabilities, visualWorkflows } from "./studio-catalog";

assert.deepEqual(visualWorkflows.map((item) => item.id), ["CAPTURE", "ENHANCE", "EDIT", "CREATE", "ANALYZE", "PRODUCE"]);

assert.equal(visualCapabilities.filter((item) => item.status === "PLANNED").every((item) => !item.href), true);

for (const expected of [
  ["painting", "/modules/digital-painting"],
  ["vector", "/modules/vector-studio"],
  ["shader", "/modules/shader-forge"],
  ["rendering-3d", "/modules/rendering-3d"],
  ["mathematical-art", "/modules/mathematical-art"],
] as const) {
  const capability = visualCapabilities.find((item) => item.id === expected[0]);
  assert.equal(capability?.href, expected[1]);
  assert.notEqual(capability?.status, "PLANNED");
}

console.log("Visual studio catalog tests passed: implemented routes stay discoverable.");
