"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Sigma } from "lucide-react";
import { PageLayout } from "@/components/layout/PageLayout";

type Parameters = { mode: "mandelbrot" | "julia"; iterations: number; zoom: number; cReal: number; cImag: number };
const STORAGE_KEY = "varynth_mathematical_art_v1";

function render(canvas: HTMLCanvasElement, parameters: Parameters) {
  const context = canvas.getContext("2d"); if (!context) return;
  const image = context.createImageData(canvas.width, canvas.height); const aspect = canvas.width / canvas.height;
  for (let y = 0; y < canvas.height; y += 1) for (let x = 0; x < canvas.width; x += 1) {
    let real = (x / canvas.width - .5) * 3.2 * aspect / parameters.zoom - .7;
    let imag = (y / canvas.height - .5) * 3.2 / parameters.zoom;
    const cReal = parameters.mode === "julia" ? parameters.cReal : real; const cImag = parameters.mode === "julia" ? parameters.cImag : imag;
    if (parameters.mode === "mandelbrot") { real = 0; imag = 0; }
    let iteration = 0; while (real * real + imag * imag <= 4 && iteration < parameters.iterations) { const nextReal = real * real - imag * imag + cReal; imag = 2 * real * imag + cImag; real = nextReal; iteration += 1; }
    const value = iteration === parameters.iterations ? 0 : Math.floor(255 * Math.sqrt(iteration / parameters.iterations)); const index = (y * canvas.width + x) * 4;
    image.data[index] = value * .25; image.data[index + 1] = value * .65 + 30; image.data[index + 2] = 255 - value * .55; image.data[index + 3] = 255;
  }
  context.putImageData(image, 0, 0);
}

export default function MathematicalArtPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [parameters, setParameters] = useState<Parameters>({ mode: "mandelbrot", iterations: 90, zoom: 1, cReal: -.8, cImag: .156 });
  useEffect(() => { try { const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as Partial<Parameters> | null; if (saved) setParameters((current) => ({ ...current, ...saved })); } catch { /* draft inválido é ignorado */ } }, []);
  useEffect(() => { const canvas = canvasRef.current; if (!canvas) return; render(canvas, parameters); localStorage.setItem(STORAGE_KEY, JSON.stringify(parameters)); }, [parameters]);
  const update = <K extends keyof Parameters>(key: K, value: Parameters[K]) => setParameters((current) => ({ ...current, [key]: value }));
  const download = () => { const canvas = canvasRef.current; if (!canvas) return; const link = document.createElement("a"); link.download = `varynth-${parameters.mode}.png`; link.href = canvas.toDataURL("image/png"); link.click(); };
  return <PageLayout title="Mathematical Art Studio" subtitle="Fractais determinísticos renderizados localmente"><div className="mx-auto max-w-6xl space-y-4"><div className="flex flex-wrap items-center gap-4 rounded-xl border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-panel)] p-4"><Sigma size={18} className="text-[var(--vly-accent)]" /><label className="text-xs text-[var(--vly-text-secondary)]">Conjunto <select aria-label="Conjunto fractal" value={parameters.mode} onChange={(event) => update("mode", event.target.value as Parameters["mode"])} className="vly-field ml-2 rounded-lg px-2 py-1"><option value="mandelbrot">Mandelbrot</option><option value="julia">Julia</option></select></label><label className="text-xs text-[var(--vly-text-secondary)]">Iterações <input aria-label="Iterações" type="range" min="20" max="180" value={parameters.iterations} onChange={(event) => update("iterations", Number(event.target.value))} /></label><label className="text-xs text-[var(--vly-text-secondary)]">Zoom <input aria-label="Zoom fractal" type="range" min=".5" max="8" step=".1" value={parameters.zoom} onChange={(event) => update("zoom", Number(event.target.value))} /></label>{parameters.mode === "julia" && <><label className="text-xs text-[var(--vly-text-secondary)]">C real <input aria-label="C real" type="number" step=".01" value={parameters.cReal} onChange={(event) => update("cReal", Number(event.target.value))} className="vly-field ml-1 w-20 rounded px-1" /></label><label className="text-xs text-[var(--vly-text-secondary)]">C imaginário <input aria-label="C imaginário" type="number" step=".01" value={parameters.cImag} onChange={(event) => update("cImag", Number(event.target.value))} className="vly-field ml-1 w-20 rounded px-1" /></label></>}<button onClick={download} className="vly-interactive inline-flex items-center rounded-lg bg-[var(--vly-accent)] px-3 py-2 text-xs font-bold text-[var(--vly-accent-contrast)]"><Download size={14} className="mr-2" />Exportar PNG</button></div><div className="overflow-hidden rounded-2xl border border-[var(--vly-border-subtle)] bg-black"><canvas ref={canvasRef} width={960} height={640} className="block h-auto w-full" aria-label="Arte matemática fractal" /></div><p className="text-xs text-[var(--vly-text-muted)]">Renderização CPU determinística no navegador, sem código arbitrário nem upload externo. Cenas complexas e aceleração GPU ainda não estão disponíveis.</p></div></PageLayout>;
}
