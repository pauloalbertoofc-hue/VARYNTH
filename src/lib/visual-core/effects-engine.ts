import type { RgbColor } from "./color-engine";

export function alphaComposite(background: RgbColor, foreground: RgbColor): RgbColor {
  const alpha = foreground.a + background.a * (1 - foreground.a);
  if (alpha === 0) return { r: 0, g: 0, b: 0, a: 0 };
  return {
    r: (foreground.r * foreground.a + background.r * background.a * (1 - foreground.a)) / alpha,
    g: (foreground.g * foreground.a + background.g * background.a * (1 - foreground.a)) / alpha,
    b: (foreground.b * foreground.a + background.b * background.a * (1 - foreground.a)) / alpha,
    a: alpha,
  };
}

export function grayscale(color: RgbColor): RgbColor {
  const value = 0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b;
  return { r: value, g: value, b: value, a: color.a };
}

export function applyOpacity(color: RgbColor, opacity: number): RgbColor {
  return { ...color, a: color.a * Math.max(0, Math.min(1, opacity)) };
}

