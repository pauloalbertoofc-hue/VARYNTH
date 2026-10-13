export type RetouchParameters = {
  brightness: number;
  contrast: number;
  saturation: number;
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
