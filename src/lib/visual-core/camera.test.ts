import { strict as assert } from "node:assert";
import { capabilitiesFromTrack, detectCameraCapabilities } from "./camera";

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
console.log("Camera adapter tests passed: capability detection is fail-closed.");

