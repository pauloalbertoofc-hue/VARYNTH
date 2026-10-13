import assert from "node:assert/strict";
import { normalizeCodeGraphic, renderCodeGraphic } from "./code-graphics";
const document = normalizeCodeGraphic({ width: 400, shapes: [{ type: "rect", x: 10, width: 100, height: 40, fill: "#abc" }, { type: "unknown" }, { type: "text", x: 20, y: 60, value: "<safe>" }] });
assert.equal(document.shapes.length, 2);
assert.match(renderCodeGraphic(document), /<rect/);
assert.match(renderCodeGraphic(document), /&lt;safe&gt;/);
console.log("Code graphics contract tests passed.");

