"use client";

import { useEffect, useRef, useState } from "react";
import {
  Download,
  Eraser,
  Paintbrush,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { PageLayout } from "@/components/layout/PageLayout";
import { imageService } from "@/lib/studio/image/image-service";

const PAINTING_STORAGE_KEY = "varynth_digital_painting_v1";
const PAINTING_SETTINGS_KEY = "varynth_digital_painting_settings_v1";

export default function DigitalPaintingPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const [color, setColor] = useState("#f2c14e");
  const [size, setSize] = useState(18);
  const [opacity, setOpacity] = useState(1);
  const [eraser, setEraser] = useState(false);
  const [isSending, setIsSending] = useState(false);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.fillStyle = "#10141c";
    context.fillRect(0, 0, canvas.width, canvas.height);
    try {
      const saved = window.localStorage.getItem(PAINTING_STORAGE_KEY);
      if (saved) {
        const image = new Image();
        image.onload = () =>
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
        image.src = saved;
      }
      const settings = window.localStorage.getItem(PAINTING_SETTINGS_KEY);
      if (settings) {
        const parsed = JSON.parse(settings) as {
          color?: string;
          size?: number;
          opacity?: number;
        };
        if (typeof parsed.color === "string") setColor(parsed.color);
        if (typeof parsed.size === "number")
          setSize(Math.max(1, Math.min(96, parsed.size)));
        if (typeof parsed.opacity === "number")
          setOpacity(Math.max(0.05, Math.min(1, parsed.opacity)));
      }
    } catch {
      /* corrupted local draft is ignored */
    }
  }, []);
  useEffect(() => {
    try {
      window.localStorage.setItem(
        PAINTING_SETTINGS_KEY,
        JSON.stringify({ color, size, opacity }),
      );
    } catch {
      /* settings are optional */
    }
  }, [color, size, opacity]);
  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) * canvas.width) / rect.width,
      y: ((event.clientY - rect.top) * canvas.height) / rect.height,
    };
  };
  const start = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    const value = point(event);
    if (!canvas || !context || !value) return;
    drawingRef.current = true;
    canvas.setPointerCapture(event.pointerId);
    context.beginPath();
    context.moveTo(value.x, value.y);
    context.globalCompositeOperation = eraser
      ? "destination-out"
      : "source-over";
    context.globalAlpha = opacity;
    context.strokeStyle = color;
    context.lineWidth = size;
    context.lineCap = "round";
  };
  const move = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    const value = point(event);
    if (!drawingRef.current || !context || !value) return;
    context.lineTo(value.x, value.y);
    context.stroke();
  };
  const persist = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      window.localStorage.setItem(
        PAINTING_STORAGE_KEY,
        canvas.toDataURL("image/png"),
      );
    } catch {
      /* storage limits do not break drawing */
    }
  };
  const stop = () => {
    drawingRef.current = false;
    const context = canvasRef.current?.getContext("2d");
    if (context) {
      context.closePath();
      context.globalCompositeOperation = "source-over";
      context.globalAlpha = 1;
    }
    persist();
  };
  const clear = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    context.fillStyle = "#10141c";
    context.fillRect(0, 0, canvas.width, canvas.height);
    persist();
  };
  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "varynth-painting.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  };
  const sendToImageStudio = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsSending(true);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );
    if (!blob) {
      setIsSending(false);
      return;
    }
    const result = await imageService.importImage({
      name: `painting-${Date.now()}.png`,
      mimeType: "image/png",
      sizeBytes: blob.size,
      data: blob,
      actor: "USER",
      captureMetadata: { source: "FILE_IMPORT", generated: false },
    });
    setIsSending(false);
    if (result.success && result.image)
      window.location.href = `/modules/studio?studio=IMAGE&id=${encodeURIComponent(result.image.artifact.id)}`;
  };
  return (
    <PageLayout
      title="Digital Painting Studio"
      subtitle="Pintura local por canvas, com pincel e borracha reais"
    >
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-panel)] p-3">
          <Paintbrush size={16} className="text-[var(--vly-accent)]" />
          <label className="flex items-center gap-2 text-xs text-[var(--vly-text-secondary)]">
            Cor{" "}
            <input
              aria-label="Cor do pincel"
              type="color"
              value={color}
              onChange={(event) => setColor(event.target.value)}
              disabled={eraser}
            />
          </label>
          <label className="flex items-center gap-2 text-xs text-[var(--vly-text-secondary)]">
            Tamanho{" "}
            <input
              aria-label="Tamanho do pincel"
              type="range"
              min="1"
              max="96"
              value={size}
              onChange={(event) => setSize(Number(event.target.value))}
            />
            <span className="w-8 font-mono">{size}</span>
          </label>
          <label className="flex items-center gap-2 text-xs text-[var(--vly-text-secondary)]">
            Opacidade{" "}
            <input
              aria-label="Opacidade do pincel"
              type="range"
              min="0.05"
              max="1"
              step="0.05"
              value={opacity}
              onChange={(event) => setOpacity(Number(event.target.value))}
            />
            <span className="w-10 font-mono">{Math.round(opacity * 100)}%</span>
          </label>
          <button
            onClick={() => setEraser((value) => !value)}
            className={`vly-interactive inline-flex items-center rounded-lg px-3 py-2 text-xs font-bold ${eraser ? "bg-[var(--vly-accent)] text-[var(--vly-accent-contrast)]" : "border border-[var(--vly-border-strong)] text-[var(--vly-text-primary)]"}`}
          >
            <Eraser size={14} className="mr-2" />
            {eraser ? "Borracha ativa" : "Borracha"}
          </button>
          <button
            onClick={clear}
            className="vly-interactive inline-flex items-center rounded-lg border border-[var(--vly-border-strong)] px-3 py-2 text-xs font-bold text-[var(--vly-text-primary)]"
          >
            <RotateCcw size={14} className="mr-2" />
            Limpar
          </button>
          <button
            onClick={download}
            className="vly-interactive inline-flex items-center rounded-lg bg-[var(--vly-accent)] px-3 py-2 text-xs font-bold text-[var(--vly-accent-contrast)]"
          >
            <Download size={14} className="mr-2" />
            Baixar PNG
          </button>
          <button
            onClick={() => void sendToImageStudio()}
            disabled={isSending}
            className="vly-interactive rounded-lg border border-[var(--vly-border-strong)] px-3 py-2 text-xs font-bold text-[var(--vly-text-primary)] disabled:opacity-50"
          >
            {isSending ? "Abrindo..." : "Abrir no Image Studio"}
          </button>
        </div>
        <div className="overflow-hidden rounded-2xl border border-[var(--vly-border-subtle)] bg-black">
          <canvas
            ref={canvasRef}
            width={1600}
            height={900}
            onPointerDown={start}
            onPointerMove={move}
            onPointerUp={stop}
            onPointerCancel={stop}
            onPointerLeave={stop}
            className="block h-auto w-full touch-none cursor-crosshair"
          />
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4 text-xs text-emerald-200">
          <ShieldCheck size={16} /> O desenho é processado no navegador e só sai
          quando você escolhe baixar o PNG ou abrir no Image Studio.
        </div>
      </div>
    </PageLayout>
  );
}
