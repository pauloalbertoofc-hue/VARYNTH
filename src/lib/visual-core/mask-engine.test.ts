import { strict as assert } from "node:assert";
import { combineMasks, createMask, invertMask } from "./mask-engine";

const first = createMask(2, 1, 128);
const second = createMask(2, 1, 64);
assert.deepEqual([...invertMask(first).data], [127, 127]);
assert.deepEqual([...combineMasks(first, second, "multiply").data], [32, 32]);
assert.throws(() => combineMasks(first, createMask(1, 1), "max"), /MASK_DIMENSION_MISMATCH/);
console.log("Mask engine tests passed: deterministic raster operations.");

