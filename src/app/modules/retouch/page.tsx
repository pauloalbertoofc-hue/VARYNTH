"use client";

import { useEffect, useRef, useState } from "react";
import { Download, ImagePlus, RotateCcw } from "lucide-react";
import { PageLayout } from "@/components/layout/PageLayout";
import { imageService } from "@/lib/studio/image/image-service";
import {
  applyRetouch,
  normalizeRetouchParameters,
  RETOUCH_LOOKS,
  type RetouchLook,
  type RetouchParameters,
} from "@/lib/visual-core";

export default function RetouchPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const originalRef = useRef<ImageData | null>(null);
  const [parameters, setParameters] = useState<RetouchParameters>({
    brightness: 0,
    contrast: 0,
    saturation: 1,
  });
  const [look, setLook] = useState<RetouchLook>("natural");
  const [name, setName] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const render = () => {
    const canvas = canvasRef.current;
    const original = originalRef.current;
    const context = canvas?.getContext("2d");
    if (canvas && original && context)
      context.putImageData(applyRetouch(original, parameters), 0, 0);
  };
  useEffect(render, [parameters]);
  const load = (file: File) => {
    setError("");
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(url);
      if (image.naturalWidth > 4096 || image.naturalHeight > 4096) {
        originalRef.current = null;
        setError(
          "Imagem recusada: o limite local é 4096 × 4096 pixels para proteger a memória do navegador.",
        );
        return;
      }
      const canvas = canvasRef.current;
      const context = canvas?.getContext("2d");
      if (!canvas || !context) return;
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      context.drawImage(image, 0, 0);
      originalRef.current = context.getImageData(
        0,
        0,
        canvas.width,
        canvas.height,
      );
      setParameters(normalizeRetouchParameters());
      setLook("natural");
      setName(file.name);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      originalRef.current = null;
      setError("Não foi possível decodificar este arquivo como imagem.");
    };
    image.src = url;
  };
  const update = <K extends keyof RetouchParameters>(key: K, value: number) =>
    setParameters((current) =>
      normalizeRetouchParameters({ ...current, [key]: value }),
    );
  const reset = () => setParameters(normalizeRetouchParameters());
  const applyLook = (next: RetouchLook) => {
    setLook(next);
    setParameters(normalizeRetouchParameters(RETOUCH_LOOKS[next].parameters));
  };
  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas || !originalRef.current) return;
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `${name.replace(/\.[^.]+$/, "") || "retouched"}.png`;
    link.click();
  };
  const openInImageStudio = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !originalRef.current) return;
    setSending(true);
    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png"),
      );
      if (!blob) return;
      const result = await imageService.importImage({
        name: `retouched-${Date.now()}.png`,
        mimeType: "image/png",
        sizeBytes: blob.size,
        data: blob,
        actor: "USER",
        captureMetadata: { source: "FILE_IMPORT", generated: false },
      });
      if (result.success && result.image)
        window.location.href = `/modules/studio?studio=IMAGE&id=${encodeURIComponent(result.image.artifact.id)}`;
    } finally {
      setSending(false);
    }
  };
  return (
    <PageLayout
      title="Retouch Studio"
      subtitle="Ajustes técnicos não destrutivos, preservando o original"
    >
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-panel)] p-4">
          <label className="vly-interactive inline-flex cursor-pointer items-center rounded-lg bg-[var(--vly-accent)] px-3 py-2 text-xs font-bold text-[var(--vly-accent-contrast)]">
            <ImagePlus size={14} className="mr-2" />
            Abrir imagem
            <input
              className="sr-only"
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) load(file);
              }}
            />
          </label>
          {(
            [
              ["brightness", "Brilho", -1, 1, 0.01],
              ["contrast", "Contraste", -1, 1, 0.01],
              ["saturation", "Saturação", 0, 2, 0.01],
            ] as const
          ).map(([key, label, min, max, step]) => (
            <label
              key={key}
              className="text-xs text-[var(--vly-text-secondary)]"
            >
              {label}
              <input
                aria-label={label}
                className="ml-2 align-middle"
                type="range"
                min={min}
                max={max}
                step={step}
                value={parameters[key]}
                onChange={(event) => update(key, Number(event.target.value))}
              />
            </label>
          ))}
          <label className="text-xs text-[var(--vly-text-secondary)]">
            Look
            <select
              aria-label="Look de retoque"
              value={look}
              onChange={(event) => applyLook(event.target.value as RetouchLook)}
              className="vly-field ml-2 rounded-lg px-2 py-1"
            >
              {Object.entries(RETOUCH_LOOKS).map(([value, item]) => (
                <option key={value} value={value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <button
            onClick={reset}
            disabled={!originalRef.current}
            className="vly-interactive inline-flex items-center rounded-lg border border-[var(--vly-border-strong)] px-3 py-2 text-xs font-bold disabled:opacity-50"
          >
            <RotateCcw size={14} className="mr-2" />
            Restaurar ajustes
          </button>
          <button
            onClick={download}
            disabled={!originalRef.current}
            className="vly-interactive inline-flex items-center rounded-lg border border-[var(--vly-border-strong)] px-3 py-2 text-xs font-bold disabled:opacity-50"
          >
            <Download size={14} className="mr-2" />
            PNG
          </button>
          <button
            onClick={() => void openInImageStudio()}
            disabled={!originalRef.current || sending}
            className="vly-interactive rounded-lg border border-[var(--vly-border-strong)] px-3 py-2 text-xs font-bold disabled:opacity-50"
          >
            {sending ? "Abrindo..." : "Abrir no Image Studio"}
          </button>
        </div>
        {error && (
          <p
            role="alert"
            className="rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-xs text-red-200"
          >
            {error}
          </p>
        )}
        <div className="overflow-auto rounded-2xl border border-[var(--vly-border-subtle)] bg-black p-2">
          <canvas
            ref={canvasRef}
            className="mx-auto block max-h-[70vh] max-w-full object-contain"
            aria-label="Preview de retoque"
          />
        </div>
        <p className="text-xs text-[var(--vly-text-muted)]">
          {name || "Nenhuma imagem selecionada"} · Ajustes aplicados localmente
          sobre uma cópia do buffer original. Healing, clone, remoção de objetos
          e reconstrução generativa não estão disponíveis.
        </p>
      </div>
    </PageLayout>
  );
}
