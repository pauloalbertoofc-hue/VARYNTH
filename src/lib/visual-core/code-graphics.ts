export type CodeGraphicShape = { type: "rect" | "circle" | "line" | "text"; x?: number; y?: number; width?: number; height?: number; radius?: number; x2?: number; y2?: number; value?: string; fill?: string; stroke?: string; strokeWidth?: number };
export type CodeGraphicDocument = { schema: "varynth.code-graphics"; version: 1; width: number; height: number; background: string; shapes: CodeGraphicShape[] };
import type { VisualDocument } from "./contracts";

const number = (value: unknown, fallback = 0) => typeof value === "number" && Number.isFinite(value) ? value : fallback;
const color = (value: unknown, fallback: string) => typeof value === "string" && /^#[0-9a-f]{3,8}$/i.test(value) ? value : fallback;

export function normalizeCodeGraphic(value: unknown): CodeGraphicDocument {
  const input = value && typeof value === "object" ? value as Partial<CodeGraphicDocument> : {};
  const shapes = Array.isArray(input.shapes) ? input.shapes.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const shape = item as CodeGraphicShape;
    if (!["rect", "circle", "line", "text"].includes(shape.type)) return [];
    return [{ ...shape, x: number(shape.x), y: number(shape.y), width: number(shape.width), height: number(shape.height), radius: number(shape.radius), x2: number(shape.x2), y2: number(shape.y2), value: typeof shape.value === "string" ? shape.value.slice(0, 500) : "", fill: color(shape.fill, "#ffffff"), stroke: color(shape.stroke, "#111827"), strokeWidth: Math.max(0, Math.min(32, number(shape.strokeWidth, 1))) }];
  }) : [];
  return { schema: "varynth.code-graphics", version: 1, width: Math.max(1, Math.min(4096, number(input.width, 800))), height: Math.max(1, Math.min(4096, number(input.height, 500))), background: color(input.background, "#111827"), shapes };
}

const esc = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
export function renderCodeGraphic(document: CodeGraphicDocument): string {
  const shapes = document.shapes.map((shape) => {
    const common = `fill="${shape.fill}" stroke="${shape.stroke}" stroke-width="${shape.strokeWidth}"`;
    if (shape.type === "rect") return `<rect x="${shape.x}" y="${shape.y}" width="${shape.width}" height="${shape.height}" ${common}/>`;
    if (shape.type === "circle") return `<circle cx="${shape.x}" cy="${shape.y}" r="${shape.radius}" ${common}/>`;
    if (shape.type === "line") return `<line x1="${shape.x}" y1="${shape.y}" x2="${shape.x2}" y2="${shape.y2}" ${common}/>`;
    return `<text x="${shape.x}" y="${shape.y}" ${common} font-family="sans-serif" font-size="${Math.max(8, shape.height || 24)}">${esc(shape.value || "")}</text>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${document.width} ${document.height}" width="${document.width}" height="${document.height}"><rect width="100%" height="100%" fill="${document.background}"/>${shapes}</svg>`;
}

/** Keeps declarative code-graphics editable when they enter Image Studio. */
export function codeGraphicToVisualDocument(document: CodeGraphicDocument, id = `code-graphic-${Date.now()}`): VisualDocument {
  const now = new Date().toISOString();
  return {
    schema: "varynth.visual-document",
    schemaVersion: 1,
    id,
    dimensions: { width: document.width, height: document.height, unit: "px" },
    color: { space: "sRGB", bitDepth: 8 },
    objects: document.shapes.map((shape, index) => ({
      id: `${id}-shape-${index + 1}`,
      kind: shape.type === "text" ? "TEXT" : "VECTOR",
      name: `${shape.type} ${index + 1}`,
      visible: true,
      locked: false,
      properties: { ...shape, source: "CODE_GRAPHICS_DECLARATIVE" },
    })),
    dependencies: [],
    provenance: [{ id: `${id}-provenance`, operation: "CREATE", description: "Created from declarative Code Graphics document", actor: "USER", createdAt: now, generated: false }],
    metadata: { source: "CODE_GRAPHICS", background: document.background, codeGraphics: document },
    updatedAt: now,
  };
}

