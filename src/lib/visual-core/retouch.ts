export type RetouchParameters = {
  brightness: number;
  contrast: number;
  saturation: number;
};
export type CloneStampParameters = {
  sourceX: number;
  sourceY: number;
  destinationX: number;
  destinationY: number;
  radius: number;
  opacity: number;
};
export type RetouchLook = "natural" | "editorial" | "noir" | "clean" | "custom";
export const RETOUCH_LOOKS: Record<
  RetouchLook,
  { label: string; parameters: RetouchParameters }
> = {
  natural: {
    label: "Natural",
    parameters: { brightness: 0, contrast: 0, saturation: 1 },
  },
  editorial: {
    label: "Editorial",
    parameters: { brightness: 0.04, contrast: 0.14, saturation: 0.92 },
  },
  noir: {
    label: "Noir",
    parameters: { brightness: -0.03, contrast: 0.22, saturation: 0 },
  },
  clean: {
    label: "Clean",
    parameters: { brightness: 0.03, contrast: 0.05, saturation: 1.08 },
  },
  custom: {
    label: "Personalizado",
    parameters: { brightness: 0, contrast: 0, saturation: 1 },
  },
};
const finite = (value: number | undefined, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;
export function normalizeRetouchParameters(
  input: Partial<RetouchParameters> = {},
): RetouchParameters {
  return {
    brightness: Math.max(-1, Math.min(1, finite(input.brightness, 0))),
    contrast: Math.max(-1, Math.min(1, finite(input.contrast, 0))),
    saturation: Math.max(0, Math.min(2, finite(input.saturation, 1))),
  };
}
export function applyRetouchBuffer(
  source: Uint8ClampedArray,
  input: Partial<RetouchParameters>,
): Uint8ClampedArray {
  const parameters = normalizeRetouchParameters(input);
  const result = new Uint8ClampedArray(source);
  const contrast = (1 + parameters.contrast) ** 2;
  for (let index = 0; index < result.length; index += 4) {
    const red = result[index] / 255;
    const green = result[index + 1] / 255;
    const blue = result[index + 2] / 255;
    const luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722;
    const adjust = (value: number) =>
      Math.max(
        0,
        Math.min(1, (value + parameters.brightness - 0.5) * contrast + 0.5),
      );
    const nextLuminance = adjust(luminance);
    const scale = luminance > 0 ? nextLuminance / luminance : 0;
    result[index] =
      adjust(
        nextLuminance + (red * scale - nextLuminance) * parameters.saturation,
      ) * 255;
    result[index + 1] =
      adjust(
        nextLuminance + (green * scale - nextLuminance) * parameters.saturation,
      ) * 255;
    result[index + 2] =
      adjust(
        nextLuminance + (blue * scale - nextLuminance) * parameters.saturation,
      ) * 255;
  }
  return result;
}
export function applyRetouch(
  data: ImageData,
  input: Partial<RetouchParameters>,
): ImageData {
  const output = applyRetouchBuffer(data.data, input);
  return new ImageData(output as ImageDataArray, data.width, data.height);
}

export function applyCloneStamp(
  data: ImageData,
  input: Partial<CloneStampParameters>,
): ImageData {
  const sourceX = Math.round(finite(input.sourceX, 0));
  const sourceY = Math.round(finite(input.sourceY, 0));
  const destinationX = Math.round(finite(input.destinationX, 0));
  const destinationY = Math.round(finite(input.destinationY, 0));
  const radius = Math.max(
    1,
    Math.min(
      Math.max(data.width, data.height),
      Math.round(finite(input.radius, 32)),
    ),
  );
  const opacity = Math.max(0, Math.min(1, finite(input.opacity, 1)));
  const result = new Uint8ClampedArray(data.data);
  for (let y = -radius; y <= radius; y += 1) {
    for (let x = -radius; x <= radius; x += 1) {
      if (x * x + y * y > radius * radius) continue;
      const targetX = destinationX + x;
      const targetY = destinationY + y;
      const sampleX = sourceX + x;
      const sampleY = sourceY + y;
      if (
        targetX < 0 ||
        targetY < 0 ||
        targetX >= data.width ||
        targetY >= data.height ||
        sampleX < 0 ||
        sampleY < 0 ||
        sampleX >= data.width ||
        sampleY >= data.height
      )
        continue;
      const target = (targetY * data.width + targetX) * 4;
      const sample = (sampleY * data.width + sampleX) * 4;
      result[target] =
        result[target] * (1 - opacity) + data.data[sample] * opacity;
      result[target + 1] =
        result[target + 1] * (1 - opacity) + data.data[sample + 1] * opacity;
      result[target + 2] =
        result[target + 2] * (1 - opacity) + data.data[sample + 2] * opacity;
      result[target + 3] = data.data[sample + 3];
    }
  }
  return new ImageData(result as ImageDataArray, data.width, data.height);
}
