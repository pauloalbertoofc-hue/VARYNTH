"use client";

import { SynthPreset } from "@/lib/studio/audio/instrument-engine";

export function SynthLfoPanel({ preset, onChange }: { preset: SynthPreset; onChange: (key: "lfoRate" | "lfoDepth", value: number) => void }) {
  return <div className="mt-2 grid grid-cols-2 gap-2 rounded border border-[#303650] bg-[#0b0c16] p-2"><div className="col-span-2 text-[10px] font-semibold text-slate-300">LFO de filtro</div><label className="text-[10px] text-slate-500">Rate<input aria-label="LFO rate do synth" type="range" min="0" max="12" step="0.01" value={preset.lfoRate ?? 0} onChange={(event) => onChange("lfoRate", Number(event.target.value))} className="mt-1 w-full" /></label><label className="text-[10px] text-slate-500">Depth<input aria-label="LFO depth do synth" type="range" min="0" max="1" step="0.01" value={preset.lfoDepth ?? 0} onChange={(event) => onChange("lfoDepth", Number(event.target.value))} className="mt-1 w-full" /></label></div>;
}
