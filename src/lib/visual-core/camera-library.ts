import type { CameraMode } from "./camera-types";

export interface CameraCaptureRecord {
  id: string;
  originalAssetId?: string;
  correctedMediaId?: string;
  imageArtifactId?: string;
  mode: CameraMode;
  capturedAt: string;
  source: "DEVICE_CAMERA";
  generated: false;
  metadata: Record<string, unknown>;
}

const STORAGE_KEY = "varynth_camera_captures_v1";
const MEDIA_DB = "varynth_camera_media_v1";
const MEDIA_STORE = "captures";

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

export async function saveCameraMedia(id: string, blob: Blob): Promise<boolean> {
  if (typeof indexedDB === "undefined") return false;
  return await new Promise((resolve) => {
    try {
      const request = indexedDB.open(MEDIA_DB, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(MEDIA_STORE);
      request.onerror = () => resolve(false);
      request.onsuccess = () => {
        const transaction = request.result.transaction(MEDIA_STORE, "readwrite");
        transaction.objectStore(MEDIA_STORE).put(blob, id);
        transaction.oncomplete = () => { request.result.close(); resolve(true); };
        transaction.onerror = () => { request.result.close(); resolve(false); };
      };
    } catch { resolve(false); }
  });
}

export async function getCameraMedia(id: string): Promise<Blob | null> {
  if (typeof indexedDB === "undefined") return null;
  return await new Promise((resolve) => {
    try {
      const request = indexedDB.open(MEDIA_DB, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(MEDIA_STORE);
      request.onerror = () => resolve(null);
      request.onsuccess = () => {
        const transaction = request.result.transaction(MEDIA_STORE, "readonly");
        const lookup = transaction.objectStore(MEDIA_STORE).get(id);
        lookup.onsuccess = () => { request.result.close(); resolve(lookup.result instanceof Blob ? lookup.result : null); };
        lookup.onerror = () => { request.result.close(); resolve(null); };
      };
    } catch { resolve(null); }
  });
}

