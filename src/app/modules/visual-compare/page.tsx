"use client";

import { useEffect, useState } from "react";
import { ArrowLeftRight, FileImage, ShieldCheck } from "lucide-react";
import { PageLayout } from "@/components/layout/PageLayout";

type LocalImage = { name: string; url: string };

export default function VisualComparePage() {
  const [before, setBefore] = useState<LocalImage | null>(null);
  const [after, setAfter] = useState<LocalImage | null>(null);
  const [position, setPosition] = useState(50);
  const load = (file: File | undefined, setter: (value: LocalImage | null) => void) => {
    if (!file || !file.type.startsWith("image/")) return;
    setter({ name: file.name, url: URL.createObjectURL(file) });
  };
  useEffect(() => () => { if (before) URL.revokeObjectURL(before.url); if (after) URL.revokeObjectURL(after.url); }, [before, after]);
  return <PageLayout title="Visual Compare" subtitle="Comparação local, reversível e sem upload externo"><div className="mx-auto max-w-6xl space-y-6"><div className="grid gap-4 md:grid-cols-2"><label className="vly-interactive rounded-xl border border-dashed border-[var(--vly-border-strong)] bg-[var(--vly-surface-panel)] p-4"><span className="flex items-center gap-2 text-sm font-bold text-[var(--vly-text-primary)]"><FileImage size={16} />Imagem original</span><input type="file" accept="image/*" onChange={(event) => load(event.target.files?.[0], setBefore)} className="mt-3 block w-full text-xs text-[var(--vly-text-muted)]" />{before && <p className="mt-2 truncate text-[10px] text-[var(--vly-text-secondary)]">{before.name}</p>}</label><label className="vly-interactive rounded-xl border border-dashed border-[var(--vly-border-strong)] bg-[var(--vly-surface-panel)] p-4"><span className="flex items-center gap-2 text-sm font-bold text-[var(--vly-text-primary)]"><FileImage size={16} />Imagem comparada</span><input type="file" accept="image/*" onChange={(event) => load(event.target.files?.[0], setAfter)} className="mt-3 block w-full text-xs text-[var(--vly-text-muted)]" />{after && <p className="mt-2 truncate text-[10px] text-[var(--vly-text-secondary)]">{after.name}</p>}</label></div><section className="overflow-hidden rounded-2xl border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-panel)]"><div className="relative aspect-video bg-black">{before && <img src={before.url} alt="Imagem original" className="absolute inset-0 h-full w-full object-contain" />}{after && <div className="absolute inset-0 overflow-hidden" style={{ width: `${position}%` }}><img src={after.url} alt="Imagem comparada" className="absolute inset-0 h-full w-full max-w-none object-contain" style={{ width: `${100 / Math.max(position, 1) * 100}%` }} /></div>}{!before && !after && <div className="flex h-full items-center justify-center text-sm text-[var(--vly-text-muted)]">Selecione duas imagens locais para começar.</div>}</div><div className="flex items-center gap-3 border-t border-[var(--vly-border-subtle)] p-4"><ArrowLeftRight size={16} className="text-[var(--vly-accent)]" /><input aria-label="Posição da comparação" type="range" min="1" max="99" value={position} onChange={(event) => setPosition(Number(event.target.value))} className="w-full" /><span className="w-12 text-right text-xs font-mono text-[var(--vly-text-secondary)]">{position}%</span></div></section><div className="flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4 text-xs text-emerald-200"><ShieldCheck size={16} /> Processamento local: os arquivos permanecem no navegador e os object URLs são revogados ao sair.</div></div></PageLayout>;
}
