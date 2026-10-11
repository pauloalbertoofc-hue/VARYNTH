export interface RgbColor { r: number; g: number; b: number; a: number }

const clamp = (value: number) => Math.max(0, Math.min(255, Math.round(value)));

export function parseHexColor(input: string): RgbColor | null {
  const value = input.trim().replace(/^#/, "");
  if (![3, 4, 6, 8].includes(value.length) || !/^[\da-f]+$/i.test(value)) return null;
  const expanded = value.length <= 4 ? value.split("").map((char) => char + char).join("") : value;
  const hasAlpha = expanded.length === 8;
  return { r: parseInt(expanded.slice(0, 2), 16), g: parseInt(expanded.slice(2, 4), 16), b: parseInt(expanded.slice(4, 6), 16), a: hasAlpha ? parseInt(expanded.slice(6, 8), 16) / 255 : 1 };
}

export function formatHexColor(color: RgbColor): string {
  const channel = (value: number) => clamp(value).toString(16).padStart(2, "0");
  const alpha = Math.round(Math.max(0, Math.min(1, color.a)) * 255);
  return `#${channel(color.r)}${channel(color.g)}${channel(color.b)}${alpha < 255 ? channel(alpha) : ""}`;
}

export function mixColors(first: RgbColor, second: RgbColor, amount: number): RgbColor {
  const t = Math.max(0, Math.min(1, amount));
  return { r: first.r + (second.r - first.r) * t, g: first.g + (second.g - first.g) * t, b: first.b + (second.b - first.b) * t, a: first.a + (second.a - first.a) * t };
}

export function relativeLuminance(color: RgbColor): number {
  const linear = (channel: number) => { const value = channel / 255; return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * linear(color.r) + 0.7152 * linear(color.g) + 0.0722 * linear(color.b);
}

