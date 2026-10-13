import assert from "node:assert/strict";
import { normalizeRetouchParameters } from "./retouch";
assert.deepEqual(normalizeRetouchParameters({ brightness: 4, contrast: -4, saturation: 4 }), { brightness: 1, contrast: -1, saturation: 2 });
assert.deepEqual(normalizeRetouchParameters(), { brightness: 0, contrast: 0, saturation: 1 });
console.log("Retouch parameter tests passed.");

