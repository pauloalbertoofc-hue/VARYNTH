import { strict as assert } from "node:assert";
import test from "node:test";
import { CameraSession } from "./camera-session";

test("late camera streams are cancelled after stop", async () => {
  let resolveStream: ((stream: MediaStream) => void) | undefined;
  let stoppedTracks = 0;
  const track = { getCapabilities: () => ({}) } as unknown as MediaStreamTrack;
  const stream = {
    getVideoTracks: () => [track],
    getTracks: () => [{ stop: () => { stoppedTracks += 1; } }],
  } as unknown as MediaStream;
  const adapter = {
    requestStream: () => new Promise<MediaStream>((resolve) => { resolveStream = resolve; }),
    getCapabilities: async () => { throw new Error("not needed"); },
    stopStream: (value: MediaStream) => value.getTracks().forEach((item) => item.stop()),
  };
  const session = new CameraSession(adapter);
  const startPromise = session.start({ play: async () => undefined } as unknown as HTMLVideoElement);
  session.stop();
  resolveStream?.(stream);

  await assert.rejects(startPromise, /CAMERA_START_CANCELLED/);
  assert.equal(stoppedTracks, 1);
  assert.equal(session.getVideoTrack(), null);
});
