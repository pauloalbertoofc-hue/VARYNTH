export type ScientificImageReport = {
  width: number;
  height: number;
  pixels: number;
  histogram: number[];
  meanLuminance: number;
  standardDeviation: number;
  clippedShadowPercent: number;
  clippedHighlightPercent: number;
  alphaCoveragePercent: number;
  minLuminance: number;
  maxLuminance: number;
};

const luminance = (r: number, g: number, b: number) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

export function analyzeImageData(data: ImageData): ScientificImageReport {
  const histogram = Array.from({ length: 256 }, () => 0);
  let sum = 0;
  let sumSquared = 0;
  let shadows = 0;
  let highlights = 0;
  let alpha = 0;
  let min = 1;
  let max = 0;
  for (let index = 0; index < data.data.length; index += 4) {
    const value = luminance(data.data[index], data.data[index + 1], data.data[index + 2]);
    const bucket = Math.max(0, Math.min(255, Math.round(value * 255)));
    histogram[bucket] += 1;
    sum += value;
    sumSquared += value * value;
    if (bucket <= 1) shadows += 1;
    if (bucket >= 254) highlights += 1;
    if (data.data[index + 3] > 0) alpha += 1;
    min = Math.min(min, value);
    max = Math.max(max, value);
  }
  const pixels = data.width * data.height;
  const mean = pixels ? sum / pixels : 0;
  return { width: data.width, height: data.height, pixels, histogram, meanLuminance: mean, standardDeviation: Math.sqrt(Math.max(0, sumSquared / Math.max(1, pixels) - mean * mean)), clippedShadowPercent: pixels ? shadows / pixels * 100 : 0, clippedHighlightPercent: pixels ? highlights / pixels * 100 : 0, alphaCoveragePercent: pixels ? alpha / pixels * 100 : 0, minLuminance: pixels ? min : 0, maxLuminance: pixels ? max : 0 };
}

