import assert from "node:assert/strict";
import { perspectiveMatrix } from "./rendering-3d";

const base = perspectiveMatrix({ rotationX: 25, rotationY: 35, zoom: 1 }, 16 / 9);
const wide = perspectiveMatrix({ rotationX: 25, rotationY: 35, zoom: 1 }, 2);
const zoomed = perspectiveMatrix({ rotationX: 25, rotationY: 35, zoom: 2 }, 16 / 9);
assert.equal(base.length, 16);
assert.notDeepEqual([...base], [...wide], "aspect ratio must affect projection");
assert.notDeepEqual([...base], [...zoomed], "zoom must affect projection");
assert.ok(base[11] === -1, "perspective matrix must preserve homogeneous divide");
assert.ok(base[14] < 0, "camera depth translation must point into the scene");
console.log("3D rendering matrix tests passed.");
