import { strict as assert } from "node:assert";
import { listCameraCaptures } from "./camera-library";

assert.deepEqual(listCameraCaptures(), []);
console.log("Camera library tests passed: server boundary is safe.");

