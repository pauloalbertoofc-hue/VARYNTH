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
      className="relative flex-1 h-full bg-[#070810] overflow-hidden select-none flex items-center justify-center"
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
      <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 bg-[#121324]/90 backdrop-blur-md border border-[#222442] p-1.5 rounded-xl text-xs text-slate-300 shadow-xl">
        <button
          onClick={handleZoomOut}
          className="p-1.5 hover:bg-[#1f213a] rounded-lg text-slate-400 hover:text-white transition"
          title="Diminuir Zoom"
        >
          <ZoomOut size={14} />
        </button>
        <span className="px-2 font-mono text-[11px] text-blue-400 font-semibold">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={handleZoomIn}
          className="p-1.5 hover:bg-[#1f213a] rounded-lg text-slate-400 hover:text-white transition"
          title="Aumentar Zoom"
        >
          <ZoomIn size={14} />
        </button>
        <div className="w-[1px] h-4 bg-[#232544] mx-1" />
        <button
          onClick={handleFitScreen}
          className="p-1.5 hover:bg-[#1f213a] rounded-lg text-slate-400 hover:text-white transition"
          title="Ajustar à Tela"
        >
          <Maximize2 size={14} />
        </button>
        <button
          onClick={handleResetZoom}
          className="px-2 py-1 hover:bg-[#1f213a] rounded-lg text-[10px] text-slate-400 hover:text-white transition font-mono"
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
        className="relative transition-transform shadow-2xl border border-[#222440]"
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
                  isSelected ? "ring-2 ring-blue-500 ring-offset-2 ring-offset-black z-30" : ""
                }`}
              >
                {/* Missing Asset Warning Box */}
                {isMissing ? (
                  <div className="w-full h-full bg-red-950/40 border border-red-500/50 rounded flex flex-col items-center justify-center p-4 text-center text-red-300">
                    <AlertTriangle size={24} className="text-red-400 mb-1" />
                    <span className="text-xs font-bold">ASSET_MISSING</span>
                    <span className="text-[10px] text-red-400/80">Asset físico indisponível</span>
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
                  <div className="w-full h-full bg-blue-950/20 border border-blue-500/20 rounded flex items-center justify-center">
                    <ImageIcon size={32} className="text-blue-400 opacity-60" />
                  </div>
                ) : (
                  <div className="w-full h-full border border-dashed border-slate-600 rounded" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

