import { strict as assert } from "node:assert";
import { analyzeCameraFrame } from "./camera-quality";

assert.rejects(() => analyzeCameraFrame(new Blob()), /CAMERA_ANALYSIS_REQUIRES_BROWSER/);
console.log("Camera quality tests passed: browser boundary is explicit.");

