import { cubicBezierPath } from "./vector-geometry";

export type RenderableVectorObject = {
  id: string;
  type: "rect" | "circle" | "text" | "bezier";
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  color2?: string;
  gradient?: boolean;
  text?: string;
};

const escapeXml = (value: string) =>
  value.replace(
    /[<>&'\"]/g,
    (character) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        "'": "&apos;",
        '"': "&quot;",
      })[character] ?? character,
  );
const safeToken = (value: string) =>
  value.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80) || "vector";
const safeColor = (value: string) =>
  /^#[0-9a-fA-F]{3,8}$/.test(value) ? value : "#000000";
const paint = (item: RenderableVectorObject) =>
  item.gradient && (item.type === "rect" || item.type === "circle")
    ? `url(#gradient-${safeToken(item.id)})`
    : safeColor(item.color);

export function renderVectorSvg(
  objects: RenderableVectorObject[],
  width = 1200,
  height = 700,
): string {
  const defs = objects
    .filter(
      (item) =>
        item.gradient && (item.type === "rect" || item.type === "circle"),
    )
    .map(
      (item) =>
        `<linearGradient id="gradient-${safeToken(item.id)}" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${safeColor(item.color)}"/><stop offset="100%" stop-color="${safeColor(item.color2 ?? item.color)}"/></linearGradient>`,
    )
    .join("");
  const content = objects
    .map((item) =>
      item.type === "rect"
        ? `<rect x="${item.x}" y="${item.y}" width="${item.width}" height="${item.height}" fill="${paint(item)}"/>`
        : item.type === "circle"
          ? `<circle cx="${item.x + item.width / 2}" cy="${item.y + item.height / 2}" r="${Math.min(item.width, item.height) / 2}" fill="${paint(item)}"/>`
          : item.type === "bezier"
            ? `<path d="${cubicBezierPath(item)}" fill="none" stroke="${safeColor(item.color)}" stroke-width="8" stroke-linecap="round"/>`
            : `<text x="${item.x}" y="${item.y + item.height / 2}" fill="${safeColor(item.color)}" font-family="sans-serif" font-size="${Math.max(18, item.height / 2)}">${escapeXml(item.text ?? "")}</text>`,
    )
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"><defs>${defs}</defs>${content}</svg>`;
}
