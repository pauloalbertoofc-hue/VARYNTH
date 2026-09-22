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
  return <div className="border-t border-[#252844] bg-[#0d0f1e] p-3 space-y-2"><div className="flex items-center justify-between"><span className="text-[11px] uppercase tracking-wider text-slate-400">Automação · {state.tracks.find((t) => t.id === target)?.name || "Faixa"}</span><div className="flex gap-1"><button onClick={() => add("TRACK_VOLUME")} className="rounded bg-blue-600 px-2 py-1 text-[10px] text-white">+ Volume</button><button onClick={() => add("TRACK_PAN")} className="rounded bg-violet-600 px-2 py-1 text-[10px] text-white">+ Pan</button></div></div><div className="flex gap-2 overflow-x-auto">{points.length === 0 ? <span className="text-[10px] italic text-slate-600">Posicione o playhead e adicione um ponto.</span> : points.map((point) => <div key={point.id} className="min-w-40 rounded border border-[#2a2e50] bg-[#151832] p-2"><div className="text-[10px] text-slate-300">{point.parameter === "TRACK_VOLUME" ? "Volume" : "Pan"} · {point.timeMs}ms</div><input aria-label={`Automação ${point.parameter}`} type="range" min={point.parameter === "TRACK_VOLUME" ? 0 : -1} max={point.parameter === "TRACK_VOLUME" ? 1.5 : 1} step="0.01" value={point.value} onChange={(e) => onChange({ ...state, automation: (state.automation || []).map((p) => p.id === point.id ? { ...p, value: Number(e.target.value) } : p) })} className="w-full" /></div>)}</div></div>;
}
