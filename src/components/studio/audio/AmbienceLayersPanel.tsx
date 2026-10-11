"use client";

import React from "react";
import type { AudioBus, AudioTrack } from "@/lib/studio/audio/types";
import { Layers3, Plus, SlidersHorizontal, Volume2, VolumeX, Radio, Library, Activity } from "lucide-react";

interface AmbienceLayersPanelProps {
  tracks: AudioTrack[];
  buses: AudioBus[];
  onAddLayer: () => void;
  onUpdateTrack: (trackId: string, updates: Partial<AudioTrack>) => void;
  onSelectTrack: (trackId: string) => void;
  onOpenAssets: (trackId: string) => void;
  onOpenTimeline: (trackId: string) => void;
}

export function AmbienceLayersPanel({ tracks, buses, onAddLayer, onUpdateTrack, onSelectTrack, onOpenAssets, onOpenTimeline }: AmbienceLayersPanelProps) {
  const layers = tracks.filter((track) => track.type === "AMBIENCE");
  return <section className="h-full min-h-0 overflow-auto bg-[var(--vly-surface)] p-4 text-[var(--vly-text-secondary)]" aria-label="Camadas de ambience">
    <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <div className="rounded-lg border border-[var(--vly-border-success)] bg-[var(--vly-success)]/10 p-2 text-[var(--vly-success)]"><Layers3 size={18} /></div>
        <div><h2 className="text-lg font-semibold text-[var(--vly-text-primary)]">Ambience · Camadas independentes</h2><p className="mt-1 max-w-2xl text-xs text-[var(--vly-text-muted)]">Cada camada é uma faixa AMBIENCE real da timeline: assets locais, volume, pan, mute/solo, bus, automação, efeitos e stems continuam ligados ao mixer/render existente.</p></div>
      </div>
      <button type="button" onClick={onAddLayer} className="vly-interactive flex items-center gap-1.5 rounded-lg bg-[var(--vly-success)] px-3 py-2 text-xs font-semibold text-[var(--vly-accent-contrast)]"><Plus size={14} /> Nova camada</button>
    </header>

    <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
      <div className="rounded border border-[var(--vly-border-subtle)] bg-[var(--vly-surface)] p-2"><b className="block text-sm text-[var(--vly-success)]">{layers.length}</b><span className="text-[10px] text-[var(--vly-text-muted)]">camadas</span></div>
      <div className="rounded border border-[var(--vly-border-subtle)] bg-[var(--vly-surface)] p-2"><b className="block text-sm text-[var(--vly-success)]">{layers.reduce((sum, track) => sum + track.clips.length, 0)}</b><span className="text-[10px] text-[var(--vly-text-muted)]">clips de áudio</span></div>
      <div className="rounded border border-[var(--vly-border-subtle)] bg-[var(--vly-surface)] p-2"><b className="block text-sm text-[var(--vly-success)]">{layers.filter((track) => !track.muted).length}</b><span className="text-[10px] text-[var(--vly-text-muted)]">não silenciadas</span></div>
      <div className="rounded border border-[var(--vly-border-subtle)] bg-[var(--vly-surface)] p-2"><b className="block text-sm text-[var(--vly-success)]">{layers.filter((track) => (track.variationGroup || "").trim()).length}</b><span className="text-[10px] text-[var(--vly-text-muted)]">com grupo de variação</span></div>
    </div>

    {!layers.length ? <div className="rounded-xl border border-dashed border-[var(--vly-border-default)] bg-[var(--vly-surface)] p-8 text-center">
      <Radio size={24} className="mx-auto mb-2 text-[var(--vly-success)]" />
      <h3 className="text-sm font-medium text-white">Nenhuma camada de ambience ainda</h3>
      <p className="mx-auto mt-1 max-w-lg text-xs text-[var(--vly-text-muted)]">Crie uma camada para cada componente do ambiente — por exemplo vento, chuva, insetos ou sala. Importe um arquivo ou insira um asset local pelo painel Assets; nenhum áudio será gerado automaticamente.</p>
      <button type="button" onClick={onAddLayer} className="vly-interactive mt-4 rounded-lg bg-[var(--vly-success)] px-4 py-2 text-xs font-semibold text-[var(--vly-accent-contrast)]">Criar primeira camada</button>
    </div> : <div className="grid gap-3 xl:grid-cols-2">
      {layers.map((track, index) => <article key={track.id} className={`rounded-xl border bg-[var(--vly-surface)] p-3 ${track.muted ? "border-[var(--vly-border-danger)] opacity-75" : "border-[var(--vly-border-subtle)]"}`}>
        <header className="mb-3 flex items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--vly-success)]/10 font-mono text-[10px] text-[var(--vly-success)]">{String(index + 1).padStart(2, "0")}</span>
          <label className="min-w-0 flex-1 text-[9px] uppercase tracking-wide text-[var(--vly-text-muted)]">Nome da camada
            <input aria-label={`Nome da camada ${track.name}`} value={track.name} onChange={(event) => onUpdateTrack(track.id, { name: event.target.value })} className="vly-field mt-0.5 block w-full bg-transparent px-1 text-sm font-semibold normal-case tracking-normal text-[var(--vly-text-primary)]" />
          </label>
          <button type="button" aria-label={`${track.muted ? "Ativar" : "Silenciar"} camada ${track.name}`} aria-pressed={track.muted} onClick={() => onUpdateTrack(track.id, { muted: !track.muted })} className={`vly-interactive rounded p-2 ${track.muted ? "bg-[var(--vly-danger)]/20 text-[var(--vly-danger)]" : "bg-[var(--vly-surface-raised)] text-[var(--vly-text-secondary)] hover:text-[var(--vly-text-primary)]"}`}>{track.muted ? <VolumeX size={15} /> : <Volume2 size={15} />}</button>
          <button type="button" aria-label={`${track.solo ? "Desisolar" : "Solo"} camada ${track.name}`} aria-pressed={track.solo} onClick={() => onUpdateTrack(track.id, { solo: !track.solo })} className={`vly-interactive rounded px-2 py-1.5 text-[10px] font-bold ${track.solo ? "bg-[var(--vly-warning)] text-[var(--vly-accent-contrast)]" : "bg-[var(--vly-surface-raised)] text-[var(--vly-text-muted)] hover:text-[var(--vly-text-primary)]"}`}>S</button>
        </header>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-[10px] text-[var(--vly-text-muted)]">Volume · {Math.round((track.volume ?? 1) * 100)}%
            <input aria-label={`Volume da camada ${track.name}`} type="range" min="0" max="150" value={Math.round((track.volume ?? 1) * 100)} onChange={(event) => onUpdateTrack(track.id, { volume: Number(event.target.value) / 100 })} className="vly-interactive mt-2 w-full accent-[var(--vly-success)]" />
          </label>
          <label className="text-[10px] text-[var(--vly-text-muted)]">Pan · {(track.pan ?? 0) === 0 ? "Centro" : (track.pan ?? 0) < 0 ? `Esquerda ${Math.round(Math.abs(track.pan!) * 100)}%` : `Direita ${Math.round(track.pan! * 100)}%`}
            <input aria-label={`Pan da camada ${track.name}`} type="range" min="-100" max="100" value={Math.round((track.pan ?? 0) * 100)} onChange={(event) => onUpdateTrack(track.id, { pan: Number(event.target.value) / 100 })} className="vly-interactive mt-2 w-full accent-[var(--vly-info)]" />
          </label>
        </div>

        <label className="mt-3 block text-[10px] text-[var(--vly-text-muted)]">Saída do mixer
          <select aria-label={`Bus de saída da camada ${track.name}`} value={track.busId || "master"} onChange={(event) => onUpdateTrack(track.id, { busId: event.target.value === "master" ? undefined : event.target.value })} className="vly-field mt-1 w-full p-2"><option value="master">Master</option>{buses.map((bus) => <option key={bus.id} value={bus.id}>{bus.name}</option>)}</select>
        </label>

        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
          <div className="flex min-w-0 items-center gap-2 rounded border border-[var(--vly-border-subtle)] bg-[var(--vly-world)] px-2 py-2 text-[10px] text-[var(--vly-text-muted)]"><Activity size={13} className="shrink-0 text-[var(--vly-success)]" /><span className="truncate">{track.clips.length ? `${track.clips.length} clips · ${track.clips.map((clip) => clip.name || clip.assetId).join(", ")}` : "Sem áudio nesta camada"}</span></div>
          <button type="button" onClick={() => onOpenAssets(track.id)} className="vly-interactive flex items-center justify-center gap-1 rounded border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-raised)] px-2 py-2 text-[10px] text-[var(--vly-text-secondary)] hover:text-[var(--vly-text-primary)]"><Library size={12} /> Assets</button>
          <button type="button" onClick={() => onOpenTimeline(track.id)} className="vly-interactive flex items-center justify-center gap-1 rounded border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-raised)] px-2 py-2 text-[10px] text-[var(--vly-text-secondary)] hover:text-[var(--vly-text-primary)]"><SlidersHorizontal size={12} /> Timeline</button>
        </div>
      </article>)}
    </div>}

    <p className="mt-4 text-[10px] text-[var(--vly-text-muted)]">Automação: escolha a camada e adicione pontos na lane inferior. Fades/loop são editados nos clips da timeline. O export de stems inclui cada faixa AMBIENCE selecionada; randomização seedada aplica-se aos eventos/pacotes Game Audio, não à mixagem normal do Audio Studio.</p>
  </section>;
}
