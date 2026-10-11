import { strict as assert } from "node:assert";
import { formatHexColor, mixColors, parseHexColor, relativeLuminance } from "./color-engine";

assert.deepEqual(parseHexColor("#0af"), { r: 0, g: 170, b: 255, a: 1 });
assert.equal(formatHexColor({ r: 0, g: 170, b: 255, a: 1 }), "#00aaff");
assert.equal(formatHexColor(mixColors({ r: 0, g: 0, b: 0, a: 1 }, { r: 255, g: 255, b: 255, a: 1 }, 0.5)), "#808080");
assert(relativeLuminance({ r: 255, g: 255, b: 255, a: 1 }) > relativeLuminance({ r: 0, g: 0, b: 0, a: 1 }));
console.log("Color engine tests passed: parsing, mixing and luminance.");

