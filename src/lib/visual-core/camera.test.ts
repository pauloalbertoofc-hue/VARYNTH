import { strict as assert } from "node:assert";
import { capabilitiesFromTrack, describeCameraError, detectCameraCapabilities, normalizeCameraError } from "./camera";

const unsupported = detectCameraCapabilities({} as typeof globalThis);
assert.equal(unsupported.camera.state, "unsupported");
assert.equal(unsupported.raw.state, "unsupported");

const track = {
  getCapabilities: () => ({ torch: true, zoom: { min: 1, max: 4 }, focusMode: ["continuous"] }),
} as unknown as MediaStreamTrack;
const supported = capabilitiesFromTrack(track);
assert.equal(supported.torch.state, "supported");
assert.equal(supported.zoom.state, "supported");
assert.equal(supported.focus.state, "supported");
assert.equal(supported.raw.state, "unsupported");
assert.equal(normalizeCameraError({ name: "OverconstrainedError" }).message, "CAMERA_CONSTRAINT_UNAVAILABLE");
assert.equal(normalizeCameraError({ name: "NotFoundError" }).message, "CAMERA_NOT_FOUND");
assert.equal(normalizeCameraError({ name: "NotReadableError" }).message, "CAMERA_TEMPORARILY_UNAVAILABLE");
assert.equal(normalizeCameraError(new Error("custom")).message, "custom");
assert.match(describeCameraError({ name: "NotAllowedError" }), /Permita/);
assert.match(describeCameraError({ name: "NotFoundError" }), /Nenhuma câmera/);
console.log("Camera adapter tests passed: capability detection is fail-closed.");

