import { strict as assert } from "node:assert";
import { boundingBox, snap, transformPoint } from "./geometry-engine";

const rotated = transformPoint({ x: 1, y: 0 }, { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 90 });
assert(Math.abs(rotated.x) < 0.0001 && Math.abs(rotated.y - 1) < 0.0001);
assert.deepEqual(boundingBox([{ x: 2, y: 4 }, { x: 8, y: 10 }]), { x: 2, y: 4, width: 6, height: 6 });
assert.equal(snap(13, 5), 15);
console.log("Geometry engine tests passed: transforms, bounds and snapping.");

