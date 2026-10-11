export interface RasterMask { width: number; height: number; data: Uint8ClampedArray }

export function createMask(width: number, height: number, value = 0): RasterMask {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) throw new Error("INVALID_MASK_DIMENSIONS");
  return { width, height, data: new Uint8ClampedArray(width * height).fill(Math.max(0, Math.min(255, value))) };
}

export function invertMask(mask: RasterMask): RasterMask {
  return { ...mask, data: Uint8ClampedArray.from(mask.data, (value) => 255 - value) };
}

export function combineMasks(first: RasterMask, second: RasterMask, mode: "multiply" | "max" | "min"): RasterMask {
  if (first.width !== second.width || first.height !== second.height) throw new Error("MASK_DIMENSION_MISMATCH");
  const data = new Uint8ClampedArray(first.data.length);
  for (let i = 0; i < data.length; i++) {
    data[i] = mode === "multiply" ? Math.round(first.data[i] * second.data[i] / 255) : mode === "max" ? Math.max(first.data[i], second.data[i]) : Math.min(first.data[i], second.data[i]);
  }
  return { width: first.width, height: first.height, data };
}

