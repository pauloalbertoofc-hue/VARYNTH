"use client";

import { useEffect, useRef, useState } from "react";
import { Download, FileJson, ImagePlus, RotateCcw } from "lucide-react";
import { PageLayout } from "@/components/layout/PageLayout";
import { imageService } from "@/lib/studio/image/image-service";
import {
  applyCinematicLighting,
  CINEMATIC_LIGHTING_LOOKS,
  normalizeCinematicLightingParameters,
  type CinematicLightingLook,
  type CinematicLightingParameters,
} from "@/lib/visual-core";

const STORAGE_KEY = "varynth_cinematic_lighting_v1";

export default function CinematicLightingPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const originalRef = useRef<ImageData | null>(null);
  const [parameters, setParameters] = useState<CinematicLightingParameters>(
    normalizeCinematicLightingParameters(),
  );
  const [look, setLook] = useState<CinematicLightingLook>("natural");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as {
          parameters?: Partial<CinematicLightingParameters>;
          look?: CinematicLightingLook;
        };
        setParameters(normalizeCinematicLightingParameters(parsed.parameters));
        if (parsed.look && parsed.look in CINEMATIC_LIGHTING_LOOKS)
          setLook(parsed.look);
      }
    } catch {
      // armazenamento local indisponível não impede o processamento atual
    } finally {
      setHydrated(true);
    }
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ parameters, look }),
      );
    } catch {
      // quota ou modo privado não impede a edição atual
    }
  }, [hydrated, look, parameters]);
  useEffect(() => {
    const canvas = canvasRef.current;
    const original = originalRef.current;
    const context = canvas?.getContext("2d");
    if (canvas && original && context)
      context.putImageData(applyCinematicLighting(original, parameters), 0, 0);
  }, [parameters]);
  const load = (file: File) => {
    setError("");
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(url);
      if (image.naturalWidth > 4096 || image.naturalHeight > 4096) {
        setError("Imagem recusada: o limite local é 4096 × 4096 pixels.");
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
      setParameters(normalizeCinematicLightingParameters());
      setLook("natural");
      setName(file.name);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      setError("Não foi possível decodificar este arquivo como imagem.");
    };
    image.src = url;
  };
  const update = <K extends keyof CinematicLightingParameters>(
    key: K,
    value: number,
  ) => {
    setLook("custom");
    setParameters((current) =>
      normalizeCinematicLightingParameters({ ...current, [key]: value }),
    );
  };
  const applyLook = (next: CinematicLightingLook) => {
    setLook(next);
    setParameters(
      normalizeCinematicLightingParameters(
        CINEMATIC_LIGHTING_LOOKS[next].parameters,
      ),
    );
  };
  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas || !originalRef.current) return;
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `${name.replace(/\.[^.]+$/, "") || "cinematic-lighting"}.png`;
    link.click();
  };
  const downloadRecipe = () => {
    const payload = {
      schema: "varynth.cinematic-lighting-recipe",
      version: 1,
      look,
      parameters,
      sourceName: name || null,
      generatedAt: new Date().toISOString(),
    };
    const link = document.createElement("a");
    link.href = URL.createObjectURL(
      new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      }),
    );
    link.download = "varynth-cinematic-lighting-recipe.json";
    link.click();
    URL.revokeObjectURL(link.href);
  };
  const openInImageStudio = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !originalRef.current) return;
    setSending(true);
    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png"),
      );
      if (!blob) throw new Error("Não foi possível gerar o PNG.");
      const result = await imageService.importImage({
        name: `cinematic-lighting-${Date.now()}.png`,
        mimeType: "image/png",
        sizeBytes: blob.size,
        data: blob,
        actor: "USER",
        captureMetadata: { source: "FILE_IMPORT", generated: false },
      });
      if (!result.success || !result.image)
        throw new Error(
          result.error ?? "Não foi possível abrir o resultado no Image Studio.",
        );
      window.location.href = `/modules/studio?studio=IMAGE&id=${encodeURIComponent(result.image.artifact.id)}`;
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível abrir o resultado no Image Studio.",
      );
    } finally {
      setSending(false);
    }
  };
  return (
    <PageLayout
      title="Cinematic Lighting Studio"
      subtitle="Looks e ajustes de iluminação aplicados localmente sobre uma cópia do original"
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
              ["exposure", "Exposição", -1, 1],
              ["contrast", "Contraste", -1, 1],
              ["warmth", "Temperatura", -1, 1],
              ["tint", "Matiz", -1, 1],
              ["vignette", "Vinheta", 0, 1],
            ] as const
          ).map(([key, label, min, max]) => (
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
                step="0.01"
                value={parameters[key]}
                onChange={(event) => update(key, Number(event.target.value))}
              />
            </label>
          ))}
          <label className="text-xs text-[var(--vly-text-secondary)]">
            Look
            <select
              aria-label="Look de iluminação"
              value={look}
              onChange={(event) =>
                applyLook(event.target.value as CinematicLightingLook)
              }
              className="vly-field ml-2 rounded-lg px-2 py-1"
            >
              {Object.entries(CINEMATIC_LIGHTING_LOOKS).map(([value, item]) => (
                <option key={value} value={value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <button
            onClick={() => applyLook("natural")}
            disabled={!originalRef.current}
            className="vly-interactive inline-flex items-center rounded-lg border border-[var(--vly-border-strong)] px-3 py-2 text-xs font-bold disabled:opacity-50"
          >
            <RotateCcw size={14} className="mr-2" />
            Restaurar
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
            onClick={downloadRecipe}
            disabled={!originalRef.current}
            className="vly-interactive inline-flex items-center rounded-lg border border-[var(--vly-border-strong)] px-3 py-2 text-xs font-bold disabled:opacity-50"
          >
            <FileJson size={14} className="mr-2" />
            Receita JSON
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
            aria-label="Preview de iluminação cinematográfica"
          />
        </div>
        <p className="text-xs text-[var(--vly-text-muted)]">
          {name || "Nenhuma imagem selecionada"} · Processamento local
          determinístico. Iluminação 3D, LUTs ICC e estimativa de profundidade
          não estão disponíveis.
        </p>
      </div>
    </PageLayout>
  );
}
