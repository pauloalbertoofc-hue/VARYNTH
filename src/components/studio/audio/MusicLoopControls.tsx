"use client";

import { MusicProjectState, beatsPerMeasure, setMusicLoopBars } from "@/lib/studio/audio/music-domain";

export function MusicLoopControls({ music, onChange }: { music: MusicProjectState; onChange: (music: MusicProjectState) => void }) {
  const measureBeats = beatsPerMeasure(music.timeSignature);
  const startBar = Math.floor((music.loopRegion?.startBeat ?? 0) / measureBeats) + 1;
  const endBar = Math.max(startBar + 1, Math.floor((music.loopRegion?.endBeat ?? measureBeats * 4) / measureBeats) + 1);
  const enabled = Boolean(music.loopRegion?.enabled);
  const update = (start: number, end: number, active = enabled) => onChange(setMusicLoopBars(music, start, end, active));

  return <div className="flex items-center gap-1 rounded-lg border border-[#232544] bg-[#141528] px-2 py-1" aria-label="Loop musical">
    <label className="flex items-center gap-1 text-[10px] text-slate-300"><input aria-label="Loop musical ativo" type="checkbox" checked={enabled} onChange={(event) => update(startBar, endBar, event.target.checked)} />Loop</label>
    <label className="flex items-center gap-1 text-[10px] text-slate-500">Comp.<input aria-label="Compasso inicial do loop" type="number" min={1} value={startBar} onChange={(event) => update(Number(event.target.value) || 1, endBar)} className="w-10 rounded bg-[#0b0c16] px-1 py-0.5 text-center text-white" /></label>
    <span className="text-slate-600">–</span>
    <label className="flex items-center gap-1 text-[10px] text-slate-500"><input aria-label="Compasso final do loop" type="number" min={startBar + 1} value={endBar} onChange={(event) => update(startBar, Number(event.target.value) || startBar + 1)} className="w-10 rounded bg-[#0b0c16] px-1 py-0.5 text-center text-white" /></label>
  </div>;
}
