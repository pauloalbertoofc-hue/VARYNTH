"use client";

import { SynthPreset } from "@/lib/studio/audio/instrument-engine";

type SynthEnvelopeEditorProps = {
  preset: SynthPreset;
  onChange: <K extends keyof SynthPreset>(key: K, value: SynthPreset[K]) => void;
};

const width = 320;
const height = 116;
const pad = 14;

function envelopePoints(preset: SynthPreset): string {
  const attack = Math.max(0.001, preset.attack);
  const decay = Math.max(0.001, preset.decay);
  const release = Math.max(0.01, preset.release);
  const total = Math.max(1, attack + decay + 0.45 + release);
  const x = (time: number) => pad + (time / total) * (width - pad * 2);
  const y = (level: number) => height - pad - Math.max(0, Math.min(1, level)) * (height - pad * 2);
  const sustainEnd = total - release;
  return `${x(0)},${y(0)} ${x(attack)},${y(1)} ${x(attack + decay)},${y(preset.sustain)} ${x(sustainEnd)},${y(preset.sustain)} ${x(total)},${y(0)}`;
}

export function SynthEnvelopeEditor({ preset, onChange }: SynthEnvelopeEditorProps) {
  return <div className="col-span-2 rounded border border-[#303650] bg-[#0b0c16] p-2" aria-label="Editor visual ADSR">
    <div className="mb-1 flex items-center justify-between"><span className="text-[10px] font-semibold text-slate-300">Envelope ADSR</span><span className="text-[10px] text-slate-500">ataque → decay → sustain → release</span></div>
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Envelope ADSR: ataque ${preset.attack.toFixed(2)} segundos, decay ${preset.decay.toFixed(2)} segundos, sustain ${Math.round(preset.sustain * 100)} por cento, release ${preset.release.toFixed(2)} segundos`} className="h-28 w-full overflow-visible">
      <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke="#334155" strokeWidth="1" />
      <line x1={pad} y1={pad} x2={pad} y2={height - pad} stroke="#334155" strokeWidth="1" />
      <polyline points={envelopePoints(preset)} fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx={pad} cy={height - pad} r="3" fill="#f59e0b" /><circle cx={width - pad} cy={height - pad} r="3" fill="#f59e0b" />
      <text x={pad + 3} y={pad + 9} fill="#94a3b8" fontSize="8">1.0</text><text x={pad + 3} y={height - pad - 3} fill="#94a3b8" fontSize="8">0</text>
    </svg>
    <div className="grid grid-cols-4 gap-2">
      <label className="text-[10px] text-slate-500">A<input aria-label="Envelope ataque" type="range" min="0.001" max="1" step="0.001" value={preset.attack} onChange={(event) => onChange("attack", Number(event.target.value))} className="mt-1 w-full" /></label>
      <label className="text-[10px] text-slate-500">D<input aria-label="Envelope decay" type="range" min="0.001" max="2" step="0.001" value={preset.decay} onChange={(event) => onChange("decay", Number(event.target.value))} className="mt-1 w-full" /></label>
      <label className="text-[10px] text-slate-500">S<input aria-label="Envelope sustain" type="range" min="0" max="1" step="0.01" value={preset.sustain} onChange={(event) => onChange("sustain", Number(event.target.value))} className="mt-1 w-full" /></label>
      <label className="text-[10px] text-slate-500">R<input aria-label="Envelope release" type="range" min="0.01" max="2" step="0.01" value={preset.release} onChange={(event) => onChange("release", Number(event.target.value))} className="mt-1 w-full" /></label>
    </div>
  </div>;
}
