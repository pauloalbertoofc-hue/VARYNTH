import { capabilitiesFromTrack, webCameraAdapter, type CameraCapabilities, type CameraAdapter } from "./camera";

export interface CameraCapture {
  blob: Blob;
  mimeType: string;
  width: number;
  height: number;
  capturedAt: string;
  source: "DEVICE_CAMERA";
  generated: false;
}

export interface CameraVideoCapture {
  blob: Blob;
  mimeType: string;
  durationMs: number;
  capturedAt: string;
  source: "DEVICE_CAMERA";
  generated: false;
}

export class CameraSession {
  private stream: MediaStream | null = null;
  private video: HTMLVideoElement | null = null;
  private capabilities: CameraCapabilities | null = null;

  constructor(private readonly adapter: CameraAdapter = webCameraAdapter) {}

  async start(video: HTMLVideoElement, constraints: MediaStreamConstraints = { video: true, audio: false }): Promise<CameraCapabilities> {
    this.stop();
    this.stream = await this.adapter.requestStream(constraints);
    this.video = video;
    video.srcObject = this.stream;
    video.muted = true;
    await video.play();
    const track = this.stream.getVideoTracks()[0];
    this.capabilities = track ? capabilitiesFromTrack(track) : await this.adapter.getCapabilities();
    return this.capabilities;
  }

  getCapabilities(): CameraCapabilities | null {
    return this.capabilities;
  }

  async capture(): Promise<CameraCapture> {
    if (!this.video || !this.stream) throw new Error("CAMERA_SESSION_NOT_STARTED");
    const width = this.video.videoWidth;
    const height = this.video.videoHeight;
    if (!width || !height) throw new Error("CAMERA_FRAME_NOT_READY");
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d")?.drawImage(this.video, 0, 0, width, height);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((value) => value ? resolve(value) : reject(new Error("CAMERA_CAPTURE_FAILED")), "image/jpeg", 0.95);
    });
    return { blob, mimeType: "image/jpeg", width, height, capturedAt: new Date().toISOString(), source: "DEVICE_CAMERA", generated: false };
  }

  async recordVideo(durationMs = 5000): Promise<CameraVideoCapture> {
    if (!this.stream) throw new Error("CAMERA_SESSION_NOT_STARTED");
    if (typeof MediaRecorder === "undefined") throw new Error("CAMERA_VIDEO_UNSUPPORTED");
    const mimeType = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"].find((candidate) => MediaRecorder.isTypeSupported(candidate));
    if (!mimeType) throw new Error("CAMERA_VIDEO_FORMAT_UNSUPPORTED");
    const chunks: BlobPart[] = [];
    const recorder = new MediaRecorder(this.stream, { mimeType });
    const startedAt = Date.now();
    return await new Promise<CameraVideoCapture>((resolve, reject) => {
      const timer = window.setTimeout(() => recorder.stop(), Math.max(250, durationMs));
      recorder.addEventListener("dataavailable", (event) => { if (event.data.size) chunks.push(event.data); });
      recorder.addEventListener("error", () => { window.clearTimeout(timer); reject(new Error("CAMERA_VIDEO_RECORDING_FAILED")); });
      recorder.addEventListener("stop", () => {
        window.clearTimeout(timer);
        const blob = new Blob(chunks, { type: mimeType });
        if (!blob.size) { reject(new Error("CAMERA_VIDEO_EMPTY")); return; }
        resolve({ blob, mimeType, durationMs: Date.now() - startedAt, capturedAt: new Date().toISOString(), source: "DEVICE_CAMERA", generated: false });
      });
      recorder.start();
    });
  }

  stop(): void {
    if (this.stream) this.adapter.stopStream(this.stream);
    if (this.video) this.video.srcObject = null;
    this.stream = null;
    this.video = null;
    this.capabilities = null;
  }
}

