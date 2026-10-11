"use client";

import React, { useState, useRef, useEffect } from "react";
import { ImageDocumentState, ImageLayer } from "@/lib/studio/image/types";
import { assetManager } from "@/lib/artifacts/asset-manager";
import { ZoomIn, ZoomOut, Maximize2, AlertTriangle, Image as ImageIcon } from "lucide-react";

interface ImageCanvasProps {
  documentState: ImageDocumentState;
  selectedLayerId?: string;
  onSelectLayer: (layerId?: string) => void;
  onUpdateLayerTransform: (layerId: string, transform: Partial<ImageLayer["transform"]>) => void;
}

export function ImageCanvas({
  documentState,
  selectedLayerId,
  onSelectLayer,
  onUpdateLayerTransform,
}: ImageCanvasProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const [missingAssetIds, setMissingAssetIds] = useState<Set<string>>(new Set());

  const containerRef = useRef<HTMLDivElement>(null);

  // Check missing assets for image layers
  useEffect(() => {
    const missing = new Set<string>();
    for (const layer of documentState.layers) {
      if (layer.type === "IMAGE" && layer.assetId) {
        const asset = assetManager.getAsset(layer.assetId);
        if (!asset) missing.add(layer.assetId);
      }
    }
    setMissingAssetIds(missing);
  }, [documentState.layers]);

  const handleZoomIn = () => setZoom((prev) => Math.min(3, prev + 0.15));
  const handleZoomOut = () => setZoom((prev) => Math.max(0.2, prev - 0.15));
  const handleFitScreen = () => {
    if (containerRef.current) {
      const { clientWidth, clientHeight } = containerRef.current;
      const scaleX = (clientWidth - 60) / documentState.canvas.width;
      const scaleY = (clientHeight - 60) / documentState.canvas.height;
      setZoom(Math.min(scaleX, scaleY, 1));
      setPan({ x: 0, y: 0 });
    }
  };

  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const selectedLayer = documentState.layers.find((l) => l.id === selectedLayerId);

  return (
    <div
      ref={containerRef}
      className="relative flex h-full flex-1 select-none items-center justify-center overflow-hidden bg-[var(--vly-world)]"
      style={{ touchAction: "none" }}
      onPointerDown={(e) => {
        if (e.target === containerRef.current || (e.target as HTMLElement).id === "canvas-backdrop") {
          onSelectLayer(undefined);
          if (e.pointerType === "touch" || e.button === 1 || e.altKey || e.buttons === 1) {
            setIsPanning(true);
            setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
            try {
              (e.target as HTMLElement).setPointerCapture(e.pointerId);
            } catch {
              // ignore
            }
          }
        }
      }}
      onPointerMove={(e) => {
        if (isPanning) {
          setPan({ x: e.clientX - startPan.x, y: e.clientY - startPan.y });
        }
      }}
      onPointerUp={(e) => {
        setIsPanning(false);
        try {
          if ((e.target as HTMLElement).hasPointerCapture(e.pointerId)) {
            (e.target as HTMLElement).releasePointerCapture(e.pointerId);
          }
        } catch {
          // ignore
        }
      }}
      onPointerCancel={(e) => {
        setIsPanning(false);
        try {
          if ((e.target as HTMLElement).hasPointerCapture(e.pointerId)) {
            (e.target as HTMLElement).releasePointerCapture(e.pointerId);
          }
        } catch {
          // ignore
        }
      }}
    >
      {/* Zoom / Navigation Overlay Controls */}
      <div className="absolute right-4 top-4 z-20 flex items-center gap-1.5 rounded-xl border border-[var(--vly-border-strong)] bg-[var(--vly-surface-floating)] p-1.5 text-xs text-[var(--vly-text-secondary)] shadow-[var(--vly-shadow-floating)]">
        <button
          onClick={handleZoomOut}
          className="vly-interactive rounded-lg p-1.5 text-[var(--vly-text-secondary)] hover:bg-[var(--vly-surface-hover)] hover:text-[var(--vly-text-primary)]"
          title="Diminuir Zoom"
        >
          <ZoomOut size={14} />
        </button>
        <span className="px-2 font-mono text-[11px] font-semibold text-[var(--vly-accent)]">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={handleZoomIn}
          className="vly-interactive rounded-lg p-1.5 text-[var(--vly-text-secondary)] hover:bg-[var(--vly-surface-hover)] hover:text-[var(--vly-text-primary)]"
          title="Aumentar Zoom"
        >
          <ZoomIn size={14} />
        </button>
        <div className="mx-1 h-4 w-px bg-[var(--vly-border-default)]" />
        <button
          onClick={handleFitScreen}
          className="vly-interactive rounded-lg p-1.5 text-[var(--vly-text-secondary)] hover:bg-[var(--vly-surface-hover)] hover:text-[var(--vly-text-primary)]"
          title="Ajustar à Tela"
        >
          <Maximize2 size={14} />
        </button>
        <button
          onClick={handleResetZoom}
          className="vly-interactive rounded-lg px-2 py-1 font-mono text-[10px] text-[var(--vly-text-secondary)] hover:bg-[var(--vly-surface-hover)] hover:text-[var(--vly-text-primary)]"
          title="Zoom Real 100%"
        >
          1:1
        </button>
      </div>

      {/* Canvas Viewport Frame */}
      <div
        id="canvas-backdrop"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "center center",
          transition: isPanning ? "none" : "transform 0.1s ease-out",
        }}
        className="relative border border-[var(--vly-border-strong)] shadow-[var(--vly-shadow-floating)]"
      >
        <div
          style={{
            width: documentState.canvas.width,
            height: documentState.canvas.height,
            backgroundColor: documentState.canvas.background,
          }}
          className="relative overflow-hidden"
        >
          {/* Render Layers in order */}
          {documentState.layers.map((layer) => {
            if (!layer.visible) return null;
            const isSelected = layer.id === selectedLayerId;
            const isMissing = layer.assetId && missingAssetIds.has(layer.assetId);

            return (
              <div
                key={layer.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectLayer(layer.id);
                }}
                style={{
                  position: "absolute",
                  left: layer.transform.x,
                  top: layer.transform.y,
                  width: layer.transform.width,
                  height: layer.transform.height,
                  opacity: layer.opacity ?? 1,
                  transform: `rotate(${layer.transform.rotation || 0}deg) scale(${layer.transform.scaleX || 1}, ${
                    layer.transform.scaleY || 1
                  })`,
                  transformOrigin: "center center",
                  cursor: layer.locked ? "not-allowed" : "pointer",
                }}
                className={`group ${
                  isSelected ? "z-30 ring-2 ring-[var(--vly-info)] ring-offset-2 ring-offset-[var(--vly-world)]" : ""
                }`}
              >
                {/* Missing Asset Warning Box */}
                {isMissing ? (
                  <div className="flex h-full w-full flex-col items-center justify-center rounded border border-[var(--vly-border-danger)] bg-[var(--vly-danger)]/10 p-4 text-center text-[var(--vly-danger)]">
                    <AlertTriangle size={24} className="mb-1 text-[var(--vly-danger)]" />
                    <span className="text-xs font-bold">ASSET_MISSING</span>
                    <span className="text-[10px] text-[var(--vly-danger)]/80">Asset físico indisponível</span>
                  </div>
                ) : layer.type === "SHAPE" && layer.shapeStyle ? (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      backgroundColor: layer.shapeStyle.fill,
                      border: layer.shapeStyle.strokeWidth
                        ? `${layer.shapeStyle.strokeWidth}px solid ${layer.shapeStyle.stroke}`
                        : "none",
                      borderRadius:
                        layer.shapeType === "ellipse"
                          ? "50%"
                          : `${layer.shapeStyle.borderRadius || 0}px`,
                    }}
                  />
                ) : layer.type === "TEXT" && layer.textContent ? (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      color: layer.textStyle?.fill || "#ffffff",
                      fontFamily: layer.textStyle?.fontFamily || "sans-serif",
                      fontSize: `${layer.textStyle?.fontSize || 32}px`,
                      fontWeight: layer.textStyle?.fontWeight || "bold",
                      textAlign: layer.textStyle?.align || "left",
                      lineHeight: layer.textStyle?.lineHeight || 1.2,
                    }}
                    className="overflow-hidden select-none"
                  >
                    {layer.textContent}
                  </div>
                ) : layer.type === "IMAGE" ? (
                  <div className="flex h-full w-full items-center justify-center rounded border border-[var(--vly-border-info)] bg-[var(--vly-info)]/10">
                    <ImageIcon size={32} className="text-[var(--vly-info)] opacity-60" />
                  </div>
                ) : (
                  <div className="h-full w-full rounded border border-dashed border-[var(--vly-border-strong)]" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
