import { strict as assert } from "node:assert";
import { listCameraCaptures, saveCameraCapture, type CameraCaptureRecord } from "./camera-library";

const values = new Map<string, string>();
(globalThis as any).window = {
  localStorage: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  },
} as unknown;

const original: CameraCaptureRecord = {
  id: "capture-test",
  correctedMediaId: "capture-test-corrected",
  mode: "AUTO",
  capturedAt: "2026-10-13T12:00:00.000Z",
  source: "DEVICE_CAMERA",
  generated: false,
  metadata: { correctionAvailable: true },
};
saveCameraCapture(original);
saveCameraCapture({ ...original, imageArtifactId: "image-1", metadata: { ...original.metadata, selectedVersion: "CORRECTED" } });
const saved = listCameraCaptures()[0];
assert.equal(saved?.correctedMediaId, "capture-test-corrected");
assert.equal(saved?.imageArtifactId, "image-1");
assert.equal(saved?.metadata.selectedVersion, "CORRECTED");
console.log("Camera library tests passed: original and corrected media references survive updates.");
