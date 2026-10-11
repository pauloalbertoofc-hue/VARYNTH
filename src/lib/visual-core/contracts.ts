import type { ImageDocumentState, ImageLayer, ImageLayerType } from "../studio/image/types";
import type { VisualProcessingGraph } from "./processing-graph";
import { validateProvenance } from "./provenance-engine";

export const VISUAL_DOCUMENT_SCHEMA = "varynth.visual-document" as const;
export const VISUAL_DOCUMENT_VERSION = 1 as const;

export type VisualOperationClass = "CAPTURE" | "ENHANCE" | "EDIT" | "CREATE" | "ANALYZE" | "PRODUCE";
export type VisualObjectKind = "RASTER" | "VECTOR" | "TEXT" | "PROCEDURAL" | "SHADER" | "SCENE_3D" | "GROUP";
export type VisualCapabilityState = "supported" | "unsupported" | "unknown" | "permission-required" | "temporarily-unavailable";

export interface VisualProvenanceEntry {
  id: string;
  operation: VisualOperationClass;
  description: string;
  actor: "USER" | "ATHENA" | "SYSTEM" | "DEVICE";
  createdAt: string;
  sourceAssetIds?: string[];
  derivedAssetIds?: string[];
  generated?: boolean;
}

export interface VisualDependency {
  id: string;
  kind: "asset" | "font" | "shader" | "plugin" | "runtime";
  optional: boolean;
  version?: string;
}

export interface VisualObject {
  id: string;
  kind: VisualObjectKind;
  name: string;
  visible: boolean;
  locked: boolean;
  properties: Record<string, unknown>;
  children?: string[];
}

export interface VisualDocument {
  schema: typeof VISUAL_DOCUMENT_SCHEMA;
  schemaVersion: typeof VISUAL_DOCUMENT_VERSION;
  id: string;
  dimensions: { width: number; height: number; unit: "px" | "mm" | "in" | "pt" };
  color: { space: string; bitDepth: 8 | 16 | 32; profile?: string };
  objects: VisualObject[];
  dependencies: VisualDependency[];
  processingGraph?: VisualProcessingGraph;
  provenance: VisualProvenanceEntry[];
  metadata: Record<string, unknown>;
  updatedAt: string;
}

export interface VisualCapability {
  id: string;
  label: string;
  state: VisualCapabilityState;
  reason?: string;
}

export function appendVisualProvenance(document: VisualDocument, entry: Omit<VisualProvenanceEntry, "id" | "createdAt"> & { id?: string; createdAt?: string }): VisualDocument {
  return {
    ...document,
    provenance: [...document.provenance, { ...entry, id: entry.id ?? `prov-${Date.now()}`, createdAt: entry.createdAt ?? new Date().toISOString() }],
    updatedAt: entry.createdAt ?? new Date().toISOString(),
  };
}

export function assertVisualDocument(value: unknown): asserts value is VisualDocument {
  if (!value || typeof value !== "object") throw new Error("INVALID_VISUAL_DOCUMENT");
  const candidate = value as Partial<VisualDocument>;
  if (candidate.schema !== VISUAL_DOCUMENT_SCHEMA || candidate.schemaVersion !== VISUAL_DOCUMENT_VERSION) {
    throw new Error("UNSUPPORTED_VISUAL_DOCUMENT_SCHEMA");
  }
  if (!candidate.id || !candidate.dimensions || !Array.isArray(candidate.objects)) {
    throw new Error("MALFORMED_VISUAL_DOCUMENT");
  }
  if (!Array.isArray(candidate.provenance) || !validateProvenance(candidate.provenance).valid) {
    throw new Error("INVALID_VISUAL_DOCUMENT_PROVENANCE");
  }
}

export function migrateVisualDocument(value: unknown): VisualDocument {
  if (value && typeof value === "object" && (value as Partial<VisualDocument>).schema === VISUAL_DOCUMENT_SCHEMA) {
    assertVisualDocument(value);
    return value;
  }
  if (value && typeof value === "object" && "artifactId" in value && "canvas" in value && "layers" in value) {
    return visualDocumentFromImage(value as ImageDocumentState);
  }
  throw new Error("UNSUPPORTED_VISUAL_DOCUMENT_MIGRATION");
}

export function visualDocumentFromImage(image: ImageDocumentState): VisualDocument {
  return {
    schema: VISUAL_DOCUMENT_SCHEMA,
    schemaVersion: VISUAL_DOCUMENT_VERSION,
    id: image.artifactId,
    dimensions: { width: image.canvas.width, height: image.canvas.height, unit: "px" },
    color: { space: "sRGB", bitDepth: 8 },
    objects: image.layers.map((layer) => ({
      id: layer.id,
      kind: layer.type === "IMAGE" ? "RASTER" : layer.type === "TEXT" ? "TEXT" : layer.type === "GROUP" ? "GROUP" : "VECTOR",
      name: layer.name,
      visible: layer.visible,
      locked: layer.locked,
      properties: { ...layer },
      children: layer.type === "GROUP" ? image.layers.filter((child) => child.parentGroupId === layer.id).map((child) => child.id) : undefined,
    })),
    dependencies: image.layers.flatMap((layer) => layer.assetId ? [{ id: layer.assetId, kind: "asset" as const, optional: false }] : []),
    provenance: Array.isArray((image as ImageDocumentState & { visualProvenance?: VisualProvenanceEntry[] }).visualProvenance)
      ? (image as ImageDocumentState & { visualProvenance?: VisualProvenanceEntry[] }).visualProvenance!
      : [{ id: `migration-${image.artifactId}`, operation: "EDIT", description: "Migrated from Image Studio document state", actor: "SYSTEM", createdAt: image.updatedAt }],
    metadata: { source: "IMAGE_STUDIO", selectedLayerIds: image.selectedLayerIds, canvasBackground: image.canvas.background },
    updatedAt: image.updatedAt,
  };
}

export function imageFromVisualDocument(document: VisualDocument): ImageDocumentState {
  assertVisualDocument(document);
  const layers: ImageLayer[] = document.objects.map((object) => {
    const properties = object.properties as Partial<ImageLayer>;
    return {
      ...(properties as ImageLayer),
      id: object.id,
      name: object.name,
      visible: object.visible,
      locked: object.locked,
      type: (object.kind === "RASTER" ? "IMAGE" : object.kind === "TEXT" ? "TEXT" : object.kind === "GROUP" ? "GROUP" : "SHAPE") as ImageLayerType,
    };
  });
  for (const object of document.objects) {
    for (const childId of object.children ?? []) {
      const child = layers.find((layer) => layer.id === childId);
      if (child) child.parentGroupId = object.id;
    }
  }
  return {
    artifactId: document.id,
    canvas: { width: document.dimensions.width, height: document.dimensions.height, background: String(document.metadata.canvasBackground ?? "#0b0c16") },
    layers,
    selectedLayerIds: Array.isArray(document.metadata.selectedLayerIds) ? document.metadata.selectedLayerIds.filter((id): id is string => typeof id === "string") : [],
    updatedAt: document.updatedAt,
    visualProvenance: document.provenance,
  };
}

