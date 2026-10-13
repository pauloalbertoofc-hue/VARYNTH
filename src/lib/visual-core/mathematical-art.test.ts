import assert from "node:assert/strict";
import { renderFractal } from "./mathematical-art";

const writes: number[] = [];
const context = { createImageData: (width: number, height: number) => ({ data: new Uint8ClampedArray(width * height * 4) }), putImageData: (image: { data: Uint8ClampedArray }) => writes.push(image.data.reduce((sum, value) => sum + value, 0)) } as unknown as CanvasRenderingContext2D;
const parameters = { mode: "mandelbrot" as const, iterations: 24, zoom: 1, cReal: -.8, cImag: .156 };
renderFractal(context, 16, 12, parameters); renderFractal(context, 16, 12, { ...parameters, mode: "julia" });
assert.equal(writes.length, 2); assert.ok(writes[0] > 0); assert.ok(writes[1] > 0); assert.notEqual(writes[0], writes[1], "Mandelbrot and Julia must produce distinct deterministic output");
console.log("Mathematical art renderer tests passed.");
