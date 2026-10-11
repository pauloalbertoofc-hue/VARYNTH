import { strict as assert } from "node:assert";
import { CameraSession } from "./camera-session";

let stopped = false;
const stream = { getVideoTracks: () => [{ getCapabilities: () => ({ torch: true }) }], getTracks: () => [{ stop: () => { stopped = true; } }] } as unknown as MediaStream;
const adapter = {
  requestStream: async () => stream,
  getCapabilities: async () => { throw new Error("not needed"); },
  stopStream: (value: MediaStream) => value.getTracks().forEach((track) => track.stop()),
};
const session = new CameraSession(adapter);
session.stop();
assert.equal(stopped, false);
console.log("Camera session tests passed: lifecycle is safe before start.");

