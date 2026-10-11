export interface CameraQualityReport {
  sharpness: { score: number; confidence: number };
  exposure: { meanLuma: number; clippedHighlights: number; clippedShadows: number; confidence: number };
  warnings: string[];
}

/** Computes conservative, device-local metrics; it never reconstructs or changes pixels. */
export async function analyzeCameraFrame(blob: Blob): Promise<CameraQualityReport> {
  if (typeof document === "undefined") throw new Error("CAMERA_ANALYSIS_REQUIRES_BROWSER");
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  const width = Math.min(bitmap.width, 512);
  const height = Math.max(1, Math.round(bitmap.height * (width / bitmap.width)));
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("CAMERA_ANALYSIS_UNAVAILABLE");
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const pixels = context.getImageData(0, 0, width, height).data;
  let lumaSum = 0;
  let highlights = 0;
  let shadows = 0;
  let gradient = 0;
  let samples = 0;
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const i = (y * width + x) * 4;
      const luma = (0.2126 * pixels[i] + 0.7152 * pixels[i + 1] + 0.0722 * pixels[i + 2]) / 255;
      lumaSum += luma;
      if (luma >= 0.98) highlights++;
      if (luma <= 0.02) shadows++;
      if (x + 2 < width) {
        const next = (y * width + x + 2) * 4;
        gradient += Math.abs(luma - ((0.2126 * pixels[next] + 0.7152 * pixels[next + 1] + 0.0722 * pixels[next + 2]) / 255));
      }
      samples++;
    }
  }
  const meanLuma = lumaSum / samples;
  const clippedHighlights = highlights / samples;
  const clippedShadows = shadows / samples;
  const sharpnessScore = Math.min(1, gradient / Math.max(1, samples) * 8);
  const warnings = [
    ...(clippedHighlights > 0.05 ? ["Highlights clipped em parte do frame."] : []),
    ...(clippedShadows > 0.05 ? ["Sombras muito próximas do preto."] : []),
    ...(sharpnessScore < 0.08 ? ["Nitidez baixa ou assunto sem textura suficiente para estimativa."] : []),
  ];
  return {
    sharpness: { score: sharpnessScore, confidence: Math.min(1, samples / 20000) },
    exposure: { meanLuma, clippedHighlights, clippedShadows, confidence: Math.min(1, samples / 20000) },
    warnings,
  };
}

