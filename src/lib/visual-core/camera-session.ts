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

  stop(): void {
    if (this.stream) this.adapter.stopStream(this.stream);
    if (this.video) this.video.srcObject = null;
    this.stream = null;
    this.video = null;
    this.capabilities = null;
  }
}

