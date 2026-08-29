import { Artifact, ArtifactActor } from "../../artifacts/types";

export type ImageDocumentMode = "RASTER" | "COMPOSITE";

export type ImageLayerType =
  | "IMAGE"
  | "TEXT"
  | "SHAPE"
  | "GROUP"
  | "BACKGROUND";

export type ImageExportFormat = "PNG" | "JPEG" | "WEBP";

export interface LayerCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayerTransform {
  x: number;
  y: number;
  width: number;
  height: number;
  scaleX: number;
  scaleY: number;
  rotation: number; // In degrees
  crop?: LayerCrop;
}

export interface ImageLayerTextStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: string | number;
  fill: string;
  align: "left" | "center" | "right";
  lineHeight: number;
}

export interface ImageLayerShapeStyle {
  fill: string;
  stroke: string;
  strokeWidth: number;
  borderRadius?: number;
}

export interface ImageLayerAdjustments {
  brightness?: number; // -100 to 100
  contrast?: number;   // -100 to 100
  saturation?: number; // -100 to 100
  grayscale?: number;  // 0 to 100
}

export interface ImageLayer {
  id: string;
  type: ImageLayerType;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number; // 0 to 1
  transform: LayerTransform;
  parentGroupId?: string;
  assetId?: string;
  textContent?: string;
  textStyle?: ImageLayerTextStyle;
  shapeType?: "rectangle" | "ellipse" | "line";
  shapeStyle?: ImageLayerShapeStyle;
  adjustments?: ImageLayerAdjustments;
  metadata?: Record<string, unknown>;
}

export interface ImageCanvasConfig {
  width: number;
  height: number;
  background: string;
}

export interface ImageDocumentState {
  artifactId: string;
  canvas: ImageCanvasConfig;
  layers: ImageLayer[];
  selectedLayerIds: string[];
  updatedAt: string;
}

export interface ImageMetadata {
  width: number;
  height: number;
  format?: string;
  colorSpace?: string;
  transparent?: boolean;
  sourceAssetId?: string;
  renderedAssetId?: string;
  canvasBackground?: string;
  documentMode?: ImageDocumentMode;
}

export interface ImageItem {
  artifact: Artifact;
  metadata: ImageMetadata;
  documentState: ImageDocumentState;
}

export type ImageOperation =
  | { type: "ADD_LAYER"; layer: ImageLayer }
  | { type: "REMOVE_LAYER"; layerId: string }
  | { type: "TRANSFORM_LAYER"; layerId: string; transform: Partial<LayerTransform> }
  | { type: "UPDATE_TEXT"; layerId: string; textContent: string; textStyle?: Partial<ImageLayerTextStyle> }
  | { type: "REORDER_LAYERS"; layerIds: string[] }
  | { type: "ADJUST_CANVAS"; canvas: Partial<ImageCanvasConfig> }
  | { type: "SET_LAYER_PROPERTIES"; layerId: string; properties: Partial<ImageLayer> };

export interface ImageChangeSet {
  id: string;
  artifactId: string;
  title: string;
  summary: string;
  operations: ImageOperation[];
  createdBy: "ATHENA" | "USER";
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  createdAt: string;
}

export interface ImageExportOptions {
  format: ImageExportFormat;
  quality: number; // 0.1 to 1.0
  scale: number;   // 0.5, 1, 2, 4
  transparentBackground?: boolean;
  dimensions?: { width: number; height: number };
}

export interface ImageExportResult {
  success: boolean;
  format: ImageExportFormat;
  assetId?: string;
  dataUrl?: string;
  blob?: Blob;
  sizeBytes?: number;
  dimensions: { width: number; height: number };
  jobId?: string;
  error?: string;
}

export interface ImageCommandHistoryState {
  past: ImageDocumentState[];
  future: ImageDocumentState[];
}

