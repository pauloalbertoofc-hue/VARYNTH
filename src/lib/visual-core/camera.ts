import type { VisualCapability, VisualCapabilityState } from "./contracts";

export interface CameraCapabilities {
  camera: VisualCapability;
  video: VisualCapability;
  audio: VisualCapability;
  torch: VisualCapability;
  zoom: VisualCapability;
  focus: VisualCapability;
  raw: VisualCapability;
}

export interface CameraAdapter {
  getCapabilities(): Promise<CameraCapabilities>;
  requestStream(options?: MediaStreamConstraints): Promise<MediaStream>;
  stopStream(stream: MediaStream): void;
}

function capability(id: string, label: string, state: VisualCapabilityState, reason?: string): VisualCapability {
  return { id, label, state, ...(reason ? { reason } : {}) };
}

export function normalizeCameraError(error: unknown): Error {
  const name = error instanceof DOMException ? error.name : error && typeof error === "object" && "name" in error ? String((error as { name?: unknown }).name) : "";
  const code = name === "NotAllowedError" || name === "SecurityError"
    ? "CAMERA_PERMISSION_REQUIRED"
    : name === "NotFoundError"
      ? "CAMERA_NOT_FOUND"
      : name === "NotReadableError" || name === "AbortError"
        ? "CAMERA_TEMPORARILY_UNAVAILABLE"
        : name === "OverconstrainedError"
          ? "CAMERA_CONSTRAINT_UNAVAILABLE"
          : null;
  return code ? new Error(code) : error instanceof Error ? error : new Error("CAMERA_START_FAILED");
}

export function detectCameraCapabilities(scope: typeof globalThis = globalThis): CameraCapabilities {
  const navigatorLike = scope.navigator;
  const mediaDevices = navigatorLike?.mediaDevices as (MediaDevices & { getUserMedia?: (constraints: MediaStreamConstraints) => Promise<MediaStream> }) | undefined;
  const cameraState: VisualCapabilityState = mediaDevices?.getUserMedia ? "unknown" : "unsupported";
  const cameraReason = mediaDevices?.getUserMedia ? "Permission has not been requested." : "MediaDevices.getUserMedia is unavailable.";
  return {
    camera: capability("camera", "Camera", cameraState, cameraReason),
    video: capability("video", "Video capture", cameraState, cameraReason),
    audio: capability("audio", "Audio capture", cameraState, cameraReason),
    torch: capability("torch", "Torch", "unknown", "The browser reports torch support only after a live track is created."),
    zoom: capability("zoom", "Optical/digital zoom", "unknown", "Zoom must be read from the active video track capabilities."),
    focus: capability("focus", "Focus control", "unknown", "Focus must be read from the active video track capabilities."),
    raw: capability("raw", "RAW/DNG capture", "unsupported", "The Web Camera Adapter does not expose RAW/DNG capture."),
  };
}

export function capabilitiesFromTrack(track: MediaStreamTrack): CameraCapabilities {
  const capabilities = typeof track.getCapabilities === "function" ? track.getCapabilities() as MediaTrackCapabilities & { torch?: boolean; zoom?: unknown; focusMode?: unknown } : {};
  const has = (value: unknown) => value !== undefined && value !== false;
  const camera = capability("camera", "Camera", "supported");
  return {
    camera,
    video: capability("video", "Video capture", "supported"),
    audio: capability("audio", "Audio capture", "unsupported", "The active track is not an audio track."),
    torch: capability("torch", "Torch", has(capabilities.torch) ? "supported" : "unsupported", has(capabilities.torch) ? undefined : "The active track does not expose torch control."),
    zoom: capability("zoom", "Optical/digital zoom", has(capabilities.zoom) ? "supported" : "unsupported", has(capabilities.zoom) ? undefined : "The active track does not expose zoom control."),
    focus: capability("focus", "Focus control", has(capabilities.focusMode) ? "supported" : "unsupported", has(capabilities.focusMode) ? undefined : "The active track does not expose focus control."),
    raw: capability("raw", "RAW/DNG capture", "unsupported", "The Web Camera Adapter does not expose RAW/DNG capture."),
  };
}

export const webCameraAdapter: CameraAdapter = {
  async getCapabilities() {
    return detectCameraCapabilities();
  },
  async requestStream(options = { video: true, audio: false }) {
    if (!globalThis.navigator?.mediaDevices?.getUserMedia) {
      throw new Error("CAMERA_UNSUPPORTED");
    }
    try {
      return await globalThis.navigator.mediaDevices.getUserMedia(options);
    } catch (error) {
      throw normalizeCameraError(error);
    }
  },
  stopStream(stream) {
    stream.getTracks().forEach((track) => track.stop());
  },
};

