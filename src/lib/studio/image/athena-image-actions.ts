import {
  ImageLayer,
  ImageOperation,
  ImageChangeSet,
  ImageLayerTextStyle,
  ImageLayerShapeStyle,
  ImageLayerAdjustments,
} from "./types";
import { imageService } from "./image-service";

export class AthenaImageActions {
  /**
   * Generates operations to center a specific layer on the canvas.
   */
  public centerLayer(
    layer: ImageLayer,
    canvasWidth: number,
    canvasHeight: number
  ): ImageOperation {
    const x = Math.round((canvasWidth - layer.transform.width) / 2);
    const y = Math.round((canvasHeight - layer.transform.height) / 2);

    return {
      type: "TRANSFORM_LAYER",
      layerId: layer.id,
      transform: { x, y },
    };
  }

  /**
   * Generates operations to scale a layer relative to its center.
   */
  public scaleLayer(layer: ImageLayer, scaleFactor: number): ImageOperation {
    const newWidth = Math.round(layer.transform.width * scaleFactor);
    const newHeight = Math.round(layer.transform.height * scaleFactor);
    const deltaX = Math.round((newWidth - layer.transform.width) / 2);
    const deltaY = Math.round((newHeight - layer.transform.height) / 2);

    return {
      type: "TRANSFORM_LAYER",
      layerId: layer.id,
      transform: {
        x: layer.transform.x - deltaX,
        y: layer.transform.y - deltaY,
        width: newWidth,
        height: newHeight,
      },
    };
  }

  /**
   * Generates operations to rotate a layer.
   */
  public rotateLayer(layer: ImageLayer, degrees: number): ImageOperation {
    return {
      type: "TRANSFORM_LAYER",
      layerId: layer.id,
      transform: {
        rotation: ((layer.transform.rotation || 0) + degrees) % 360,
      },
    };
  }

  /**
   * Creates a text layer.
   */
  public createTextLayer(
    text: string,
    x: number,
    y: number,
    style?: Partial<ImageLayerTextStyle>
  ): ImageLayer {
    return {
      id: `layer-text-${Date.now()}`,
      type: "TEXT",
      name: `Texto: ${text.slice(0, 16)}`,
      visible: true,
      locked: false,
      opacity: 1,
      transform: {
        x,
        y,
        width: 600,
        height: 100,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
      },
      textContent: text,
      textStyle: {
        fontFamily: style?.fontFamily || "sans-serif",
        fontSize: style?.fontSize || 36,
        fontWeight: style?.fontWeight || "bold",
        fill: style?.fill || "#ffffff",
        align: style?.align || "left",
        lineHeight: style?.lineHeight || 1.2,
      },
    };
  }

  /**
   * Creates a geometric shape layer.
   */
  public createShapeLayer(
    shapeType: "rectangle" | "ellipse" | "line",
    x: number,
    y: number,
    width: number,
    height: number,
    style?: Partial<ImageLayerShapeStyle>
  ): ImageLayer {
    return {
      id: `layer-shape-${Date.now()}`,
      type: "SHAPE",
      name: `Forma: ${shapeType}`,
      visible: true,
      locked: false,
      opacity: 1,
      transform: {
        x,
        y,
        width,
        height,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
      },
      shapeType,
      shapeStyle: {
        fill: style?.fill || "#2563eb",
        stroke: style?.stroke || "#3b82f6",
        strokeWidth: style?.strokeWidth ?? 2,
        borderRadius: style?.borderRadius ?? 8,
      },
    };
  }

  /**
   * Proposes an atomic ChangeSet proposal for an image artifact.
   */
  public proposeComposition(
    artifactId: string,
    title: string,
    summary: string,
    operations: ImageOperation[]
  ): ImageChangeSet {
    return imageService.proposeChangeSet(artifactId, title, summary, operations, "ATHENA");
  }
}

export const athenaImageActions = new AthenaImageActions();

