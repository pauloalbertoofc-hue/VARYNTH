import { AudioService } from "./audio-service";
import { AudioDocumentState } from "./types";

const service = new AudioService();
const state = {
  artifactId: "persistence-fixture",
  timeline: { durationMs: 1000, zoom: 1, markers: [], snapToGrid: true, timeUnit: "ms" },
  tracks: [],
  selectedClipIds: [],
  playheadMs: 0,
  updatedAt: new Date(0).toISOString(),
} as AudioDocumentState;

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
const originalConsoleError = console.error;
const storage = new Map<string, string>();
let shouldFail = false;
Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: {
    localStorage: {
      setItem(key: string, value: string) {
        if (shouldFail) throw new Error("QuotaExceededError");
        storage.set(key, value);
      },
    },
  },
});

try {
  const saved = service.persistPendingStateLocally(state);
  if (!saved.success || !storage.has("varynth_audio_state_persistence-fixture")) {
    throw new Error("Pending audio state should be synchronously persisted to browser storage");
  }

  console.error = () => undefined;
  shouldFail = true;
  const failed = service.persistPendingStateLocally({ ...state, artifactId: "quota-fixture" });
  if (failed.success || !failed.error?.includes("AUDIO_LOCAL_SAVE_FAILED")) {
    throw new Error("Local storage quota errors must be returned as an explicit save failure");
  }
} finally {
  console.error = originalConsoleError;
  if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
  else Reflect.deleteProperty(globalThis, "window");
}

console.log("Audio persistence tests passed: synchronous local flush and explicit storage-quota failure reporting.");
