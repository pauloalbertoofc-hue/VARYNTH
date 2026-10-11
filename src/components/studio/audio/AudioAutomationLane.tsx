"use client";
import React from "react";
import { AudioAutomationPoint, AudioDocumentState } from "@/lib/studio/audio/types";

export function AudioAutomationLane({ state, trackId, onChange }: { state: AudioDocumentState; trackId?: string; onChange: (state: AudioDocumentState) => void }) {
  const target = trackId || state.tracks[0]?.id;
  const points = (state.automation || []).filter((p) => p.targetId === target);
  const add = (parameter: "TRACK_VOLUME" | "TRACK_PAN") => {
    if (!target) return;
    const point: AudioAutomationPoint = { id: `automation-${Date.now()}`, parameter, targetId: target, timeMs: state.playheadMs, value: parameter === "TRACK_VOLUME" ? 1 : 0, curve: "LINEAR" };
    onChange({ ...state, automation: [...(state.automation || []), point] });
  };
  return <section aria-label="Automação da faixa" className="space-y-2 border-t border-[var(--vly-border-subtle)] bg-[var(--vly-world)] p-3"><div className="flex items-center justify-between"><span className="text-[11px] uppercase tracking-wider text-[var(--vly-text-muted)]">Automação · {state.tracks.find((t) => t.id === target)?.name || "Faixa"}</span><div className="flex gap-1"><button type="button" onClick={() => add("TRACK_VOLUME")} className="vly-interactive rounded bg-[var(--vly-accent)] px-2 py-1 text-[10px] text-[var(--vly-text-on-accent)]">+ Volume</button><button type="button" onClick={() => add("TRACK_PAN")} className="vly-interactive rounded bg-[var(--vly-info)] px-2 py-1 text-[10px] text-[var(--vly-text-on-accent)]">+ Pan</button></div></div><div className="flex gap-2 overflow-x-auto">{points.length === 0 ? <span role="status" className="text-[10px] italic text-[var(--vly-text-disabled)]">Posicione o playhead e adicione um ponto.</span> : points.map((point) => <article key={point.id} className="min-w-40 rounded border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-raised)] p-2"><div className="text-[10px] text-[var(--vly-text-secondary)]">{point.parameter === "TRACK_VOLUME" ? "Volume" : "Pan"} · {point.timeMs}ms</div><input aria-label={`Automação ${point.parameter}`} type="range" min={point.parameter === "TRACK_VOLUME" ? 0 : -1} max={point.parameter === "TRACK_VOLUME" ? 1.5 : 1} step="0.01" value={point.value} onChange={(e) => onChange({ ...state, automation: (state.automation || []).map((p) => p.id === point.id ? { ...p, value: Number(e.target.value) } : p) })} className="h-1.5 w-full cursor-pointer accent-[var(--vly-accent)]" /></article>)}</div></section>;
}
