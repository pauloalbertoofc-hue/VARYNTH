"use client";

import { useEffect, useRef, useState } from "react";
import { Download, ShieldCheck } from "lucide-react";
import { PageLayout } from "@/components/layout/PageLayout";

const STORAGE_KEY = "varynth_shader_forge_v1";

export default function ShaderForgePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scale, setScale] = useState(7);
  const [hue, setHue] = useState(42);
  const [contrast, setContrast] = useState(1.2);

  const render = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const image = context.createImageData(canvas.width, canvas.height);
    for (let y = 0; y < canvas.height; y += 1) for (let x = 0; x < canvas.width; x += 1) {
      const wave = Math.sin(x / (scale * 4) + Math.cos(y / (scale * 3))) * 0.5 + 0.5;
      const ring = Math.sin(Math.hypot(x - canvas.width / 2, y - canvas.height / 2) / scale) * 0.5 + 0.5;
      const value = Math.max(0, Math.min(1, (wave * 0.65 + ring * 0.35 - 0.5) * contrast + 0.5));
      const i = (y * canvas.width + x) * 4;
      image.data[i] = Math.round(value * 255);
      image.data[i + 1] = Math.round(((value + hue / 360) % 1) * 180);
      image.data[i + 2] = Math.round((1 - value) * 220 + 35);
      image.data[i + 3] = 255;
    }
    context.putImageData(image, 0, 0);
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ scale, hue, contrast })); } catch { /* local storage is optional */ }
  };

  useEffect(() => { try { const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null") as Partial<{ scale: number; hue: number; contrast: number }> | null; if (saved) { if (typeof saved.scale === "number") setScale(saved.scale); if (typeof saved.hue === "number") setHue(saved.hue); if (typeof saved.contrast === "number") setContrast(saved.contrast); } } catch { /* invalid draft is ignored */ } }, []);
  useEffect(() => { render(); }, [scale, hue, contrast]);
  const download = () => { const canvas = canvasRef.current; if (!canvas) return; const link = document.createElement("a"); link.download = "varynth-shader.png"; link.href = canvas.toDataURL("image/png"); link.click(); };

  return <PageLayout title="Shader Forge" subtitle="Geração procedural local, determinística e sem execução arbitrária"><div className="mx-auto max-w-6xl space-y-4"><div className="flex flex-wrap items-center gap-4 rounded-xl border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-panel)] p-4"><label className="text-xs text-[var(--vly-text-secondary)]">Escala <input aria-label="Escala do shader" type="range" min="2" max="24" value={scale} onChange={(event) => setScale(Number(event.target.value))} /></label><label className="text-xs text-[var(--vly-text-secondary)]">Matiz <input aria-label="Matiz do shader" type="range" min="0" max="359" value={hue} onChange={(event) => setHue(Number(event.target.value))} /></label><label className="text-xs text-[var(--vly-text-secondary)]">Contraste <input aria-label="Contraste do shader" type="range" min="0.5" max="2" step="0.1" value={contrast} onChange={(event) => setContrast(Number(event.target.value))} /></label><button onClick={download} className="vly-interactive inline-flex items-center rounded-lg bg-[var(--vly-accent)] px-3 py-2 text-xs font-bold text-[var(--vly-accent-contrast)]"><Download size={14} className="mr-2" />Exportar PNG</button></div><div className="overflow-hidden rounded-2xl border border-[var(--vly-border-subtle)] bg-black"><canvas ref={canvasRef} width={960} height={540} className="block h-auto w-full" aria-label="Preview procedural do Shader Forge" /></div><div className="flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4 text-xs text-emerald-200"><ShieldCheck size={16} /> O preview usa apenas fórmulas determinísticas no navegador; não executa código de shader fornecido pelo usuário.</div></div></PageLayout>;
}
