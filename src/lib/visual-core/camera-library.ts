import type { CameraMode } from "./camera-types";

export interface CameraCaptureRecord {
  id: string;
  originalAssetId?: string;
  imageArtifactId?: string;
  mode: CameraMode;
  capturedAt: string;
  source: "DEVICE_CAMERA";
  generated: false;
  metadata: Record<string, unknown>;
}

const STORAGE_KEY = "varynth_camera_captures_v1";

function readRecords(): CameraCaptureRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) as CameraCaptureRecord[] : [];
  } catch {
    return [];
  }
}

export function saveCameraCapture(record: CameraCaptureRecord): void {
  if (typeof window === "undefined") return;
  const records = readRecords().filter((item) => item.id !== record.id);
  records.unshift(record);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(0, 100)));
}

export function listCameraCaptures(): CameraCaptureRecord[] {
  return readRecords();
}

