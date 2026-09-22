export interface WavContainerMetadata { durationMs: number; sampleRate: number; channels: number; bitsPerSample: number; }

/** Reads stable PCM/container facts from RIFF/WAVE without decoding audio into sample buffers. */
export function readWavAudioMetadata(data: ArrayBuffer): WavContainerMetadata | null {
  if (data.byteLength < 44) return null;
  const view = new DataView(data);
  const readText = (offset: number, length: number) => Array.from(new Uint8Array(data, offset, length), (byte) => String.fromCharCode(byte)).join("");
  if (readText(0, 4) !== "RIFF" || readText(8, 4) !== "WAVE") return null;
  let byteRate = 0;
  let dataSize = 0;
  let sampleRate = 0;
  let channels = 0;
  let bitsPerSample = 0;
  for (let offset = 12; offset + 8 <= data.byteLength;) {
    const chunkId = readText(offset, 4);
    const chunkSize = view.getUint32(offset + 4, true);
    const chunkStart = offset + 8;
    const chunkEnd = Math.min(data.byteLength, chunkStart + chunkSize);
    if (chunkId === "fmt " && chunkSize >= 16 && chunkStart + 16 <= data.byteLength) {
      channels = view.getUint16(chunkStart + 2, true);
      sampleRate = view.getUint32(chunkStart + 4, true);
      byteRate = view.getUint32(chunkStart + 8, true);
      bitsPerSample = view.getUint16(chunkStart + 14, true);
    }
    if (chunkId === "data") dataSize = Math.min(chunkSize, Math.max(0, data.byteLength - chunkStart));
    if (byteRate > 0 && dataSize > 0) break;
    const next = chunkStart + chunkSize + (chunkSize % 2);
    if (next <= offset || chunkEnd >= data.byteLength) break;
    offset = next;
  }
  const durationMs = byteRate > 0 ? dataSize / byteRate * 1000 : 0;
  if (![durationMs, sampleRate, channels, bitsPerSample].every(Number.isFinite) || durationMs <= 0 || sampleRate <= 0 || channels <= 0 || bitsPerSample <= 0) return null;
  return { durationMs, sampleRate, channels, bitsPerSample };
}

/** Backward-compatible duration helper for existing import callers. */
export function readWavDurationMs(data: ArrayBuffer): number | null {
  return readWavAudioMetadata(data)?.durationMs ?? null;
}

export async function probeAudioDurationMs(data: string | Blob | ArrayBuffer, mimeType: string): Promise<number | null> {
  if (data instanceof ArrayBuffer) {
    const wavDuration = readWavDurationMs(data);
    if (wavDuration !== null) return wavDuration;
  }
  if (typeof Blob !== "undefined" && data instanceof Blob) {
    try {
      const wavDuration = readWavDurationMs(await data.arrayBuffer());
      if (wavDuration !== null) return wavDuration;
    } catch {
      // Browser decoder fallback below may still identify compressed or legacy media.
    }
  }
  if (typeof window === "undefined" || typeof Audio === "undefined") return null;
  let url: string | undefined;
  try {
    url = typeof data === "string" ? data : URL.createObjectURL(data instanceof Blob ? data : new Blob([data], { type: mimeType }));
    const duration = await new Promise<number | null>((resolve) => {
      const audio = new Audio();
      const finish = (value: number | null) => { audio.removeAttribute("src"); audio.load(); resolve(value); };
      const timer = window.setTimeout(() => finish(null), 8000);
      audio.preload = "metadata";
      audio.onloadedmetadata = () => { window.clearTimeout(timer); finish(Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration * 1000 : null); };
      audio.onerror = () => { window.clearTimeout(timer); finish(null); };
      audio.src = url!;
    });
    return duration;
  } catch {
    return null;
  } finally {
    if (url && typeof data !== "string") URL.revokeObjectURL(url);
  }
}
