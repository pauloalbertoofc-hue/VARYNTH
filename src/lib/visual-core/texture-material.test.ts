import assert from "node:assert/strict";
import { renderTextureMaterial } from "./texture-material";

const sums: number[] = [];
const context = { createImageData: (width: number, height: number) => ({ data: new Uint8ClampedArray(width * height * 4) }), putImageData: (image: { data: Uint8ClampedArray }) => sums.push(image.data.reduce((sum, value) => sum + value, 0)) } as unknown as CanvasRenderingContext2D;
const base = { pattern: "checker" as const, scale: 8, roughness: .4, metallic: .2, normalStrength: .5, color: "#7dd3fc" };
renderTextureMaterial(context, 12, 8, base); renderTextureMaterial(context, 12, 8, { ...base, pattern: "rings" });
assert.equal(sums.length, 2); assert.ok(sums[0] > 0 && sums[1] > 0); assert.notEqual(sums[0], sums[1], "procedural patterns must produce distinct output");
console.log("Texture material renderer tests passed.");
