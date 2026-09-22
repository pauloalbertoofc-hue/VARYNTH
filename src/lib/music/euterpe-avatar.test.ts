import assert from "node:assert/strict";
import { clampPosition, classifyEuterpeGesture, isEuterpeMotionEnabled, positionFromPointer, readEuterpePosition, saveEuterpePosition } from "./euterpe-avatar";

assert.deepEqual(clampPosition({ x: -2, y: 4 }), { x: 0, y: 1 });
assert.deepEqual(positionFromPointer(50, 40, { left: 0, top: 0, width: 300, height: 200 }, { width: 100, height: 80 }), { x: 0, y: 0 });
assert.deepEqual(positionFromPointer(500, 400, { left: 0, top: 0, width: 300, height: 200 }, { width: 100, height: 80 }), { x: 1, y: 1 });
const memory = new Map<string, string>();
saveEuterpePosition({ setItem: (key, value) => memory.set(key, value) }, { x: .35, y: .62 }, "test");
assert.deepEqual(readEuterpePosition({ getItem: (key) => memory.get(key) ?? null }, "test"), { x: .35, y: .62 });
assert.equal(readEuterpePosition({ getItem: () => "bad-json" }, "test"), undefined);
assert.equal(classifyEuterpeGesture(false, false), "TAP");
assert.equal(classifyEuterpeGesture(true, false), "DRAG");
assert.equal(classifyEuterpeGesture(false, true), "LONG_PRESS");
assert.equal(isEuterpeMotionEnabled(true, true), false);
assert.equal(isEuterpeMotionEnabled(false, false), false);
assert.equal(isEuterpeMotionEnabled(false, true), true);
console.log("Euterpe drag coordinates clamp to the viewport and persist normalized positions.");
