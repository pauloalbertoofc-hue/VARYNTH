export type CinematicLightingParameters = {
  exposure: number;
  contrast: number;
  warmth: number;
  tint: number;
  vignette: number;
};

export type CinematicLightingLook =
  "natural" | "cinematic" | "noir" | "golden" | "custom";

export const CINEMATIC_LIGHTING_LOOKS: Record<
  CinematicLightingLook,
  { label: string; parameters: CinematicLightingParameters }
> = {
  natural: {
    label: "Natural",
    parameters: { exposure: 0, contrast: 0, warmth: 0, tint: 0, vignette: 0 },
  },
  cinematic: {
    label: "Cinematic",
    parameters: {
      exposure: 0.02,
      contrast: 0.16,
      warmth: -0.04,
      tint: 0.02,
      vignette: 0.18,
    },
  },
  noir: {
    label: "Noir",
    parameters: {
      exposure: -0.04,
      contrast: 0.28,
      warmth: -0.08,
      tint: 0,
      vignette: 0.32,
    },
  },
  golden: {
    label: "Golden Glow",
    parameters: {
      exposure: 0.04,
      contrast: 0.08,
      warmth: 0.2,
      tint: 0.03,
      vignette: 0.08,
    },
  },
  custom: {
    label: "Personalizado",
    parameters: { exposure: 0, contrast: 0, warmth: 0, tint: 0, vignette: 0 },
  },
};

const finite = (value: number | undefined, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

export function normalizeCinematicLightingParameters(
  input: Partial<CinematicLightingParameters> = {},
): CinematicLightingParameters {
  return {
    exposure: Math.max(-1, Math.min(1, finite(input.exposure, 0))),
    contrast: Math.max(-1, Math.min(1, finite(input.contrast, 0))),
    warmth: Math.max(-1, Math.min(1, finite(input.warmth, 0))),
    tint: Math.max(-1, Math.min(1, finite(input.tint, 0))),
    vignette: Math.max(0, Math.min(1, finite(input.vignette, 0))),
  };
}

export function applyCinematicLightingBuffer(
  source: Uint8ClampedArray,
  input: Partial<CinematicLightingParameters>,
  width: number,
  height: number,
): Uint8ClampedArray {
  const parameters = normalizeCinematicLightingParameters(input);
  const result = new Uint8ClampedArray(source);
  const contrast = (1 + parameters.contrast) ** 2;
  const centerX = Math.max(1, width - 1) / 2;
  const centerY = Math.max(1, height - 1) / 2;
  const maxDistance = Math.sqrt(centerX ** 2 + centerY ** 2);
  for (let index = 0; index < result.length; index += 4) {
    const pixel = index / 4;
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    const distance = Math.sqrt(
      ((x - centerX) / maxDistance) ** 2 + ((y - centerY) / maxDistance) ** 2,
    );
    const falloff = Math.max(
      0,
      1 - parameters.vignette * Math.min(1, distance),
    );
    const adjust = (value: number) =>
      Math.max(
        0,
        Math.min(
          1,
          (value * falloff + parameters.exposure - 0.5) * contrast + 0.5,
        ),
      );
    const red = result[index] / 255;
    const green = result[index + 1] / 255;
    const blue = result[index + 2] / 255;
    const warmth = parameters.warmth;
    const tint = parameters.tint;
    result[index] = adjust(red + warmth * 0.12 + tint * 0.04) * 255;
    result[index + 1] = adjust(green + warmth * 0.02 - tint * 0.08) * 255;
    result[index + 2] = adjust(blue - warmth * 0.12 + tint * 0.04) * 255;
  }
  return result;
}

export function applyCinematicLighting(
  data: ImageData,
  input: Partial<CinematicLightingParameters>,
): ImageData {
  return new ImageData(
    applyCinematicLightingBuffer(
      data.data,
      input,
      data.width,
      data.height,
    ) as ImageDataArray,
    data.width,
    data.height,
  );
}
