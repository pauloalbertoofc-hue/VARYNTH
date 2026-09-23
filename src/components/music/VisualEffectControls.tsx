"use client";

import type { ParticleType, VisualMotionMode, VisualProfile } from "@/lib/music/visual-profile";
import { getVisualMotionMode } from "@/lib/music/visual-profile";

const motionOptions: Array<{ mode: VisualMotionMode; label: string }> = [
  { mode: "STATIC", label: "Estático" },
  { mode: "SMOOTH", label: "Suave" },
  { mode: "ANIMATED", label: "Animado" },
];

const effectLabels: Record<ParticleType, string> = {
  none: "Sem partículas",
  dust: "Poeira luminosa",
  rain: "Chuva",
  stars: "Estrelas",
  wave: "Ondas de luz",
};

export function VisualEffectControls({
  profile,
  onMotionChange,
  onEffectChange,
}: {
  profile: VisualProfile;
  onMotionChange: (mode: VisualMotionMode) => void;
  onEffectChange: (effect: ParticleType) => void;
}) {
  const selectedMotion = getVisualMotionMode(profile);
  return (
    <div data-motion-mode={selectedMotion} data-particle-effect={profile.particleType} className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
      <span>Movimento:</span>
      {motionOptions.map(({ mode, label }) => (
        <button
          key={mode}
          type="button"
          onClick={() => onMotionChange(mode)}
          aria-pressed={selectedMotion === mode}
          className={`rounded-full border px-3 py-1 ${selectedMotion === mode ? "border-violet-300 bg-violet-500/20 text-violet-100" : "border-white/10"}`}
        >
          {label}
        </button>
      ))}
      <label className="ml-1 flex items-center gap-2">
        Efeito do ambiente
        <select
          aria-label="Efeito do ambiente musical"
          value={profile.particleType}
          onChange={(event) => onEffectChange(event.target.value as ParticleType)}
          className="rounded-full border border-white/10 bg-[#101018] px-3 py-1 text-slate-200"
        >
          {(Object.keys(effectLabels) as ParticleType[]).map((effect) => (
            <option key={effect} value={effect}>{effectLabels[effect]}</option>
          ))}
        </select>
      </label>
    </div>
  );
}
