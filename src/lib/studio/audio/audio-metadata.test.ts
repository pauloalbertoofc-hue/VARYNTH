import { probeAudioDurationMs, readWavAudioMetadata, readWavDurationMs } from "./audio-metadata";

function wavWithPcm(sampleRate: number, channels: number, bitsPerSample: number, sampleCount: number): ArrayBuffer {
  const blockAlign = channels * bitsPerSample / 8;
  const dataSize = sampleCount * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const writeText = (offset: number, value: string) => Array.from(value).forEach((char, index) => view.setUint8(offset + index, char.charCodeAt(0)));
  writeText(0, "RIFF"); view.setUint32(4, 36 + dataSize, true); writeText(8, "WAVE");
  writeText(12, "fmt "); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
  view.setUint16(22, channels, true); view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true); view.setUint16(34, bitsPerSample, true); writeText(36, "data"); view.setUint32(40, dataSize, true);
  return buffer;
}

if (readWavDurationMs(wavWithPcm(44100, 1, 16, 4410)) !== 100) throw new Error("A duração PCM mono deve ser calculada pelo byteRate/data");
if (readWavDurationMs(wavWithPcm(48000, 2, 24, 24000)) !== 500) throw new Error("A duração PCM estéreo 24-bit deve ser calculada corretamente");
if (JSON.stringify(readWavAudioMetadata(wavWithPcm(44100, 1, 16, 4410))) !== JSON.stringify({ durationMs: 100, sampleRate: 44100, channels: 1, bitsPerSample: 16 })) throw new Error("WAV PCM mono deve expor duração, taxa, canais e bit depth exatos");
if (readWavAudioMetadata(wavWithPcm(48000, 2, 24, 24000))?.channels !== 2 || readWavAudioMetadata(wavWithPcm(48000, 2, 24, 24000))?.sampleRate !== 48000) throw new Error("WAV estéreo deve preservar taxa e canais reais");
if (readWavDurationMs(new ArrayBuffer(64)) !== null) throw new Error("Container que não é RIFF/WAVE deve retornar duração desconhecida");
void (async () => {
  const blobDuration = await probeAudioDurationMs(new Blob([wavWithPcm(8000, 1, 16, 800)]), "audio/wav");
  if (blobDuration !== 100) throw new Error("WAV blob legado deve fornecer a duração real sem exigir o decoder do navegador");
  console.log("Audio metadata tests passed: exact PCM WAV duration for mono/stereo/Blob and safe unknown-container handling.");
})();
