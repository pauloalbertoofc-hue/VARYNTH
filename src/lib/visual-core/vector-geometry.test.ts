import assert from "node:assert/strict";
import { cubicBezierPath } from "./vector-geometry";

assert.equal(cubicBezierPath({ x: 10, y: 20, width: 100, height: 40 }), "M 10 60 C 35 12, 85 68, 110 20");
console.log("Vector geometry tests passed: cubic Bézier paths are deterministic.");

