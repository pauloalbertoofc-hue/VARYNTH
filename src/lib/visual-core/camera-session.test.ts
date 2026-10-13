import { strict as assert } from "node:assert";
import { CameraSession } from "./camera-session";

let stopped = false;
let applied: MediaTrackConstraints | null = null;
const track = { getCapabilities: () => ({ torch: true, zoom: { min: 1, max: 4 }, focusMode: ["continuous"] }), applyConstraints: async (value: MediaTrackConstraints) => { applied = value; } } as unknown as MediaStreamTrack;
const stream = { getVideoTracks: () => [track], getTracks: () => [{ stop: () => { stopped = true; } }] } as unknown as MediaStream;
const adapter = {
  requestStream: async () => stream,
  getCapabilities: async () => { throw new Error("not needed"); },
  stopStream: (value: MediaStream) => value.getTracks().forEach((track) => track.stop()),
};
const session = new CameraSession(adapter);
session.stop();
assert.equal(stopped, false);
console.log("Camera session tests passed: lifecycle is safe before start.");
assert.equal(typeof session.recordVideo, "function");
void (async () => {
  await session.start({ play: async () => undefined } as unknown as HTMLVideoElement);
  await session.applyVideoConstraints({ advanced: [{ torch: true } as MediaTrackConstraintSet] });
  assert.deepEqual(applied, { advanced: [{ torch: true }] });
  console.log("Camera session tests passed: hardware constraints reach the active video track.");
})();

