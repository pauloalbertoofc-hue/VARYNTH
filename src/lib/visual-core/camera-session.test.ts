import { strict as assert } from "node:assert";
import { CameraSession } from "./camera-session";

let stopped = false;
let applied: MediaTrackConstraints | null = null;
const track = { getCapabilities: () => ({ torch: true, zoom: { min: 1, max: 4 }, focusMode: ["continuous"] }), getSettings: () => ({ width: 1920, height: 1080 }), applyConstraints: async (value: MediaTrackConstraints) => { applied = value; } } as unknown as MediaStreamTrack;
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

  const originalImageCapture = (globalThis as typeof globalThis & { ImageCapture?: unknown }).ImageCapture;
  const originalCreateImageBitmap = globalThis.createImageBitmap;
  const nativePhoto = new Blob(["native-photo"], { type: "image/jpeg" });
  class TestImageCapture {
    constructor(readonly videoTrack: MediaStreamTrack) {
      assert.equal(videoTrack, track);
    }
    async getPhotoCapabilities() { return { imageWidth: { max: 4032 }, imageHeight: { max: 3024 } }; }
    async takePhoto() { return nativePhoto; }
  }
  Object.assign(globalThis, {
    ImageCapture: TestImageCapture,
    createImageBitmap: async () => ({ width: 4032, height: 3024, close: () => undefined }),
  });
  try {
    const capture = await session.capture();
    assert.equal(capture.blob, nativePhoto);
    assert.equal(capture.width, 4032);
    assert.equal(capture.height, 3024);
    assert.equal(capture.captureMethod, "NATIVE_PHOTO");
    assert.equal(capture.source, "DEVICE_CAMERA");
    assert.equal(capture.generated, false);
    console.log("Camera session tests passed: native full-resolution photo capture is preferred.");
  } finally {
    Object.assign(globalThis, { ImageCapture: originalImageCapture, createImageBitmap: originalCreateImageBitmap });
  }
})();

