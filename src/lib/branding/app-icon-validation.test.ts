import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { MAX_APP_ICON_BYTES, validateAppIconPng } from "./app-icon-validation";

const defaultIcon = readFileSync(path.join(process.cwd(), "public/icons/varynth-512.png"));
assert.equal(validateAppIconPng(defaultIcon), null, "The bundled 512px default icon is valid");

function pngHeader(width: number, height: number) {
  const bytes = new Uint8Array(24);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10], 0);
  bytes.set([0, 0, 0, 13], 8);
  bytes.set([73, 72, 68, 82], 12);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width, false);
  view.setUint32(20, height, false);
  return bytes;
}

assert.match(validateAppIconPng(pngHeader(512, 256)) || "", /quadrada/);
assert.match(validateAppIconPng(pngHeader(128, 128)) || "", /192 × 192/);
assert.match(validateAppIconPng(new Uint8Array([1, 2, 3])) || "", /PNG válida/);
assert.match(validateAppIconPng(new Uint8Array(MAX_APP_ICON_BYTES + 1)) || "", /512 KB/);

console.log("App icon validation passed: default PNG, square dimensions, minimum size, format, and upload limit.");
